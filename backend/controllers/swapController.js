const db = require('../config/db');

// Base cost 2000 RWF, increases as SoC of returned battery is lower
const calculateSwapCost = (socGiven) => {
  const base = 2000;
  // For every 1% below 100 SoC returned, add 20 RWF
  const surcharge = Math.max(0, (100 - socGiven) * 20);
  return Number((base + surcharge).toFixed(2));
};

// @desc    Start a swap (verify balance + availability)
// @route   POST /api/swaps/initiate
// @access  Private
exports.initiateSwap = async (req, res) => {
  try {
    const { station_id, battery_given_id, rider_id, soc_given } = req.body;
    
    const userId = rider_id || req.user.user_id;

    // 1. Check if station has available batteries
    const stationRes = await db.query('SELECT * FROM stations WHERE station_id = $1 AND is_active = true', [station_id]);
    if (stationRes.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Station not found or inactive' });
    
    const station = stationRes.rows[0];
    if (station.available_count < 1) return res.status(400).json({ status: 'error', message: 'No batteries available at this station' });

    // 2. Check rider's subscription & balance
    const subRes = await db.query('SELECT * FROM subscriptions WHERE rider_id = $1 AND is_active = true', [userId]);
    if (subRes.rows.length === 0) return res.status(400).json({ status: 'error', message: 'No active subscription found for rider' });
    
    const subscription = subRes.rows[0];
    if (parseFloat(subscription.balance) < 2000) return res.status(400).json({ status: 'error', message: 'Insufficient balance. Minimum 2000 RWF required for a swap.' });

    // 3. Find an available fully charged battery at the station
    const availBtyRes = await db.query(
        "SELECT * FROM batteries WHERE station_id = $1 AND status = 'AVAILABLE' AND battery_id != $2 AND state_of_health > 20 ORDER BY state_of_charge DESC LIMIT 1",
        [station_id, battery_given_id]
    );
    if (availBtyRes.rows.length === 0) return res.status(400).json({ status: 'error', message: 'No available fully charged batteries' });
    const batteryReceived = availBtyRes.rows[0];

    // 4. Create PENDING swap transaction
    const returnSoc = soc_given || 15.0;
    
    const transRes = await db.query(
        `INSERT INTO swap_transactions 
        (rider_id, station_id, battery_given_id, battery_received_id, soc_at_return, status) 
        VALUES ($1, $2, $3, $4, $5, 'PENDING') RETURNING *`,
        [userId, station_id, battery_given_id, batteryReceived.battery_id, returnSoc]
    );

    res.status(200).json({
      status: 'success',
      message: 'Swap initiated successfully',
      data: {
        transaction: transRes.rows[0],
        cost_estimate: calculateSwapCost(returnSoc)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error initiating swap' });
  }
};

// @desc    Complete the swap transaction
// @route   POST /api/swaps/confirm
// @access  Private
exports.confirmSwap = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { transaction_id } = req.body;

    // 1. Get transaction
    const transRes = await client.query('SELECT * FROM swap_transactions WHERE transaction_id = $1 AND status = \'PENDING\'', [transaction_id]);
    if (transRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ status: 'error', message: 'Pending transaction not found' });
    }
    const transaction = transRes.rows[0];

    // 2. Compute cost and deduct from user balance
    const receivedRes = await client.query('SELECT * FROM batteries WHERE battery_id = $1', [transaction.battery_received_id]);
    
    const cost = calculateSwapCost(transaction.soc_at_return);
    
    await client.query(
        'UPDATE subscriptions SET balance = balance - $1 WHERE rider_id = $2',
        [cost, transaction.rider_id]
    );

    // 3. Update Station battery counts
    await client.query(
        'UPDATE stations SET available_count = available_count - 1 WHERE station_id = $1',
        [transaction.station_id]
    );

    // 4. Update Battery Status
    await client.query('UPDATE batteries SET status = \'CHARGING\', station_id = $1, state_of_charge = $2 WHERE battery_id = $3', [transaction.station_id, transaction.soc_at_return, transaction.battery_given_id]);
    await client.query('UPDATE batteries SET status = \'IN_USE\', station_id = NULL WHERE battery_id = $1', [transaction.battery_received_id]);

    // 5. Mark transaction complete
    const updatedTrans = await client.query(
        'UPDATE swap_transactions SET status = \'COMPLETED\', cost = $2 WHERE transaction_id = $1 RETURNING *',
        [transaction_id, cost]
    );

    // 6. Create Notification
    await client.query(
        'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)',
        [transaction.rider_id, 'SWAP_CONFIRM', `Swap completed. Cost: ${cost}. Balance updated.`]
    );

    await client.query('COMMIT');
    res.status(200).json({ status: 'success', message: 'Swap completed successfully', data: updatedTrans.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error confirming swap' });
  } finally {
    client.release();
  }
};

// @desc    Get all swap transactions (admin)
// @route   GET /api/swaps
// @access  Private/Admin
exports.getAllSwaps = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT st.*, u.full_name as rider_name, s.station_name
       FROM swap_transactions st
       LEFT JOIN users u ON st.rider_id = u.user_id
       LEFT JOIN stations s ON st.station_id = s.station_id
       ORDER BY st.swap_timestamp DESC`
    );
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving swaps' });
  }
};

// @desc    Get rider swap history
// @route   GET /api/swaps/history/:riderId
// @access  Private
exports.getSwapHistory = async (req, res) => {
  try {
    const { riderId } = req.params;
    
    if (req.user.role === 'RIDER' && req.user.user_id.toString() !== riderId) {
       return res.status(403).json({ status: 'error', message: 'Access denied' });
    }

    const history = await db.query(
        `SELECT st.*,
                s.station_name,
                bg.serial_number AS battery_given_serial,
                br.serial_number AS battery_received_serial,
                st.soc_at_return AS soc_given,
                st.cost
         FROM swap_transactions st
         LEFT JOIN stations s ON st.station_id = s.station_id
         LEFT JOIN batteries bg ON st.battery_given_id = bg.battery_id
         LEFT JOIN batteries br ON st.battery_received_id = br.battery_id
         WHERE st.rider_id = $1
         ORDER BY st.swap_timestamp DESC`,
        [riderId]
    );
    res.status(200).json({ status: 'success', data: history.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving swap history' });
  }
};
