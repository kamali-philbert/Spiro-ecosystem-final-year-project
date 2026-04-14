const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stationController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/nearby', stationController.getNearbyStations);
router.get('/:id/inventory', stationController.getStationInventory);
router.get('/', stationController.getAllStations);
router.post('/', roleMiddleware(['ADMIN']), stationController.createStation);
router.delete('/:id', roleMiddleware(['ADMIN']), stationController.deleteStation);

module.exports = router;
