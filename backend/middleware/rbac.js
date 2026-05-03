// Role names must match exactly what is stored in ROLES table
const ROLES = {
  ADMIN:     'Administrator',
  OPERATOR:  'Emergency Operator',
  FIELD:     'Field Officer',
  WAREHOUSE: 'Warehouse Manager',
  FINANCE:   'Finance Officer',
};

// allowRoles(...roleNames) — returns middleware that checks if user's role is in the list
const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`
      });
    }
    next();
  };
};

module.exports = { allowRoles, ROLES };
