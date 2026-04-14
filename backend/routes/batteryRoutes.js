const express = require('express');
const router = express.Router();
const batteryController = require('../controllers/batteryController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/',    roleMiddleware(['ADMIN', 'TECHNICIAN']), batteryController.getAllBatteries);
router.post('/',   roleMiddleware(['ADMIN']),               batteryController.createBattery);
router.get('/lookup', batteryController.getBatteryBySerial); // riders can look up by serial
router.get('/:id', batteryController.getBatteryById);
router.put('/:id/status', roleMiddleware(['ADMIN', 'TECHNICIAN']), batteryController.updateBatteryStatus);
router.get('/:id/telemetry', batteryController.getBatteryTelemetry);
router.delete('/:id', roleMiddleware(['ADMIN']),            batteryController.deleteBattery);

module.exports = router;
