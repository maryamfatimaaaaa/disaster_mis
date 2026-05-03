require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/reports',     require('./routes/reports.routes'));
app.use('/api/teams',       require('./routes/teams.routes'));
app.use('/api/resources',   require('./routes/resources.routes'));
app.use('/api/allocations', require('./routes/allocations.routes'));
app.use('/api/hospitals',   require('./routes/hospitals.routes'));
app.use('/api/financial',   require('./routes/financial.routes'));
app.use('/api/approvals',   require('./routes/approvals.routes'));
app.use('/api/audit',       require('./routes/audit.routes'));

// ── Health check ───────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Disaster MIS API is running', status: 'OK' });
});

// ── Global error handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ── Start server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
