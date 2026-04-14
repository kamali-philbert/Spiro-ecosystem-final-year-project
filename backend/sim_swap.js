const db = require('./config/db');

async function simulate() {
  const client = await db.pool.connect();
  try {
    // 1. Get a rider
    const userRes = await client.query('SELECT user_id FROM users WHERE role = \'RIDER\' LIMIT 1');
    if (userRes.rows.length === 0) throw new Error("No rider");
    const rider = userRes.rows[0].user_id;

    // 2. Get a station
    const stationRes = await client.query('SELECT station_id FROM stations LIMIT 1');
    if (stationRes.rows.length === 0) throw new Error("No station");
    const station = stationRes.rows[0].station_id;

    // 3. Get two batteries
    const bRes = await client.query('SELECT battery_id FROM batteries LIMIT 2');
    if (bRes.rows.length < 2) throw new Error("Not enough batteries");
    const bGiven = bRes.rows[0].battery_id;
    const bReceived = bRes.rows[1].battery_id;

    // 4. Create pending transaction
    const trans = await client.query(`
        INSERT INTO swap_transactions 
        (rider_id, station_id, battery_given_id, battery_received_id, soc_at_return, status) 
        VALUES ($1, $2, $3, $4, 15.0, 'PENDING') RETURNING *
    `, [rider, station, bGiven, bReceived]);
    
    const transaction_id = trans.rows[0].transaction_id;
    console.log('Inserted pending swap:', transaction_id);

    // NOW SIMULATE CONFIRM
    console.log('--- RUNNING CONFIRM LOGIC ---');
    await client.query('BEGIN');
    
    const transaction = trans.rows[0];

    // Compute cost
    const calculateSwapCost = (socGiven) => {
      const base = 2000;
      const surcharge = Math.max(0, (100 - socGiven) * 20);
      return Number((base + surcharge).toFixed(2));
    };
    const cost = calculateSwapCost(transaction.soc_at_return);
    console.log('Cost:', cost);

    await client.query('UPDATE subscriptions SET balance = balance - $1 WHERE rider_id = $2', [cost, transaction.rider_id]);
    console.log('Updated sub');

    await client.query('UPDATE stations SET available_count = available_count - 1 WHERE station_id = $1', [transaction.station_id]);
    console.log('Updated station');

    await client.query('UPDATE batteries SET status = \'CHARGING\', station_id = $1, state_of_charge = $2 WHERE battery_id = $3', [transaction.station_id, transaction.soc_at_return, transaction.battery_given_id]);
    console.log('Updated bat 1');

    await client.query('UPDATE batteries SET status = \'IN_USE\', station_id = NULL WHERE battery_id = $1', [transaction.battery_received_id]);
    console.log('Updated bat 2');

    const updatedTrans = await client.query('UPDATE swap_transactions SET status = \'COMPLETED\', cost = $2 WHERE transaction_id = $1 RETURNING *', [transaction_id, cost]);
    console.log('Updated trans:', updatedTrans.rows[0]);

    await client.query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [transaction.rider_id, 'SWAP_CONFIRM', `Swap completed. Cost: ${cost}. Balance updated.`]);
    console.log('Inserted notif');

    await client.query('ROLLBACK'); // rollback so we dont mess db
    console.log('SUCCESSFUL!');
  } catch (err) {
    console.error('ERROR:', err.message);
    await client.query('ROLLBACK');
  } finally {
    client.release();
    process.exit(0);
  }
}

simulate();
