const { pool, sql } = require('../config/db');

const getAll = async (req, res) => {
  try {
    const { user_id, action_type, table_name, from_date, to_date } = req.query;
    const request = pool.request();
    let where = 'WHERE 1=1';
    if (user_id)     { request.input('user_id',     sql.Int,      user_id);     where += ' AND al.user_id=@user_id'; }
    if (action_type) { request.input('action_type', sql.NVarChar, action_type); where += ' AND al.action_type=@action_type'; }
    if (table_name)  { request.input('table_name',  sql.NVarChar, table_name);  where += ' AND al.table_name=@table_name'; }
    if (from_date)   { request.input('from_date',   sql.DateTime2,from_date);   where += ' AND al.logged_at>=@from_date'; }
    if (to_date)     { request.input('to_date',     sql.DateTime2,to_date);     where += ' AND al.logged_at<=@to_date'; }
    const result = await request.query(`SELECT TOP 500 al.*,u.username FROM audit_logs al JOIN users u ON al.user_id=u.user_id ${where} ORDER BY al.logged_at DESC`);
    res.json({ success: true, count: result.recordset.length, data: result.recordset });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getSummary = async (req, res) => {
  try {
    const result = await pool.request().query('SELECT action_type,COUNT(*) AS count FROM audit_logs GROUP BY action_type ORDER BY count DESC');
    const recent = await pool.request().query('SELECT TOP 10 al.log_id,u.username,al.action_type,al.table_name,al.logged_at FROM audit_logs al JOIN users u ON al.user_id=u.user_id ORDER BY al.logged_at DESC');
    res.json({ success: true, data: { by_action: result.recordset, recent_activity: recent.recordset } });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { getAll, getSummary };
