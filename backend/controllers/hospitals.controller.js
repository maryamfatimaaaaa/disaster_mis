const { pool, sql } = require('../config/db');

const getHospitals = async (req, res) => {
  try {
    const result = await pool.request().query('SELECT *,CAST(ROUND(CAST(available_beds AS FLOAT)/total_beds*100,1) AS DECIMAL(5,1)) AS availability_pct FROM hospitals WHERE is_active=1 ORDER BY available_beds DESC');
    res.json({ success: true, data: result.recordset });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getHospitalById = async (req, res) => {
  try {
    const result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM hospitals WHERE hospital_id=@id');
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Hospital not found.' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const createHospital = async (req, res) => {
  const { hospital_name, location, total_beds, available_beds, contact_number } = req.body;
  if (!hospital_name || !location || !total_beds) return res.status(400).json({ success: false, message: 'hospital_name, location, total_beds required.' });
  try {
    const result = await pool.request()
      .input('hospital_name', sql.NVarChar, hospital_name).input('location', sql.NVarChar, location)
      .input('total_beds', sql.Int, total_beds).input('available_beds', sql.Int, available_beds || 0)
      .input('contact_number', sql.NVarChar, contact_number)
      .query('INSERT INTO hospitals (hospital_name,location,total_beds,available_beds,contact_number) OUTPUT INSERTED.* VALUES (@hospital_name,@location,@total_beds,@available_beds,@contact_number)');
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const updateHospital = async (req, res) => {
  const { available_beds, contact_number, is_active } = req.body;
  try {
    await pool.request().input('id', sql.Int, req.params.id)
      .input('available_beds', sql.Int, available_beds).input('contact_number', sql.NVarChar, contact_number).input('is_active', sql.Bit, is_active)
      .query('UPDATE hospitals SET available_beds=ISNULL(@available_beds,available_beds),contact_number=ISNULL(@contact_number,contact_number),is_active=ISNULL(@is_active,is_active) WHERE hospital_id=@id');
    const result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM hospitals WHERE hospital_id=@id');
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Hospital not found.' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const getPatients = async (req, res) => {
  try {
    const { hospital_id, report_id, status } = req.query;
    const request = pool.request();
    let where = 'WHERE 1=1';
    if (hospital_id) { request.input('hospital_id', sql.Int,      hospital_id); where += ' AND p.hospital_id=@hospital_id'; }
    if (report_id)   { request.input('report_id',   sql.Int,      report_id);   where += ' AND p.report_id=@report_id'; }
    if (status)      { request.input('status',       sql.NVarChar, status);      where += ' AND p.status=@status'; }
    const result = await request.query(`SELECT p.*,h.hospital_name,er.location AS incident_location,er.disaster_type FROM patients p JOIN hospitals h ON p.hospital_id=h.hospital_id JOIN emergency_reports er ON p.report_id=er.report_id ${where} ORDER BY p.admitted_at DESC`);
    res.json({ success: true, count: result.recordset.length, data: result.recordset });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const admitPatient = async (req, res) => {
  const { patient_name, age, condition_severity, report_id, hospital_id } = req.body;
  if (!patient_name || !condition_severity || !report_id || !hospital_id) return res.status(400).json({ success: false, message: 'patient_name, condition_severity, report_id, hospital_id required.' });
  try {
    const result = await pool.request()
      .input('patient_name', sql.NVarChar, patient_name).input('age', sql.Int, age)
      .input('condition_severity', sql.NVarChar, condition_severity).input('report_id', sql.Int, report_id)
      .input('hospital_id', sql.Int, hospital_id)
      .query('INSERT INTO patients (patient_name,age,condition_severity,report_id,hospital_id) OUTPUT INSERTED.* VALUES (@patient_name,@age,@condition_severity,@report_id,@hospital_id)');
    res.status(201).json({ success: true, message: 'Patient admitted.', data: result.recordset[0] });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const updatePatient = async (req, res) => {
  const { status, condition_severity } = req.body;
  try {
    await pool.request().input('id', sql.Int, req.params.id)
      .input('status', sql.NVarChar, status).input('condition_severity', sql.NVarChar, condition_severity)
      .query('UPDATE patients SET status=ISNULL(@status,status),condition_severity=ISNULL(@condition_severity,condition_severity) WHERE patient_id=@id');
    const result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM patients WHERE patient_id=@id');
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

module.exports = { getHospitals, getHospitalById, createHospital, updateHospital, getPatients, admitPatient, updatePatient };
