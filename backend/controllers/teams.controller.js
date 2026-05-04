const { pool, sql } = require('../config/db');

const getAll = async (req, res) => {
  try {
    const { availability_status, team_type } = req.query;
    const request = pool.request();
    let where = 'WHERE 1=1';
    if (availability_status) { request.input('availability_status', sql.NVarChar, availability_status); where += ' AND availability_status = @availability_status'; }
    if (team_type)            { request.input('team_type', sql.NVarChar, team_type); where += ' AND team_type = @team_type'; }
    const result = await request.query(`SELECT * FROM rescue_teams ${where} ORDER BY availability_status, team_type`);
    res.json({ success: true, count: result.recordset.length, data: result.recordset });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getById = async (req, res) => {
  try {
    const result = await pool.request().input('id', sql.Int, req.params.id)
      .query('SELECT * FROM rescue_teams WHERE team_id = @id');
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Team not found.' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const create = async (req, res) => {
  const { team_name, team_type, current_location, capacity } = req.body;
  if (!team_name || !team_type || !capacity) return res.status(400).json({ success: false, message: 'team_name, team_type, capacity required.' });
  try {
    const result = await pool.request()
      .input('team_name', sql.NVarChar, team_name).input('team_type', sql.NVarChar, team_type)
      .input('current_location', sql.NVarChar, current_location).input('capacity', sql.Int, capacity)
      .query('INSERT INTO rescue_teams (team_name,team_type,current_location,capacity) OUTPUT INSERTED.* VALUES (@team_name,@team_type,@current_location,@capacity)');
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const update = async (req, res) => {
  const { availability_status, current_location, capacity } = req.body;
  try {
    await pool.request().input('id', sql.Int, req.params.id)
      .input('availability_status', sql.NVarChar, availability_status)
      .input('current_location', sql.NVarChar, current_location).input('capacity', sql.Int, capacity)
      .query('UPDATE rescue_teams SET availability_status=ISNULL(@availability_status,availability_status),current_location=ISNULL(@current_location,current_location),capacity=ISNULL(@capacity,capacity),last_updated=GETDATE() WHERE team_id=@id');
    const result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM rescue_teams WHERE team_id=@id');
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Team not found.' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const getAssignments = async (req, res) => {
  try {
    const result = await pool.request().input('id', sql.Int, req.params.id)
      .query('SELECT ta.*,er.location,er.disaster_type,er.severity_level,u.username AS assigned_by_user FROM team_assignments ta JOIN emergency_reports er ON ta.report_id=er.report_id JOIN users u ON ta.assigned_by=u.user_id WHERE ta.team_id=@id ORDER BY ta.assigned_at DESC');
    res.json({ success: true, data: result.recordset });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const assign = async (req, res) => {
  const { report_id, team_id } = req.body;
  if (!report_id || !team_id) return res.status(400).json({ success: false, message: 'report_id and team_id required.' });
  try {
    const teamCheck = await pool.request().input('team_id', sql.Int, team_id).query('SELECT availability_status FROM rescue_teams WHERE team_id=@team_id');
    if (teamCheck.recordset.length === 0) throw new Error('Team not found.');
    if (teamCheck.recordset[0].availability_status !== 'Available') throw new Error(`Team is currently ${teamCheck.recordset[0].availability_status}.`);
    const result = await pool.request().input('report_id', sql.Int, report_id).input('team_id', sql.Int, team_id).input('assigned_by', sql.Int, req.user.user_id)
      .query('INSERT INTO team_assignments (report_id,team_id,assigned_by) OUTPUT INSERTED.* VALUES (@report_id,@team_id,@assigned_by)');
    res.status(201).json({ success: true, message: 'Team assigned.', data: result.recordset[0] });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const completeAssignment = async (req, res) => {
  try {
    await pool.request().input('id', sql.Int, req.params.id).query("UPDATE team_assignments SET status='Completed',completed_at=GETDATE() WHERE assignment_id=@id");
    const result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM team_assignments WHERE assignment_id=@id');
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    res.json({ success: true, message: 'Assignment completed.', data: result.recordset[0] });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

module.exports = { getAll, getById, create, update, getAssignments, assign, completeAssignment };
