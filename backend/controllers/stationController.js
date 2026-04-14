const db = require('../config/db');

// @desc    Get all stations
// @route   GET /api/stations
// @access  Private
exports.getAllStations = async (req, res) => {
  try {
    const stations = await db.query('SELECT * FROM stations WHERE is_active = true ORDER BY station_name ASC');
    res.status(200).json({ status: 'success', data: stations.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving stations' });
  }
};

// @desc    Get nearby stations (query: lat, lng)
// @route   GET /api/stations/nearby
// @access  Private
exports.getNearbyStations = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ status: 'error', message: 'Please provide both lat and lng query parameters' });
    }

    // Using Haversine formula to sort by distance (in km)
    const query = `
      SELECT *, 
      ( 6371 * acos( cos( radians($1) ) * cos( radians( location_lat ) ) 
      * cos( radians( location_lng ) - radians($2) ) + sin( radians($1) ) 
      * sin( radians( location_lat ) ) ) ) AS distance 
      FROM stations 
      WHERE is_active = true 
      ORDER BY distance ASC
      LIMIT 10;
    `;
    
    const stations = await db.query(query, [lat, lng]);
    res.status(200).json({ status: 'success', data: stations.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error finding nearby stations' });
  }
};

// @desc    Get station battery inventory
// @route   GET /api/stations/:id/inventory
// @access  Private
exports.getStationInventory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate station
    const station = await db.query('SELECT * FROM stations WHERE station_id = $1', [id]);
    if (station.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Station not found' });
    }
    
    // Fetch batteries
    const batteries = await db.query('SELECT * FROM batteries WHERE station_id = $1', [id]);
    
    res.status(200).json({
      status: 'success', 
      data: {
        station: station.rows[0],
        inventory: batteries.rows,
        battery_count: batteries.rows.length
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving station inventory' });
  }
};

// @desc    Create a new station
// @route   POST /api/stations
// @access  Private (Admin)
exports.createStation = async (req, res) => {
  try {
    const { station_name, location_lat, location_lng, total_capacity, available_count } = req.body;

    if (!station_name || location_lat === undefined || location_lng === undefined || !total_capacity) {
      return res.status(400).json({ status: 'error', message: 'Please provide station_name, location_lat, location_lng, and total_capacity' });
    }

    const result = await db.query(
      `INSERT INTO stations (station_name, location_lat, location_lng, total_capacity, available_count)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [station_name, location_lat, location_lng, total_capacity, available_count ?? 0]
    );

    res.status(201).json({ status: 'success', message: 'Station created', data: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error creating station' });
  }
};

// @desc    Delete a station
// @route   DELETE /api/stations/:id
// @access  Private (Admin)
exports.deleteStation = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.query('DELETE FROM stations WHERE station_id = $1 RETURNING *', [id]);
    if (deleted.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Station not found' });
    res.status(200).json({ status: 'success', message: 'Station deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error deleting station' });
  }
};
