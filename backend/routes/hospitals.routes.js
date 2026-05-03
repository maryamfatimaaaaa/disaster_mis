const router     = require('express').Router();
const controller = require('../controllers/hospitals.controller');
const verifyToken = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');

router.get('/hospitals',          verifyToken, controller.getHospitals);
router.get('/hospitals/:id',      verifyToken, controller.getHospitalById);
router.post('/hospitals',         verifyToken, allowRoles(ROLES.ADMIN), controller.createHospital);
router.put('/hospitals/:id',      verifyToken, allowRoles(ROLES.ADMIN), controller.updateHospital);

router.get('/patients',           verifyToken, controller.getPatients);
router.post('/patients',          verifyToken, allowRoles(ROLES.ADMIN, ROLES.OPERATOR), controller.admitPatient);
router.put('/patients/:id',       verifyToken, allowRoles(ROLES.ADMIN, ROLES.OPERATOR), controller.updatePatient);

module.exports = router;
