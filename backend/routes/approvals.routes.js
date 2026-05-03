const router     = require('express').Router();
const controller = require('../controllers/approvals.controller');
const verifyToken = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');

router.get('/',           verifyToken, controller.getAll);
router.post('/',          verifyToken, controller.create);
router.put('/:id/action', verifyToken, allowRoles(ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.FINANCE), controller.action);

module.exports = router;
