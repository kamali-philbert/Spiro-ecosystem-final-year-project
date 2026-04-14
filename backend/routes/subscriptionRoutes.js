const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/subscriptionController');
const protect = require('../middleware/authMiddleware');
const role    = require('../middleware/roleMiddleware');

router.get('/',           protect, role(['ADMIN', 'CASHIER']), ctrl.getAllSubscriptions);
router.post('/',          protect, role(['ADMIN', 'CASHIER']), ctrl.createSubscription);
router.get('/:userId',    protect,                           ctrl.getSubscription);
router.delete('/:id',     protect, role(['ADMIN']),          ctrl.deactivateSubscription);
router.put('/:id/topup',  protect, role(['ADMIN', 'CASHIER']), ctrl.topUpBalance);

module.exports = router;
