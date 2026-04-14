const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Main health check route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Spiro Ecosystem API is running' });
});

// Import and use routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/batteries', require('./routes/batteryRoutes'));
app.use('/api/stations', require('./routes/stationRoutes'));
app.use('/api/swaps', require('./routes/swapRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/telemetry', require('./routes/telemetryRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/notifications',  require('./routes/notificationRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/cashier', require('./routes/cashierRoutes'));

// Error handling for 404
app.use((req, res, next) => {
  res.status(404).json({ status: 'error', message: 'Endpoint not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
