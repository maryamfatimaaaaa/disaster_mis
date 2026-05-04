const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { pool, sql } = require('../config/db');

// ── POST /api/auth/login ───────────────────────────────────
const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password are required.' });

  try {
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`
        SELECT u.user_id, u.username, u.email, u.password_hash, u.is_active,
               u.role_id, r.role_name
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.username = @username
      `);

    if (result.recordset.length === 0)
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });

    const user = result.recordset[0];
    if (!user.is_active)
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, email: user.email, role_id: user.role_id, role_name: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    await pool.request()
      .input('user_id',   sql.Int,      user.user_id)
      .input('record_id', sql.Int,      user.user_id)
      .input('new_value', sql.NVarChar, `username=${user.username}`)
      .query(`INSERT INTO audit_logs (user_id, action_type, table_name, record_id, new_value)
              VALUES (@user_id, 'LOGIN', 'users', @record_id, @new_value)`);

    res.json({
      success: true, message: 'Login successful.', token,
      user: { user_id: user.user_id, username: user.username, email: user.email, role_id: user.role_id, role_name: user.role_name }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ── POST /api/auth/logout ──────────────────────────────────
const logout = async (req, res) => {
  try {
    await pool.request()
      .input('user_id',   sql.Int,      req.user.user_id)
      .input('record_id', sql.Int,      req.user.user_id)
      .input('new_value', sql.NVarChar, `username=${req.user.username}`)
      .query(`INSERT INTO audit_logs (user_id, action_type, table_name, record_id, new_value)
              VALUES (@user_id, 'LOGOUT', 'users', @record_id, @new_value)`);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/auth/me ───────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const result = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query(`SELECT u.user_id, u.username, u.email, u.created_at, u.is_active,
                     u.role_id, r.role_name
              FROM users u JOIN roles r ON u.role_id = r.role_id
              WHERE u.user_id = @user_id`);
    if (result.recordset.length === 0)
      return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/auth/users ────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.request().query(
      `SELECT u.user_id, u.username, u.email, u.created_at, u.is_active, r.role_name
       FROM users u JOIN roles r ON u.role_id = r.role_id ORDER BY u.user_id`
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── POST /api/auth/register ────────────────────────────────
const register = async (req, res) => {
  const { username, email, password, role_id } = req.body;
  if (!username || !email || !password || !role_id)
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const result = await pool.request()
      .input('username',      sql.NVarChar, username)
      .input('email',         sql.NVarChar, email)
      .input('password_hash', sql.NVarChar, password_hash)
      .input('role_id',       sql.Int,      role_id)
      .query(`INSERT INTO users (username, email, password_hash, role_id)
              OUTPUT INSERTED.user_id, INSERTED.username, INSERTED.email, INSERTED.role_id
              VALUES (@username, @email, @password_hash, @role_id)`);
    res.status(201).json({ success: true, message: 'User created.', data: result.recordset[0] });
  } catch (err) {
    if (err.number === 2627)
      return res.status(409).json({ success: false, message: 'Username or email already exists.' });
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { login, logout, getMe, getAllUsers, register };
