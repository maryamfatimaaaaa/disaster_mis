const router     = require('express').Router();
const controller = require('../controllers/audit.controller');
const verifyToken = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');

router.get('/',        verifyToken, allowRoles(ROLES.ADMIN), controller.getAll);
router.get('/summary', verifyToken, allowRoles(ROLES.ADMIN), controller.getSummary);

module.exports = router;
