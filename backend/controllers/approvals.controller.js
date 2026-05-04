const { pool, sql } = require('../config/db');

const getAll = async (req, res) => {
  try {
    const { status, request_type } = req.query;
    const request = pool.request();
    let where = 'WHERE 1=1';
    if (status)       { request.input('status',       sql.NVarChar, status);       where += ' AND a.status=@status'; }
    if (request_type) { request.input('request_type', sql.NVarChar, request_type); where += ' AND a.request_type=@request_type'; }
    const result = await request.query(`SELECT a.*,u1.username AS requested_by_user,u2.username AS approved_by_user FROM approval_requests a JOIN users u1 ON a.requested_by=u1.user_id LEFT JOIN users u2 ON a.approved_by=u2.user_id ${where} ORDER BY a.requested_at DESC`);
    res.json({ success: true, count: result.recordset.length, data: result.recordset });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const create = async (req, res) => {
  const { request_type, reference_id, remarks } = req.body;
  if (!request_type || !reference_id) return res.status(400).json({ success: false, message: 'request_type and reference_id required.' });
  try {
    const result = await pool.request()
      .input('request_type', sql.NVarChar, request_type).input('reference_id', sql.Int, reference_id)
      .input('requested_by', sql.Int, req.user.user_id).input('remarks', sql.NVarChar, remarks)
      .query('INSERT INTO approval_requests (request_type,reference_id,requested_by,remarks) OUTPUT INSERTED.* VALUES (@request_type,@reference_id,@requested_by,@remarks)');
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const action = async (req, res) => {
  const { decision, remarks } = req.body;
  if (!['Approved','Rejected'].includes(decision)) return res.status(400).json({ success: false, message: 'decision must be Approved or Rejected.' });
  try {
    await pool.request().input('id', sql.Int, req.params.id).input('decision', sql.NVarChar, decision)
      .input('approved_by', sql.Int, req.user.user_id).input('remarks', sql.NVarChar, remarks)
      .query("UPDATE approval_requests SET status=@decision,approved_by=@approved_by,actioned_at=GETDATE(),remarks=ISNULL(@remarks,remarks) WHERE approval_id=@id AND status='Pending'");
    await pool.request().input('user_id', sql.Int, req.user.user_id).input('record_id', sql.Int, req.params.id)
      .input('new_value', sql.NVarChar, `status=${decision}`)
      .query("INSERT INTO audit_logs (user_id,action_type,table_name,record_id,new_value) VALUES (@user_id,'UPDATE','approval_requests',@record_id,@new_value)");
    const result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM approval_requests WHERE approval_id=@id');
    res.json({ success: true, message: `Request ${decision}.`, data: result.recordset[0] });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

module.exports = { getAll, create, action };
