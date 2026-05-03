const pool = require('../config/db');

// ── GET /api/teams ─────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { availability_status, team_type } = req.query;
    let query = `SELECT * FROM rescue_teams WHERE 1=1`;
    const params = [];

    if (availability_status) { params.push(availability_status); query += ` AND availability_status = $${params.length}`; }
    if (team_type)            { params.push(team_type);           query += ` AND team_type = $${params.length}`; }

    query += ` ORDER BY availability_status, team_type`;
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('getAll teams error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/teams/:id ─────────────────────────────────────
const getById = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM rescue_teams WHERE team_id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Team not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── POST /api/teams ────────────────────────────────────────
const create = async (req, res) => {
  const { team_name, team_type, current_location, capacity } = req.body;
  if (!team_name || !team_type || !capacity) {
    return res.status(400).json({ success: false, message: 'team_name, team_type, capacity are required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO rescue_teams (team_name, team_type, current_location, capacity)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [team_name, team_type, current_location, capacity]
    );
    res.status(201).json({ success: true, message: 'Team created.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/teams/:id ─────────────────────────────────────
const update = async (req, res) => {
  const { availability_status, current_location, capacity } = req.body;
  try {
    const result = await pool.query(
      `UPDATE rescue_teams
       SET availability_status = COALESCE($1, availability_status),
           current_location    = COALESCE($2, current_location),
           capacity            = COALESCE($3, capacity),
           last_updated        = NOW()
       WHERE team_id = $4 RETURNING *`,
      [availability_status, current_location, capacity, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Team not found.' });
    res.json({ success: true, message: 'Team updated.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/teams/:id/assignments ────────────────────────
const getAssignments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ta.*, er.location, er.disaster_type, er.severity_level,
              u.username AS assigned_by_user
       FROM team_assignments ta
       JOIN emergency_reports er ON ta.report_id = er.report_id
       JOIN users u ON ta.assigned_by = u.user_id
       WHERE ta.team_id = $1
       ORDER BY ta.assigned_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── POST /api/teams/assign ─────────────────────────────────
const assign = async (req, res) => {
  const { report_id, team_id } = req.body;
  if (!report_id || !team_id) {
    return res.status(400).json({ success: false, message: 'report_id and team_id are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check team is available
    const teamCheck = await client.query(
      `SELECT availability_status FROM rescue_teams WHERE team_id = $1 FOR UPDATE`, [team_id]
    );
    if (teamCheck.rows.length === 0) throw new Error('Team not found.');
    if (teamCheck.rows[0].availability_status !== 'Available') {
      throw new Error(`Team is currently ${teamCheck.rows[0].availability_status}.`);
    }

    // Insert assignment (trigger updates team status automatically)
    const result = await client.query(
      `INSERT INTO team_assignments (report_id, team_id, assigned_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [report_id, team_id, req.user.user_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Team assigned successfully.', data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// ── PUT /api/teams/assignments/:id/complete ────────────────
const completeAssignment = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE team_assignments
       SET status = 'Completed', completed_at = NOW()
       WHERE assignment_id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) throw new Error('Assignment not found.');
    // Trigger trg_update_team_status fires and sets team back to Available
    await client.query('COMMIT');
    res.json({ success: true, message: 'Assignment completed. Team is now available.', data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

module.exports = { getAll, getById, create, update, getAssignments, assign, completeAssignment };
