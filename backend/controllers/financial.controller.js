const { pool, sql } = require('../config/db');

const getDonations = async (req, res) => {
  try {
    const { report_id, donor_type } = req.query;
    const request = pool.request();
    let where = 'WHERE 1=1';
    if (report_id)  { request.input('report_id',  sql.Int,      report_id);  where += ' AND d.report_id=@report_id'; }
    if (donor_type) { request.input('donor_type', sql.NVarChar, donor_type); where += ' AND d.donor_type=@donor_type'; }
    const result = await request.query(`SELECT d.*,u.username AS recorded_by_user,er.location,er.disaster_type FROM donations d JOIN users u ON d.recorded_by=u.user_id LEFT JOIN emergency_reports er ON d.report_id=er.report_id ${where} ORDER BY d.donated_at DESC`);
    res.json({ success: true, count: result.recordset.length, data: result.recordset });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const createDonation = async (req, res) => {
  const { donor_name, donor_type, amount, report_id, payment_method } = req.body;
  if (!donor_name || !donor_type || !amount) return res.status(400).json({ success: false, message: 'donor_name, donor_type, amount required.' });
  try {
    const result = await pool.request()
      .input('donor_name', sql.NVarChar, donor_name).input('donor_type', sql.NVarChar, donor_type)
      .input('amount', sql.Decimal, amount).input('report_id', sql.Int, report_id || null)
      .input('recorded_by', sql.Int, req.user.user_id).input('payment_method', sql.NVarChar, payment_method)
      .query('INSERT INTO donations (donor_name,donor_type,amount,report_id,recorded_by,payment_method) OUTPUT INSERTED.* VALUES (@donor_name,@donor_type,@amount,@report_id,@recorded_by,@payment_method)');
    res.status(201).json({ success: true, message: 'Donation recorded.', data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const getExpenses = async (req, res) => {
  try {
    const { status, report_id } = req.query;
    const request = pool.request();
    let where = 'WHERE 1=1';
    if (status)    { request.input('status',    sql.NVarChar, status);    where += ' AND e.status=@status'; }
    if (report_id) { request.input('report_id', sql.Int,      report_id); where += ' AND e.report_id=@report_id'; }
    const result = await request.query(`SELECT e.*,u1.username AS recorded_by_user,u2.username AS approved_by_user,er.location,er.disaster_type FROM expenses e JOIN users u1 ON e.recorded_by=u1.user_id LEFT JOIN users u2 ON e.approved_by=u2.user_id LEFT JOIN emergency_reports er ON e.report_id=er.report_id ${where} ORDER BY e.expense_date DESC`);
    res.json({ success: true, count: result.recordset.length, data: result.recordset });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const createExpense = async (req, res) => {
  const { expense_category, amount, description, report_id, expense_date } = req.body;
  if (!expense_category || !amount || !expense_date) return res.status(400).json({ success: false, message: 'expense_category, amount, expense_date required.' });
  try {
    const result = await pool.request()
      .input('expense_category', sql.NVarChar, expense_category).input('amount', sql.Decimal, amount)
      .input('description', sql.NVarChar, description).input('report_id', sql.Int, report_id || null)
      .input('recorded_by', sql.Int, req.user.user_id).input('expense_date', sql.Date, expense_date)
      .query('INSERT INTO expenses (expense_category,amount,description,report_id,recorded_by,expense_date) OUTPUT INSERTED.* VALUES (@expense_category,@amount,@description,@report_id,@recorded_by,@expense_date)');
    res.status(201).json({ success: true, message: 'Expense recorded.', data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const approveExpense = async (req, res) => {
  try {
    await pool.request().input('id', sql.Int, req.params.id).input('approved_by', sql.Int, req.user.user_id)
      .query("UPDATE expenses SET status='Approved',approved_by=@approved_by WHERE expense_id=@id AND status='Pending'");
    await pool.request().input('user_id', sql.Int, req.user.user_id).input('record_id', sql.Int, req.params.id)
      .query("INSERT INTO audit_logs (user_id,action_type,table_name,record_id,new_value) VALUES (@user_id,'UPDATE','expenses',@record_id,'status=Approved')");
    const result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM expenses WHERE expense_id=@id');
    res.json({ success: true, message: 'Expense approved.', data: result.recordset[0] });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const getFinancialSummary = async (req, res) => {
  try {
    const summary = await pool.request().query("SELECT ISNULL(SUM(d.amount),0) AS total_donations,(SELECT ISNULL(SUM(amount),0) FROM expenses WHERE status='Approved') AS total_expenses,ISNULL(SUM(d.amount),0)-(SELECT ISNULL(SUM(amount),0) FROM expenses WHERE status='Approved') AS net_balance,COUNT(DISTINCT d.donation_id) AS donation_count FROM donations d");
    const byType  = await pool.request().query('SELECT donor_type,SUM(amount) AS total FROM donations GROUP BY donor_type ORDER BY total DESC');
    const byDisaster = await pool.request().query("SELECT er.disaster_type,ISNULL(SUM(DISTINCT d.amount),0) AS donations,ISNULL(SUM(DISTINCT e.amount),0) AS expenses FROM emergency_reports er LEFT JOIN donations d ON er.report_id=d.report_id LEFT JOIN expenses e ON er.report_id=e.report_id AND e.status='Approved' GROUP BY er.disaster_type ORDER BY er.disaster_type");
    res.json({ success: true, data: { overall: summary.recordset[0], by_donor_type: byType.recordset, by_disaster_type: byDisaster.recordset } });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { getDonations, createDonation, getExpenses, createExpense, approveExpense, getFinancialSummary };
