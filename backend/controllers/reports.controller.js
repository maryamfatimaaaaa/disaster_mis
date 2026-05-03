const pool = require('../config/db');

// ── GET /api/reports ───────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { status, severity_level, disaster_type, location } = req.query;
    let query = `
      SELECT r.report_id, r.location, r.disaster_type, r.severity_level,
             r.description, r.status, r.reported_at, r.updated_at,
             u.username AS reported_by
      FROM emergency_reports r
      JOIN users u ON r.user_id = u.user_id
      WHERE 1=1`;
    const params = [];

    if (status)         { params.push(status);         query += ` AND r.status = $${params.length}`; }
    if (severity_level) { params.push(severity_level); query += ` AND r.severity_level = $${params.length}`; }
    if (disaster_type)  { params.push(disaster_type);  query += ` AND r.disaster_type = $${params.length}`; }
    if (location)       { params.push(`%${location}%`);query += ` AND r.location ILIKE $${params.length}`; }

    query += ` ORDER BY
      CASE r.severity_level
        WHEN 'Critical' THEN 1 WHEN 'High' THEN 2
        WHEN 'Medium'   THEN 3 WHEN 'Low'  THEN 4
      END, r.reported_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('getAll reports error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/reports/:id ───────────────────────────────────
const getById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.username AS reported_by
       FROM emergency_reports r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.report_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('getById report error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── POST /api/reports ──────────────────────────────────────
const create = async (req, res) => {
  const { location, disaster_type, severity_level, description } = req.body;

  if (!location || !disaster_type || !severity_level) {
    return res.status(400).json({ success: false, message: 'location, disaster_type, and severity_level are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO emergency_reports (user_id, location, disaster_type, severity_level, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.user_id, location, disaster_type, severity_level, description]
    );
    // Trigger trg_log_emergency_report fires automatically
    res.status(201).json({ success: true, message: 'Report created.', data: result.rows[0] });
  } catch (err) {
    console.error('create report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/reports/:id ───────────────────────────────────
const update = async (req, res) => {
  const { status, description, severity_level } = req.body;
  try {
    const result = await pool.query(
      `UPDATE emergency_reports
       SET status = COALESCE($1, status),
           description = COALESCE($2, description),
           severity_level = COALESCE($3, severity_level)
       WHERE report_id = $4
       RETURNING *`,
      [status, description, severity_level, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    // Log update
    await pool.query(
      `INSERT INTO audit_logs (user_id, action_type, table_name, record_id, new_value)
       VALUES ($1, 'UPDATE', 'emergency_reports', $2, $3)`,
      [req.user.user_id, req.params.id, `status=${status}`]
    );
    res.json({ success: true, message: 'Report updated.', data: result.rows[0] });
  } catch (err) {
    console.error('update report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/reports/stats/summary ────────────────────────
const getSummary = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*)                                                 AS total_reports,
         COUNT(*) FILTER (WHERE status = 'Open')                 AS open_reports,
         COUNT(*) FILTER (WHERE status = 'InProgress')           AS inprogress_reports,
         COUNT(*) FILTER (WHERE status = 'Resolved')             AS resolved_reports,
         COUNT(*) FILTER (WHERE severity_level = 'Critical')     AS critical_reports,
         COUNT(*) FILTER (WHERE severity_level = 'High')         AS high_reports
       FROM emergency_reports`
    );

    const byType = await pool.query(
      `SELECT disaster_type, COUNT(*) AS count
       FROM emergency_reports
       GROUP BY disaster_type
       ORDER BY count DESC`
    );

    res.json({
      success: true,
      data: {
        summary: result.rows[0],
        by_disaster_type: byType.rows
      }
    });
  } catch (err) {
    console.error('getSummary error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getAll, getById, create, update, getSummary };
