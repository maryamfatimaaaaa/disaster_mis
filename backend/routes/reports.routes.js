const router     = require('express').Router();
const controller = require('../controllers/reports.controller');
const verifyToken = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');

const OPS_AND_ABOVE = [ROLES.ADMIN, ROLES.OPERATOR, ROLES.FIELD];

router.get('/stats/summary', verifyToken, controller.getSummary);
router.get('/',              verifyToken, controller.getAll);
router.get('/:id',           verifyToken, controller.getById);
router.post('/',             verifyToken, allowRoles(ROLES.ADMIN, ROLES.OPERATOR), controller.create);
router.put('/:id',           verifyToken, allowRoles(ROLES.ADMIN, ROLES.OPERATOR, ROLES.FIELD), controller.update);

module.exports = router;
