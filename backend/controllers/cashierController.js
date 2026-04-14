const db = require('../config/db');

// @desc    Lookup a rider by phone or email
// @route   GET /api/cashier/rider-lookup
// @access  Private/CASHIER
exports.lookupRider = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ status: 'error', message: 'Query parameter is required' });
    }

    const result = await db.query(
      `SELECT user_id, full_name, email, phone_number, is_active 
       FROM users 
       WHERE role = 'RIDER' AND (email ILIKE $1 OR phone_number ILIKE $1)`,
      [`%${query}%`]
    );

    res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error searching rider' });
  }
};

// @desc    Get daily summary of transactions (Swaps and Subscriptions)
// @route   GET /api/cashier/daily-summary
// @access  Private/CASHIER
exports.getDailySummary = async (req, res) => {
  try {
    const cashierId = req.user.user_id;

    // Get swaps completed today (just for visibility)
    const swapRes = await db.query(`
      SELECT st.*, u.full_name as rider_name, s.station_name
      FROM swap_transactions st
      JOIN users u ON st.rider_id = u.user_id
      JOIN stations s ON st.station_id = s.station_id
      WHERE DATE(st.swap_timestamp) = CURRENT_DATE 
      AND st.status = 'COMPLETED'
      ORDER BY st.swap_timestamp DESC
    `);

    // Get actual cash payments collected today by this cashier
    const payRes = await db.query(`
      SELECT p.*, u.full_name as rider_name 
      FROM payments p
      JOIN users u ON p.rider_id = u.user_id
      WHERE p.collector_id = $1 AND DATE(p.created_at) = CURRENT_DATE
      ORDER BY p.payment_id DESC
    `, [cashierId]);

    const totalCash = payRes.rows.reduce((sum, p) => sum + Number(p.amount), 0);

    res.status(200).json({
      status: 'success',
      data: {
        swaps: swapRes.rows,
        payments: payRes.rows,
        total_cash: totalCash
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error fetching daily summary' });
  }
};

// @desc    Get full daily report for a given date (cashier sees all swaps that day)
// @route   GET /api/cashier/daily-report?date=YYYY-MM-DD
// @access  Private/CASHIER|ADMIN
exports.getDailyReport = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const swaps = await db.query(
      `SELECT
         st.transaction_id,
         st.swap_timestamp,
         u.full_name   AS rider_name,
         u.phone_number AS rider_phone,
         s.station_name,
         bg.serial_number AS battery_given,
         br.serial_number AS battery_received,
         st.soc_at_return,
         COALESCE(st.cost, 0) AS cost,
         st.status
       FROM swap_transactions st
       JOIN users u      ON st.rider_id          = u.user_id
       JOIN stations s   ON st.station_id         = s.station_id
       JOIN batteries bg ON st.battery_given_id   = bg.battery_id
       JOIN batteries br ON st.battery_received_id = br.battery_id
       WHERE DATE(st.swap_timestamp) = $1
         AND st.status = 'COMPLETED'
       ORDER BY st.swap_timestamp ASC`,
      [date]
    );

    const totalSwaps   = swaps.rows.length;
    const totalRevenue = swaps.rows.reduce((s, r) => s + Number(r.cost), 0);
    const avgSoc       = totalSwaps
      ? (swaps.rows.reduce((s, r) => s + Number(r.soc_at_return), 0) / totalSwaps).toFixed(1)
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        date,
        total_swaps:   totalSwaps,
        total_revenue: totalRevenue,
        avg_soc:       avgSoc,
        transactions:  swaps.rows,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error fetching daily report' });
  }
};
