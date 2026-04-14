const express = require('express');
const router = express.Router();
const swapController = require('../controllers/swapController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', swapController.getAllSwaps);
router.post('/initiate', swapController.initiateSwap);
router.post('/confirm', swapController.confirmSwap);
router.get('/history/:riderId', swapController.getSwapHistory);

module.exports = router;
