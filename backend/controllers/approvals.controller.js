const pool = require('../config/db');

const getAll = async (req, res) => {
  try {
    const { status, request_type } = req.query;
    let query = `
      SELECT a.*,
             u1.username AS requested_by_user,
             u2.username AS approved_by_user
      FROM approval_requests a
      JOIN users u1 ON a.requested_by = u1.user_id
      LEFT JOIN users u2 ON a.approved_by = u2.user_id
      WHERE 1=1`;
    const params = [];
    if (status)       { params.push(status);       query += ` AND a.status = $${params.length}`; }
    if (request_type) { params.push(request_type); query += ` AND a.request_type = $${params.length}`; }
    query += ` ORDER BY a.requested_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const create = async (req, res) => {
  const { request_type, reference_id, remarks } = req.body;
  if (!request_type || !reference_id) {
    return res.status(400).json({ success: false, message: 'request_type and reference_id required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO approval_requests (request_type, reference_id, requested_by, remarks)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [request_type, reference_id, req.user.user_id, remarks]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const action = async (req, res) => {
  const { decision, remarks } = req.body; // decision: 'Approved' | 'Rejected'
  if (!['Approved','Rejected'].includes(decision)) {
    return res.status(400).json({ success: false, message: 'decision must be Approved or Rejected.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE approval_requests
       SET status = $1, approved_by = $2, actioned_at = NOW(), remarks = COALESCE($3, remarks)
       WHERE approval_id = $4 AND status = 'Pending'
       RETURNING *`,
      [decision, req.user.user_id, remarks, req.params.id]
    );
    if (result.rows.length === 0) throw new Error('Request not found or already actioned.');
    await client.query(
      `INSERT INTO audit_logs (user_id, action_type, table_name, record_id, new_value)
       VALUES ($1,'UPDATE','approval_requests',$2,$3)`,
      [req.user.user_id, req.params.id, `status=${decision}`]
    );
    await client.query('COMMIT');
    res.json({ success: true, message: `Request ${decision}.`, data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

module.exports = { getAll, create, action };
