const router     = require('express').Router();
const controller = require('../controllers/financial.controller');
const verifyToken = require('../middleware/auth');
const { allowRoles, ROLES } = require('../middleware/rbac');

const FINANCE_AND_ADMIN = [ROLES.ADMIN, ROLES.FINANCE];

router.get('/summary',           verifyToken, allowRoles(...FINANCE_AND_ADMIN), controller.getFinancialSummary);
router.get('/donations',         verifyToken, allowRoles(...FINANCE_AND_ADMIN), controller.getDonations);
router.post('/donations',        verifyToken, allowRoles(...FINANCE_AND_ADMIN), controller.createDonation);
router.get('/expenses',          verifyToken, allowRoles(...FINANCE_AND_ADMIN), controller.getExpenses);
router.post('/expenses',         verifyToken, allowRoles(...FINANCE_AND_ADMIN), controller.createExpense);
router.put('/expenses/:id/approve', verifyToken, allowRoles(ROLES.ADMIN), controller.approveExpense);

module.exports = router;
