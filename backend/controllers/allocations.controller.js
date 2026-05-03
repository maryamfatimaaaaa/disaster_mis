const pool = require('../config/db');

// GET /api/allocations
const getAll = async (req, res) => {
  try {
    const { status, report_id } = req.query;
    let query = `
      SELECT ra.*, rs.resource_name, rs.resource_type, rs.unit,
             er.location, er.disaster_type,
             u1.username AS requested_by_user,
             u2.username AS approved_by_user
      FROM resource_allocations ra
      JOIN resources rs       ON ra.resource_id   = rs.resource_id
      JOIN emergency_reports er ON ra.report_id   = er.report_id
      JOIN users u1           ON ra.requested_by  = u1.user_id
      LEFT JOIN users u2      ON ra.approved_by   = u2.user_id
      WHERE 1=1`;
    const params = [];
    if (status)    { params.push(status);    query += ` AND ra.status = $${params.length}`; }
    if (report_id) { params.push(report_id); query += ` AND ra.report_id = $${params.length}`; }
    query += ` ORDER BY ra.requested_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/allocations — request allocation
const request = async (req, res) => {
  const { resource_id, report_id, quantity_requested } = req.body;
  if (!resource_id || !report_id || !quantity_requested) {
    return res.status(400).json({ success: false, message: 'resource_id, report_id, quantity_requested required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO resource_allocations (resource_id, report_id, quantity_requested, requested_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [resource_id, report_id, quantity_requested, req.user.user_id]
    );
    res.status(201).json({ success: true, message: 'Allocation requested.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/allocations/:id/approve — approve and trigger stock deduction
const approve = async (req, res) => {
  const { quantity_approved } = req.body;
  if (!quantity_approved) {
    return res.status(400).json({ success: false, message: 'quantity_approved required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check stock availability
    const alloc = await client.query(
      `SELECT ra.resource_id, rs.quantity_available
       FROM resource_allocations ra
       JOIN resources rs ON ra.resource_id = rs.resource_id
       WHERE ra.allocation_id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (alloc.rows.length === 0) throw new Error('Allocation not found.');
    if (alloc.rows[0].quantity_available < quantity_approved) {
      throw new Error(`Insufficient stock. Available: ${alloc.rows[0].quantity_available}`);
    }

    // Approve — trigger trg_deduct_resource_stock fires automatically
    const result = await client.query(
      `UPDATE resource_allocations
       SET status = 'Approved', quantity_approved = $1,
           approved_by = $2, approved_at = NOW()
       WHERE allocation_id = $3 AND status = 'Pending'
       RETURNING *`,
      [quantity_approved, req.user.user_id, req.params.id]
    );
    if (result.rows.length === 0) throw new Error('Allocation not found or already processed.');

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action_type, table_name, record_id, new_value)
       VALUES ($1, 'UPDATE', 'resource_allocations', $2, $3)`,
      [req.user.user_id, req.params.id, `status=Approved,qty=${quantity_approved}`]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Allocation approved. Stock deducted.', data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// PUT /api/allocations/:id/reject
const reject = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE resource_allocations
       SET status = 'Rejected', approved_by = $1, approved_at = NOW()
       WHERE allocation_id = $2 AND status = 'Pending'
       RETURNING *`,
      [req.user.user_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Allocation not found or already processed.' });
    res.json({ success: true, message: 'Allocation rejected.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, request, approve, reject };
