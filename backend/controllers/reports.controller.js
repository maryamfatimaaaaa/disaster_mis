const { pool, sql } = require('../config/db');

// GET /api/reports
const getAll = async (req, res) => {
  try {
    const { status, severity_level, disaster_type, location } = req.query;
    const request = pool.request();
    let where = 'WHERE 1=1';

    if (status)         { request.input('status',         sql.NVarChar, status);          where += ' AND r.status = @status'; }
    if (severity_level) { request.input('severity_level', sql.NVarChar, severity_level);  where += ' AND r.severity_level = @severity_level'; }
    if (disaster_type)  { request.input('disaster_type',  sql.NVarChar, disaster_type);   where += ' AND r.disaster_type = @disaster_type'; }
    if (location)       { request.input('location',       sql.NVarChar, `%${location}%`); where += ' AND r.location LIKE @location'; }

    const result = await request.query(`
      SELECT r.report_id, r.location, r.disaster_type, r.severity_level,
             r.description, r.status, r.reported_at, r.updated_at,
             u.username AS reported_by
      FROM emergency_reports r
      JOIN users u ON r.user_id = u.user_id
      ${where}
      ORDER BY
        CASE r.severity_level
          WHEN 'Critical' THEN 1 WHEN 'High'   THEN 2
          WHEN 'Medium'   THEN 3 WHEN 'Low'    THEN 4
        END, r.reported_at DESC
    `);
    res.json({ success: true, count: result.recordset.length, data: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/reports/:id
const getById = async (req, res) => {
  try {
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT r.*, u.username AS reported_by
              FROM emergency_reports r
              JOIN users u ON r.user_id = u.user_id
              WHERE r.report_id = @id`);
    if (result.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Report not found.' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/reports
const create = async (req, res) => {
  const { location, disaster_type, severity_level, description } = req.body;
  if (!location || !disaster_type || !severity_level)
    return res.status(400).json({ success: false, message: 'location, disaster_type, severity_level required.' });
  try {
    const result = await pool.request()
      .input('user_id',       sql.Int,      req.user.user_id)
      .input('location',      sql.NVarChar, location)
      .input('disaster_type', sql.NVarChar, disaster_type)
      .input('severity_level',sql.NVarChar, severity_level)
      .input('description',   sql.NVarChar, description)
      .query(`INSERT INTO emergency_reports (user_id, location, disaster_type, severity_level, description)
              OUTPUT INSERTED.*
              VALUES (@user_id, @location, @disaster_type, @severity_level, @description)`);
    res.status(201).json({ success: true, message: 'Report created.', data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/reports/:id
const update = async (req, res) => {
  const { status, description, severity_level } = req.body;
  try {
    const result = await pool.request()
      .input('id',            sql.Int,      req.params.id)
      .input('status',        sql.NVarChar, status)
      .input('description',   sql.NVarChar, description)
      .input('severity_level',sql.NVarChar, severity_level)
      .input('user_id',       sql.Int,      req.user.user_id)
      .query(`UPDATE emergency_reports
              SET status         = ISNULL(@status, status),
                  description    = ISNULL(@description, description),
                  severity_level = ISNULL(@severity_level, severity_level)
              WHERE report_id = @id;
              SELECT * FROM emergency_reports WHERE report_id = @id;`);
    if (result.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'Report not found.' });

    await pool.request()
      .input('user_id',   sql.Int,      req.user.user_id)
      .input('record_id', sql.Int,      req.params.id)
      .input('new_value', sql.NVarChar, `status=${status}`)
      .query(`INSERT INTO audit_logs (user_id, action_type, table_name, record_id, new_value)
              VALUES (@user_id, 'UPDATE', 'emergency_reports', @record_id, @new_value)`);

    res.json({ success: true, message: 'Report updated.', data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reports/stats/summary
const getSummary = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT
        COUNT(*)                                                           AS total_reports,
        SUM(CASE WHEN status = 'Open'       THEN 1 ELSE 0 END)           AS open_reports,
        SUM(CASE WHEN status = 'InProgress' THEN 1 ELSE 0 END)           AS inprogress_reports,
        SUM(CASE WHEN status = 'Resolved'   THEN 1 ELSE 0 END)           AS resolved_reports,
        SUM(CASE WHEN severity_level = 'Critical' THEN 1 ELSE 0 END)     AS critical_reports,
        SUM(CASE WHEN severity_level = 'High'     THEN 1 ELSE 0 END)     AS high_reports
      FROM emergency_reports
    `);
    const byType = await pool.request().query(`
      SELECT disaster_type, COUNT(*) AS count
      FROM emergency_reports
      GROUP BY disaster_type ORDER BY count DESC
    `);
    res.json({ success: true, data: { summary: result.recordset[0], by_disaster_type: byType.recordset } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getAll, getById, create, update, getSummary };
