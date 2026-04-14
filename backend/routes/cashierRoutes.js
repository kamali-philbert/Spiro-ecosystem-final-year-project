const express = require('express');
const router = express.Router();
const cashierController = require('../controllers/cashierController');
const protect = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');

router.use(protect);
router.use(role(['CASHIER', 'ADMIN']));

router.get('/rider-lookup', cashierController.lookupRider);
router.get('/daily-summary', cashierController.getDailySummary);
router.get('/daily-report', cashierController.getDailyReport);

module.exports = router;
