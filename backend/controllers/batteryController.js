const db = require('../config/db');

// @desc    Get all batteries
// @route   GET /api/batteries
// @access  Private (Admin/Tech)
exports.getAllBatteries = async (req, res) => {
  try {
    const batteries = await db.query('SELECT * FROM batteries ORDER BY battery_id DESC');
    res.status(200).json({ status: 'success', data: batteries.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving batteries' });
  }
};

// @desc    Get single battery details
// @route   GET /api/batteries/:id
// @access  Private
exports.getBatteryById = async (req, res) => {
  try {
    const { id } = req.params;
    const battery = await db.query('SELECT * FROM batteries WHERE battery_id = $1', [id]);
    
    if (battery.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Battery not found' });
    }
    
    res.status(200).json({ status: 'success', data: battery.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving battery' });
  }
};

// @desc    Update battery status
// @route   PUT /api/batteries/:id/status
// @access  Private (Admin/Tech)
exports.updateBatteryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, station_id } = req.body;
    
    if (!status) {
       return res.status(400).json({ status: 'error', message: 'Please provide status' });
    }
    
    const updateQuery = station_id !== undefined 
        ? 'UPDATE batteries SET status = $1, station_id = $2 WHERE battery_id = $3 RETURNING *'
        : 'UPDATE batteries SET status = $1 WHERE battery_id = $2 RETURNING *';
        
    const queryParams = station_id !== undefined ? [status, station_id, id] : [status, id];

    const updatedBattery = await db.query(updateQuery, queryParams);

    if (updatedBattery.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Battery not found' });
    }

    // Auto-create repair ticket if marked as FLAGGED
    if (status === 'FLAGGED') {
      const battery = updatedBattery.rows[0];
      const existingTicket = await db.query(
        "SELECT * FROM repair_tickets WHERE battery_id = $1 AND status IN ('OPEN', 'IN_PROGRESS')",
        [id]
      );
      
      if (existingTicket.rows.length === 0) {
        const techs = await db.query("SELECT user_id FROM users WHERE role = 'TECHNICIAN' LIMIT 1");
        if (techs.rows.length > 0) {
          const technicianId = techs.rows[0].user_id;
          await db.query(
            `INSERT INTO repair_tickets (battery_id, technician_id, issue_description, soh_before, status)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, technicianId, 'Manual Flagging: Battery status updated to FLAGGED requiring immediate technician check.', battery.state_of_health, 'OPEN']
          );
        }
      }
    }
    
    res.status(200).json({ status: 'success', data: updatedBattery.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error updating battery status' });
  }
};

// @desc    Get telemetry history
// @route   GET /api/batteries/:id/telemetry
// @access  Private
exports.getBatteryTelemetry = async (req, res) => {
  try {
    const { id } = req.params;
    const telemetry = await db.query(
        'SELECT * FROM telemetry_logs WHERE battery_id = $1 ORDER BY recorded_at DESC LIMIT 100', 
        [id]
    );
    
    res.status(200).json({ status: 'success', data: telemetry.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving telemetry' });
  }
};

// @desc    Look up battery by serial number (for rider QR scan)
// @route   GET /api/batteries/lookup?serial=SPR-BAT-001
// @access  Private (all roles)
exports.getBatteryBySerial = async (req, res) => {
  try {
    const { serial } = req.query;
    if (!serial) return res.status(400).json({ status: 'error', message: 'Please provide serial query param' });

    const result = await db.query(
      'SELECT * FROM batteries WHERE serial_number = $1',
      [serial.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: `Battery with serial "${serial}" not found` });
    }

    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error looking up battery' });
  }
};

// @desc    Create a new battery
// @route   POST /api/batteries
// @access  Private (Admin)
exports.createBattery = async (req, res) => {
  try {
    const { serial_number, model, state_of_health, state_of_charge, status, station_id } = req.body;

    if (!serial_number || !model || state_of_health === undefined || state_of_charge === undefined || !status) {
      return res.status(400).json({ status: 'error', message: 'Please provide serial_number, model, state_of_health, state_of_charge, and status' });
    }

    const result = await db.query(
      `INSERT INTO batteries (serial_number, model, state_of_health, state_of_charge, status, station_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [serial_number, model, state_of_health, state_of_charge, status, station_id || null]
    );

    // If battery is AVAILABLE and assigned to a station, increment available_count
    if (status === 'AVAILABLE' && station_id) {
      await db.query('UPDATE stations SET available_count = available_count + 1 WHERE station_id = $1', [station_id]);
    }

    res.status(201).json({ status: 'success', message: 'Battery created', data: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error creating battery' });
  }
};

// @desc    Delete a battery
// @route   DELETE /api/batteries/:id
// @access  Private (Admin)
exports.deleteBattery = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    // Delete related records first to avoid foreign key errors
    await client.query('DELETE FROM telemetry_logs WHERE battery_id = $1', [id]);
    await client.query('DELETE FROM repair_tickets WHERE battery_id = $1', [id]);
    await client.query('DELETE FROM swap_transactions WHERE battery_given_id = $1 OR battery_received_id = $1', [id]);

    const deleted = await client.query('DELETE FROM batteries WHERE battery_id = $1 RETURNING *', [id]);
    if (deleted.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Battery not found' });
    }

    await client.query('COMMIT');
    res.status(200).json({ status: 'success', message: 'Battery deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error deleting battery' });
  } finally {
    client.release();
  }
};
