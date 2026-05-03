const router     = require('express').Router();
const controller = require('../controllers/auth.controller');
const verifyToken = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');

router.post('/login',    controller.login);
router.post('/logout',   verifyToken, controller.logout);
router.get('/me',        verifyToken, controller.getMe);
router.get('/users',     verifyToken, allowRoles(ROLES.ADMIN), controller.getAllUsers);
router.post('/register', verifyToken, allowRoles(ROLES.ADMIN), controller.register);

module.exports = router;
