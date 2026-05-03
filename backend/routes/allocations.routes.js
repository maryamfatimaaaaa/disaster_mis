const router     = require('express').Router();
const controller = require('../controllers/allocations.controller');
const verifyToken = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');

router.get('/',               verifyToken, controller.getAll);
router.post('/',              verifyToken, allowRoles(ROLES.ADMIN, ROLES.OPERATOR, ROLES.WAREHOUSE), controller.request);
router.put('/:id/approve',    verifyToken, allowRoles(ROLES.ADMIN, ROLES.WAREHOUSE), controller.approve);
router.put('/:id/reject',     verifyToken, allowRoles(ROLES.ADMIN, ROLES.WAREHOUSE), controller.reject);

module.exports = router;
