const pool = require('../config/db');

// ════ DONATIONS ═══════════════════════════════════════════

const getDonations = async (req, res) => {
  try {
    const { report_id, donor_type } = req.query;
    let query = `
      SELECT d.*, u.username AS recorded_by_user,
             er.location, er.disaster_type
      FROM donations d
      JOIN users u ON d.recorded_by = u.user_id
      LEFT JOIN emergency_reports er ON d.report_id = er.report_id
      WHERE 1=1`;
    const params = [];
    if (report_id)  { params.push(report_id);  query += ` AND d.report_id = $${params.length}`; }
    if (donor_type) { params.push(donor_type); query += ` AND d.donor_type = $${params.length}`; }
    query += ` ORDER BY d.donated_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const createDonation = async (req, res) => {
  const { donor_name, donor_type, amount, report_id, payment_method } = req.body;
  if (!donor_name || !donor_type || !amount) {
    return res.status(400).json({ success: false, message: 'donor_name, donor_type, amount required.' });
  }
  try {
    // Trigger trg_log_donation fires automatically
    const result = await pool.query(
      `INSERT INTO donations (donor_name, donor_type, amount, report_id, recorded_by, payment_method)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [donor_name, donor_type, amount, report_id || null, req.user.user_id, payment_method]
    );
    res.status(201).json({ success: true, message: 'Donation recorded.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ════ EXPENSES ════════════════════════════════════════════

const getExpenses = async (req, res) => {
  try {
    const { status, report_id } = req.query;
    let query = `
      SELECT e.*,
             u1.username AS recorded_by_user,
             u2.username AS approved_by_user,
             er.location, er.disaster_type
      FROM expenses e
      JOIN users u1 ON e.recorded_by = u1.user_id
      LEFT JOIN users u2 ON e.approved_by = u2.user_id
      LEFT JOIN emergency_reports er ON e.report_id = er.report_id
      WHERE 1=1`;
    const params = [];
    if (status)    { params.push(status);    query += ` AND e.status = $${params.length}`; }
    if (report_id) { params.push(report_id); query += ` AND e.report_id = $${params.length}`; }
    query += ` ORDER BY e.expense_date DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const createExpense = async (req, res) => {
  const { expense_category, amount, description, report_id, expense_date } = req.body;
  if (!expense_category || !amount || !expense_date) {
    return res.status(400).json({ success: false, message: 'expense_category, amount, expense_date required.' });
  }
  try {
    // Trigger trg_log_expense fires automatically
    const result = await pool.query(
      `INSERT INTO expenses (expense_category, amount, description, report_id, recorded_by, expense_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [expense_category, amount, description, report_id || null, req.user.user_id, expense_date]
    );
    res.status(201).json({ success: true, message: 'Expense recorded.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const approveExpense = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE expenses SET status = 'Approved', approved_by = $1
       WHERE expense_id = $2 AND status = 'Pending' RETURNING *`,
      [req.user.user_id, req.params.id]
    );
    if (result.rows.length === 0) throw new Error('Expense not found or already processed.');
    await client.query(
      `INSERT INTO audit_logs (user_id, action_type, table_name, record_id, new_value)
       VALUES ($1,'UPDATE','expenses',$2,'status=Approved')`,
      [req.user.user_id, req.params.id]
    );
    await client.query('COMMIT');
    res.json({ success: true, message: 'Expense approved.', data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// GET /api/financial/summary
const getFinancialSummary = async (req, res) => {
  try {
    const summary = await pool.query(
      `SELECT
         COALESCE(SUM(d.amount),0) AS total_donations,
         COALESCE((SELECT SUM(amount) FROM expenses WHERE status='Approved'),0) AS total_expenses,
         COALESCE(SUM(d.amount),0) -
         COALESCE((SELECT SUM(amount) FROM expenses WHERE status='Approved'),0) AS net_balance,
         COUNT(DISTINCT d.donation_id) AS donation_count
       FROM donations d`
    );
    const byType = await pool.query(
      `SELECT donor_type, SUM(amount) AS total FROM donations GROUP BY donor_type ORDER BY total DESC`
    );
    const byDisaster = await pool.query(
      `SELECT er.disaster_type,
              COALESCE(SUM(DISTINCT d.amount),0) AS donations,
              COALESCE(SUM(DISTINCT e.amount),0)  AS expenses
       FROM emergency_reports er
       LEFT JOIN donations d ON er.report_id = d.report_id
       LEFT JOIN expenses e  ON er.report_id = e.report_id AND e.status='Approved'
       GROUP BY er.disaster_type ORDER BY er.disaster_type`
    );
    res.json({
      success: true,
      data: {
        overall: summary.rows[0],
        by_donor_type: byType.rows,
        by_disaster_type: byDisaster.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getDonations, createDonation, getExpenses, createExpense, approveExpense, getFinancialSummary };
