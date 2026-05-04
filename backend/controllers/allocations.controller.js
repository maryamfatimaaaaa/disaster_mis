const { pool, sql } = require('../config/db');

const getAll = async (req, res) => {
  try {
    const { status, report_id } = req.query;
    const request = pool.request();
    let where = 'WHERE 1=1';
    if (status)    { request.input('status',    sql.NVarChar, status);    where += ' AND ra.status=@status'; }
    if (report_id) { request.input('report_id', sql.Int,      report_id); where += ' AND ra.report_id=@report_id'; }
    const result = await request.query(`SELECT ra.*,rs.resource_name,rs.resource_type,rs.unit,er.location,er.disaster_type,u1.username AS requested_by_user,u2.username AS approved_by_user FROM resource_allocations ra JOIN resources rs ON ra.resource_id=rs.resource_id JOIN emergency_reports er ON ra.report_id=er.report_id JOIN users u1 ON ra.requested_by=u1.user_id LEFT JOIN users u2 ON ra.approved_by=u2.user_id ${where} ORDER BY ra.requested_at DESC`);
    res.json({ success: true, count: result.recordset.length, data: result.recordset });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const request_alloc = async (req, res) => {
  const { resource_id, report_id, quantity_requested } = req.body;
  if (!resource_id || !report_id || !quantity_requested) return res.status(400).json({ success: false, message: 'resource_id, report_id, quantity_requested required.' });
  try {
    const result = await pool.request()
      .input('resource_id', sql.Int, resource_id).input('report_id', sql.Int, report_id)
      .input('quantity_requested', sql.Int, quantity_requested).input('requested_by', sql.Int, req.user.user_id)
      .query('INSERT INTO resource_allocations (resource_id,report_id,quantity_requested,requested_by) OUTPUT INSERTED.* VALUES (@resource_id,@report_id,@quantity_requested,@requested_by)');
    res.status(201).json({ success: true, message: 'Allocation requested.', data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const approve = async (req, res) => {
  const { quantity_approved } = req.body;
  if (!quantity_approved) return res.status(400).json({ success: false, message: 'quantity_approved required.' });
  try {
    const alloc = await pool.request().input('id', sql.Int, req.params.id)
      .query('SELECT ra.resource_id,rs.quantity_available FROM resource_allocations ra JOIN resources rs ON ra.resource_id=rs.resource_id WHERE ra.allocation_id=@id');
    if (alloc.recordset.length === 0) throw new Error('Allocation not found.');
    if (alloc.recordset[0].quantity_available < quantity_approved) throw new Error(`Insufficient stock. Available: ${alloc.recordset[0].quantity_available}`);

    await pool.request().input('id', sql.Int, req.params.id)
      .input('quantity_approved', sql.Int, quantity_approved).input('approved_by', sql.Int, req.user.user_id)
      .query("UPDATE resource_allocations SET status='Approved',quantity_approved=@quantity_approved,approved_by=@approved_by,approved_at=GETDATE() WHERE allocation_id=@id AND status='Pending'");

    await pool.request().input('user_id', sql.Int, req.user.user_id).input('record_id', sql.Int, req.params.id)
      .input('new_value', sql.NVarChar, `status=Approved,qty=${quantity_approved}`)
      .query("INSERT INTO audit_logs (user_id,action_type,table_name,record_id,new_value) VALUES (@user_id,'UPDATE','resource_allocations',@record_id,@new_value)");

    const result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM resource_allocations WHERE allocation_id=@id');
    res.json({ success: true, message: 'Allocation approved. Stock deducted.', data: result.recordset[0] });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const reject = async (req, res) => {
  try {
    await pool.request().input('id', sql.Int, req.params.id).input('approved_by', sql.Int, req.user.user_id)
      .query("UPDATE resource_allocations SET status='Rejected',approved_by=@approved_by,approved_at=GETDATE() WHERE allocation_id=@id AND status='Pending'");
    const result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM resource_allocations WHERE allocation_id=@id');
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Allocation not found.' });
    res.json({ success: true, message: 'Allocation rejected.', data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

module.exports = { getAll, request: request_alloc, approve, reject };
