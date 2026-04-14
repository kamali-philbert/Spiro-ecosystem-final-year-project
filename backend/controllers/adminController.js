const db = require('../config/db');

exports.getFleetOverview = async (req, res) => {
  try {
    const totalBatteries = await db.query('SELECT COUNT(*) FROM batteries');
    const flaggedBatteries = await db.query('SELECT COUNT(*) FROM batteries WHERE status = \'FLAGGED\'');
    const chargingBatteries = await db.query('SELECT COUNT(*) FROM batteries WHERE status = \'CHARGING\'');
    const availableBatteries = await db.query('SELECT COUNT(*) FROM batteries WHERE status = \'AVAILABLE\'');
    const inUseBatteries = await db.query('SELECT COUNT(*) FROM batteries WHERE status = \'IN_USE\'');
    
    // Average State of Health
    const avgSoh = await db.query('SELECT AVG(state_of_health) as average_soh FROM batteries');

    res.status(200).json({
       status: 'success', 
       data: {
          total: parseInt(totalBatteries.rows[0].count),
          flagged: parseInt(flaggedBatteries.rows[0].count),
          charging: parseInt(chargingBatteries.rows[0].count),
          available: parseInt(availableBatteries.rows[0].count),
          in_use: parseInt(inUseBatteries.rows[0].count),
          average_soh: parseFloat(avgSoh.rows[0].average_soh || 0).toFixed(2)
       } 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving fleet overview' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    // Swaps count
    const totalSwaps = await db.query('SELECT COUNT(*) FROM swap_transactions WHERE status = \'COMPLETED\'');
    
    // Total riders
    const totalRiders = await db.query('SELECT COUNT(*) FROM users WHERE role = \'RIDER\'');
    
    // Open Repair Tickets
    const openTickets = await db.query('SELECT COUNT(*) FROM repair_tickets WHERE status = \'OPEN\' OR status = \'IN_PROGRESS\'');

    res.status(200).json({
        status: 'success', 
        data: {
            total_swaps: parseInt(totalSwaps.rows[0].count),
            total_riders: parseInt(totalRiders.rows[0].count),
            open_repair_tickets: parseInt(openTickets.rows[0].count)
        }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving analytics' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await db.query('SELECT user_id, full_name, email, role, phone_number, is_active, created_at FROM users ORDER BY created_at DESC');
    res.status(200).json({ status: 'success', data: users.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving users' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, is_active } = req.body;
    
    const updatedUser = await db.query(
        'UPDATE users SET role = COALESCE($1, role), is_active = COALESCE($2, is_active) WHERE user_id = $3 RETURNING user_id, full_name, email, role, is_active',
        [role, is_active, id]
    );

    if (updatedUser.rows.length === 0) return res.status(404).json({ status: 'error', message: 'User not found' });
    
    res.status(200).json({ status: 'success', message: 'User updated', data: updatedUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error updating user' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id', [id]);
    
    if (deleted.rows.length === 0) return res.status(404).json({ status: 'error', message: 'User not found' });
    
    res.status(200).json({ status: 'success', message: 'User deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error deleting user (foreign key constraints might prevent deletion)' });
  }
};

exports.getCashierAudits = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.collector_id, c.full_name as cashier_name, c.phone_number, SUM(p.amount) as total_collected, COUNT(p.payment_id) as transaction_count
      FROM payments p
      JOIN users c ON p.collector_id = c.user_id
      WHERE DATE(p.created_at) = CURRENT_DATE
      GROUP BY p.collector_id, c.full_name, c.phone_number
      ORDER BY total_collected DESC
    `);
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving audits' });
  }
};

// @desc    Admin daily report — all stations or filtered by station + date
// @route   GET /api/admin/daily-report?date=YYYY-MM-DD&station_id=
// @access  Private/Admin
exports.getDailyReport = async (req, res) => {
  try {
    const date       = req.query.date       || new Date().toISOString().split('T')[0];
    const station_id = req.query.station_id || null;

    const params = [date];
    let stationFilter = '';
    if (station_id) { params.push(station_id); stationFilter = `AND st.station_id = $${params.length}`; }

    const swaps = await db.query(
      `SELECT
         st.transaction_id,
         st.swap_timestamp,
         u.full_name    AS rider_name,
         u.phone_number AS rider_phone,
         s.station_name,
         bg.serial_number AS battery_given,
         br.serial_number AS battery_received,
         st.soc_at_return,
         COALESCE(st.cost, 0) AS cost,
         st.status
       FROM swap_transactions st
       JOIN users u      ON st.rider_id           = u.user_id
       JOIN stations s   ON st.station_id          = s.station_id
       JOIN batteries bg ON st.battery_given_id    = bg.battery_id
       JOIN batteries br ON st.battery_received_id = br.battery_id
       WHERE DATE(st.swap_timestamp) = $1
         AND st.status = 'COMPLETED'
         ${stationFilter}
       ORDER BY s.station_name, st.swap_timestamp ASC`,
      params
    );

    const totalSwaps   = swaps.rows.length;
    const totalRevenue = swaps.rows.reduce((s, r) => s + Number(r.cost), 0);
    const avgSoc       = totalSwaps
      ? (swaps.rows.reduce((s, r) => s + Number(r.soc_at_return), 0) / totalSwaps).toFixed(1)
      : 0;

    // Revenue per station breakdown
    const byStation = {};
    swaps.rows.forEach(r => {
      if (!byStation[r.station_name]) byStation[r.station_name] = { swaps: 0, revenue: 0 };
      byStation[r.station_name].swaps++;
      byStation[r.station_name].revenue += Number(r.cost);
    });

    res.status(200).json({
      status: 'success',
      data: {
        date,
        total_swaps:   totalSwaps,
        total_revenue: totalRevenue,
        avg_soc:       avgSoc,
        by_station:    byStation,
        transactions:  swaps.rows,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error fetching admin daily report' });
  }
};
