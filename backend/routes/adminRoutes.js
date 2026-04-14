const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN'])); // Restrict to admins

router.get('/fleet-overview', adminController.getFleetOverview);
router.get('/analytics', adminController.getAnalytics);
router.get('/cashier-audits', adminController.getCashierAudits);
router.get('/daily-report', adminController.getDailyReport);

router.route('/users')
  .get(adminController.getAllUsers);

router.route('/users/:id')
  .put(adminController.updateUser)
  .delete(adminController.deleteUser);

module.exports = router;
