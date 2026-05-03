const pool = require('../config/db');

const getAll = async (req, res) => {
  try {
    const { user_id, action_type, table_name, from_date, to_date } = req.query;
    let query = `
      SELECT al.*, u.username
      FROM audit_logs al
      JOIN users u ON al.user_id = u.user_id
      WHERE 1=1`;
    const params = [];
    if (user_id)     { params.push(user_id);     query += ` AND al.user_id = $${params.length}`; }
    if (action_type) { params.push(action_type); query += ` AND al.action_type = $${params.length}`; }
    if (table_name)  { params.push(table_name);  query += ` AND al.table_name = $${params.length}`; }
    if (from_date)   { params.push(from_date);   query += ` AND al.logged_at >= $${params.length}`; }
    if (to_date)     { params.push(to_date);      query += ` AND al.logged_at <= $${params.length}`; }
    query += ` ORDER BY al.logged_at DESC LIMIT 500`;
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getSummary = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT action_type, COUNT(*) AS count
       FROM audit_logs GROUP BY action_type ORDER BY count DESC`
    );
    const recent = await pool.query(
      `SELECT al.log_id, u.username, al.action_type, al.table_name, al.logged_at
       FROM audit_logs al JOIN users u ON al.user_id = u.user_id
       ORDER BY al.logged_at DESC LIMIT 10`
    );
    res.json({ success: true, data: { by_action: result.rows, recent_activity: recent.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getAll, getSummary };
