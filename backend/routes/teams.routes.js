const router     = require('express').Router();
const controller = require('../controllers/teams.controller');
const verifyToken = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');

router.get('/',                          verifyToken, controller.getAll);
router.get('/:id',                       verifyToken, controller.getById);
router.get('/:id/assignments',           verifyToken, controller.getAssignments);
router.post('/',                         verifyToken, allowRoles(ROLES.ADMIN), controller.create);
router.put('/:id',                       verifyToken, allowRoles(ROLES.ADMIN, ROLES.FIELD), controller.update);
router.post('/assign',                   verifyToken, allowRoles(ROLES.ADMIN, ROLES.OPERATOR), controller.assign);
router.put('/assignments/:id/complete',  verifyToken, allowRoles(ROLES.ADMIN, ROLES.OPERATOR, ROLES.FIELD), controller.completeAssignment);

module.exports = router;
