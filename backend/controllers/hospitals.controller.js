const pool = require('../config/db');

// ════ HOSPITALS ═══════════════════════════════════════════

const getHospitals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *, ROUND((available_beds::NUMERIC / total_beds) * 100, 1) AS availability_pct
       FROM hospitals WHERE is_active = TRUE ORDER BY available_beds DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getHospitalById = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM hospitals WHERE hospital_id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Hospital not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const createHospital = async (req, res) => {
  const { hospital_name, location, total_beds, available_beds, contact_number } = req.body;
  if (!hospital_name || !location || !total_beds) {
    return res.status(400).json({ success: false, message: 'hospital_name, location, total_beds required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO hospitals (hospital_name, location, total_beds, available_beds, contact_number)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [hospital_name, location, total_beds, available_beds || 0, contact_number]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateHospital = async (req, res) => {
  const { available_beds, contact_number, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE hospitals
       SET available_beds  = COALESCE($1, available_beds),
           contact_number  = COALESCE($2, contact_number),
           is_active       = COALESCE($3, is_active)
       WHERE hospital_id = $4 RETURNING *`,
      [available_beds, contact_number, is_active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Hospital not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ════ PATIENTS ════════════════════════════════════════════

const getPatients = async (req, res) => {
  try {
    const { hospital_id, report_id, status } = req.query;
    let query = `
      SELECT p.*, h.hospital_name, er.location AS incident_location, er.disaster_type
      FROM patients p
      JOIN hospitals h ON p.hospital_id = h.hospital_id
      JOIN emergency_reports er ON p.report_id = er.report_id
      WHERE 1=1`;
    const params = [];
    if (hospital_id) { params.push(hospital_id); query += ` AND p.hospital_id = $${params.length}`; }
    if (report_id)   { params.push(report_id);   query += ` AND p.report_id = $${params.length}`; }
    if (status)      { params.push(status);       query += ` AND p.status = $${params.length}`; }
    query += ` ORDER BY p.admitted_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const admitPatient = async (req, res) => {
  const { patient_name, age, condition_severity, report_id, hospital_id } = req.body;
  if (!patient_name || !condition_severity || !report_id || !hospital_id) {
    return res.status(400).json({ success: false, message: 'patient_name, condition_severity, report_id, hospital_id required.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Trigger trg_update_hospital_beds fires automatically on INSERT
    const result = await client.query(
      `INSERT INTO patients (patient_name, age, condition_severity, report_id, hospital_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [patient_name, age, condition_severity, report_id, hospital_id]
    );
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Patient admitted. Bed count updated.', data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

const updatePatient = async (req, res) => {
  const { status, condition_severity } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Trigger fires on UPDATE to return bed if discharged
    const result = await client.query(
      `UPDATE patients
       SET status = COALESCE($1, status),
           condition_severity = COALESCE($2, condition_severity)
       WHERE patient_id = $3 RETURNING *`,
      [status, condition_severity, req.params.id]
    );
    if (result.rows.length === 0) throw new Error('Patient not found.');
    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

module.exports = { getHospitals, getHospitalById, createHospital, updateHospital, getPatients, admitPatient, updatePatient };
