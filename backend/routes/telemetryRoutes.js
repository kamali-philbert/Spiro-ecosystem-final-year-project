const express = require('express');
const router = express.Router();
const telemetryController = require('../controllers/telemetryController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, telemetryController.ingestTelemetry);
router.get('/:batteryId', authMiddleware, telemetryController.getBatteryTelemetryLogs);

module.exports = router;
