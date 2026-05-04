const sql = require('mssql');

const config = {
  server:   'localhost\\SQLEXPRESS',
  database: 'disaster_mis',
  user:     'sa',
  password: 'Admin@123',
  options: {
    trustServerCertificate: true,
    encrypt:                false,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

poolConnect
  .then(() => console.log('Connected to SQL Server database'))
  .catch(err => console.error('Database connection failed:', err.message));

module.exports = { pool, poolConnect, sql };