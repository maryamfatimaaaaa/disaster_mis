const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');

// ── POST /api/auth/login ───────────────────────────────────
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  try {
    // Fetch user with role name
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.password_hash, u.is_active,
              u.role_id, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        user_id:   user.user_id,
        username:  user.username,
        email:     user.email,
        role_id:   user.role_id,
        role_name: user.role_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Log login to audit_logs
    await pool.query(
      `INSERT INTO audit_logs (user_id, action_type, table_name, record_id, new_value)
       VALUES ($1, 'LOGIN', 'users', $2, $3)`,
      [user.user_id, user.user_id, `username=${user.username}`]
    );

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        user_id:   user.user_id,
        username:  user.username,
        email:     user.email,
        role_id:   user.role_id,
        role_name: user.role_name,
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ── POST /api/auth/logout ──────────────────────────────────
const logout = async (req, res) => {
  try {
    // Log logout
    await pool.query(
      `INSERT INTO audit_logs (user_id, action_type, table_name, record_id, new_value)
       VALUES ($1, 'LOGOUT', 'users', $2, $3)`,
      [req.user.user_id, req.user.user_id, `username=${req.user.username}`]
    );
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, message: 'Server error during logout.' });
  }
};

// ── GET /api/auth/me ───────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.created_at, u.is_active,
              u.role_id, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [req.user.user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/auth/users (Admin only) ──────────────────────
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.created_at, u.is_active,
              r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       ORDER BY u.user_id`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getAllUsers error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── POST /api/auth/register (Admin only) ──────────────────
const register = async (req, res) => {
  const { username, email, password, role_id } = req.body;

  if (!username || !email || !password || !role_id) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, username, email, role_id`,
      [username, email, password_hash, role_id]
    );

    res.status(201).json({ success: true, message: 'User created.', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Username or email already exists.' });
    }
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { login, logout, getMe, getAllUsers, register };
