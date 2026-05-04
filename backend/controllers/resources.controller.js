const { pool, sql } = require('../config/db');

const getWarehouses = async (req, res) => {
  try {
    const result = await pool.request().query('SELECT w.*,u.username AS manager_name FROM warehouses w JOIN users u ON w.managed_by=u.user_id WHERE w.is_active=1 ORDER BY w.warehouse_id');
    res.json({ success: true, data: result.recordset });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const createWarehouse = async (req, res) => {
  const { warehouse_name, location, managed_by } = req.body;
  if (!warehouse_name || !location || !managed_by) return res.status(400).json({ success: false, message: 'warehouse_name, location, managed_by required.' });
  try {
    const result = await pool.request().input('warehouse_name', sql.NVarChar, warehouse_name).input('location', sql.NVarChar, location).input('managed_by', sql.Int, managed_by)
      .query('INSERT INTO warehouses (warehouse_name,location,managed_by) OUTPUT INSERTED.* VALUES (@warehouse_name,@location,@managed_by)');
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const getAll = async (req, res) => {
  try {
    const { resource_type, warehouse_id, low_stock } = req.query;
    const request = pool.request();
    let where = 'WHERE 1=1';
    if (resource_type) { request.input('resource_type', sql.NVarChar, resource_type); where += ' AND r.resource_type=@resource_type'; }
    if (warehouse_id)  { request.input('warehouse_id',  sql.Int,      warehouse_id);  where += ' AND r.warehouse_id=@warehouse_id'; }
    if (low_stock === 'true') where += ' AND r.quantity_available<=r.reorder_threshold';
    const result = await request.query(`SELECT r.*,w.warehouse_name,w.location AS warehouse_location,CASE WHEN r.quantity_available<=r.reorder_threshold THEN 1 ELSE 0 END AS is_low_stock FROM resources r JOIN warehouses w ON r.warehouse_id=w.warehouse_id ${where} ORDER BY r.resource_type,r.resource_name`);
    res.json({ success: true, count: result.recordset.length, data: result.recordset });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const getById = async (req, res) => {
  try {
    const result = await pool.request().input('id', sql.Int, req.params.id)
      .query('SELECT r.*,w.warehouse_name FROM resources r JOIN warehouses w ON r.warehouse_id=w.warehouse_id WHERE r.resource_id=@id');
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Resource not found.' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const create = async (req, res) => {
  const { resource_name, resource_type, quantity_available, reorder_threshold, warehouse_id, unit } = req.body;
  if (!resource_name || !resource_type || !warehouse_id || !unit) return res.status(400).json({ success: false, message: 'resource_name, resource_type, warehouse_id, unit required.' });
  try {
    const result = await pool.request()
      .input('resource_name', sql.NVarChar, resource_name).input('resource_type', sql.NVarChar, resource_type)
      .input('quantity_available', sql.Int, quantity_available || 0).input('reorder_threshold', sql.Int, reorder_threshold || 0)
      .input('warehouse_id', sql.Int, warehouse_id).input('unit', sql.NVarChar, unit)
      .query('INSERT INTO resources (resource_name,resource_type,quantity_available,reorder_threshold,warehouse_id,unit) OUTPUT INSERTED.* VALUES (@resource_name,@resource_type,@quantity_available,@reorder_threshold,@warehouse_id,@unit)');
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const update = async (req, res) => {
  const { quantity_available, reorder_threshold, resource_name } = req.body;
  try {
    await pool.request().input('id', sql.Int, req.params.id)
      .input('quantity_available', sql.Int, quantity_available).input('reorder_threshold', sql.Int, reorder_threshold).input('resource_name', sql.NVarChar, resource_name)
      .query('UPDATE resources SET quantity_available=ISNULL(@quantity_available,quantity_available),reorder_threshold=ISNULL(@reorder_threshold,reorder_threshold),resource_name=ISNULL(@resource_name,resource_name) WHERE resource_id=@id');
    const result = await pool.request().input('id', sql.Int, req.params.id).query('SELECT * FROM resources WHERE resource_id=@id');
    if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Resource not found.' });
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const getStockSummary = async (req, res) => {
  try {
    const result = await pool.request().query('SELECT resource_type,SUM(quantity_available) AS total_quantity,COUNT(*) AS item_count,SUM(CASE WHEN quantity_available<=reorder_threshold THEN 1 ELSE 0 END) AS low_stock_count FROM resources GROUP BY resource_type ORDER BY resource_type');
    res.json({ success: true, data: result.recordset });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { getWarehouses, createWarehouse, getAll, getById, create, update, getStockSummary };
