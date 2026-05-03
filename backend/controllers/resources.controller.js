const pool = require('../config/db');

// ════ WAREHOUSES ══════════════════════════════════════════

// GET /api/resources/warehouses
const getWarehouses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.*, u.username AS manager_name
       FROM warehouses w
       JOIN users u ON w.managed_by = u.user_id
       WHERE w.is_active = TRUE
       ORDER BY w.warehouse_id`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/resources/warehouses
const createWarehouse = async (req, res) => {
  const { warehouse_name, location, managed_by } = req.body;
  if (!warehouse_name || !location || !managed_by) {
    return res.status(400).json({ success: false, message: 'warehouse_name, location, managed_by required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO warehouses (warehouse_name, location, managed_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [warehouse_name, location, managed_by]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ════ RESOURCES ═══════════════════════════════════════════

// GET /api/resources
const getAll = async (req, res) => {
  try {
    const { resource_type, warehouse_id, low_stock } = req.query;
    let query = `
      SELECT r.*, w.warehouse_name, w.location AS warehouse_location,
             CASE WHEN r.quantity_available <= r.reorder_threshold
                  THEN true ELSE false END AS is_low_stock
      FROM resources r
      JOIN warehouses w ON r.warehouse_id = w.warehouse_id
      WHERE 1=1`;
    const params = [];

    if (resource_type) { params.push(resource_type); query += ` AND r.resource_type = $${params.length}`; }
    if (warehouse_id)  { params.push(warehouse_id);  query += ` AND r.warehouse_id = $${params.length}`; }
    if (low_stock === 'true') {
      query += ` AND r.quantity_available <= r.reorder_threshold`;
    }

    query += ` ORDER BY r.resource_type, r.resource_name`;
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/resources/:id
const getById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, w.warehouse_name FROM resources r
       JOIN warehouses w ON r.warehouse_id = w.warehouse_id
       WHERE r.resource_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Resource not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/resources
const create = async (req, res) => {
  const { resource_name, resource_type, quantity_available, reorder_threshold, warehouse_id, unit } = req.body;
  if (!resource_name || !resource_type || !warehouse_id || !unit) {
    return res.status(400).json({ success: false, message: 'resource_name, resource_type, warehouse_id, unit required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO resources (resource_name, resource_type, quantity_available, reorder_threshold, warehouse_id, unit)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [resource_name, resource_type, quantity_available || 0, reorder_threshold || 0, warehouse_id, unit]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/resources/:id
const update = async (req, res) => {
  const { quantity_available, reorder_threshold, resource_name } = req.body;
  try {
    const result = await pool.query(
      `UPDATE resources
       SET quantity_available = COALESCE($1, quantity_available),
           reorder_threshold  = COALESCE($2, reorder_threshold),
           resource_name      = COALESCE($3, resource_name)
       WHERE resource_id = $4 RETURNING *`,
      [quantity_available, reorder_threshold, resource_name, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Resource not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/resources/stock/summary
const getStockSummary = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT resource_type,
              SUM(quantity_available)              AS total_quantity,
              COUNT(*)                             AS item_count,
              COUNT(*) FILTER (WHERE quantity_available <= reorder_threshold) AS low_stock_count
       FROM resources
       GROUP BY resource_type
       ORDER BY resource_type`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getWarehouses, createWarehouse, getAll, getById, create, update, getStockSummary };
