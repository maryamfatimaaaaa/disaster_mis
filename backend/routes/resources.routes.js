const router     = require('express').Router();
const controller = require('../controllers/resources.controller');
const verifyToken = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');

const WH_AND_ADMIN = [ROLES.ADMIN, ROLES.WAREHOUSE];

router.get('/warehouses',      verifyToken, controller.getWarehouses);
router.post('/warehouses',     verifyToken, allowRoles(...WH_AND_ADMIN), controller.createWarehouse);
router.get('/stock/summary',   verifyToken, controller.getStockSummary);
router.get('/',                verifyToken, controller.getAll);
router.get('/:id',             verifyToken, controller.getById);
router.post('/',               verifyToken, allowRoles(...WH_AND_ADMIN), controller.create);
router.put('/:id',             verifyToken, allowRoles(...WH_AND_ADMIN), controller.update);

module.exports = router;
