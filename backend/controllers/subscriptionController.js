const db = require('../config/db');

// GET /api/subscriptions/:userId
exports.getSubscription = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.role === 'RIDER' && req.user.user_id.toString() !== userId) {
      return res.status(403).json({ status: 'error', message: 'Access denied' });
    }

    const result = await db.query(
      'SELECT * FROM subscriptions WHERE rider_id = $1 AND is_active = true ORDER BY subscription_id DESC LIMIT 1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No active subscription found' });
    }

    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving subscription' });
  }
};

// GET /api/subscriptions — all subscriptions (Admin)
exports.getAllSubscriptions = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, u.full_name, u.email 
      FROM subscriptions s
      JOIN users u ON s.rider_id = u.user_id
      ORDER BY s.subscription_id DESC
    `);
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// POST /api/subscriptions — create subscription (Admin)
exports.createSubscription = async (req, res) => {
  try {
    const { rider_id, plan_type, balance, expiry_date } = req.body;

    if (!rider_id || !plan_type || balance === undefined || !expiry_date) {
      return res.status(400).json({ status: 'error', message: 'Please provide rider_id, plan_type, balance, and expiry_date' });
    }

    // Deactivate any existing subscription for this rider
    await db.query('UPDATE subscriptions SET is_active = false WHERE rider_id = $1', [rider_id]);

    const result = await db.query(
      `INSERT INTO subscriptions (rider_id, plan_type, balance, expiry_date, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [rider_id, plan_type, balance, expiry_date]
    );

    if (parseFloat(balance) > 0) {
      await db.query(
        `INSERT INTO payments (collector_id, rider_id, amount) VALUES ($1, $2, $3)`,
        [req.user.user_id, rider_id, balance]
      );
    }

    res.status(201).json({ status: 'success', message: 'Subscription created', data: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error creating subscription' });
  }
};

// DELETE /api/subscriptions/:id — deactivate (Admin)
exports.deactivateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE subscriptions SET is_active = false WHERE subscription_id = $1', [id]);
    res.status(200).json({ status: 'success', message: 'Subscription deactivated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};

// PUT /api/subscriptions/:id/topup — add balance (Admin)
exports.topUpBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ status: 'error', message: 'Invalid amount' });
    const result = await db.query(
      'UPDATE subscriptions SET balance = balance + $1 WHERE subscription_id = $2 RETURNING *',
      [amount, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Subscription not found' });

    // Log the payment
    await db.query(
      `INSERT INTO payments (collector_id, rider_id, amount) VALUES ($1, $2, $3)`,
      [req.user.user_id, result.rows[0].rider_id, amount]
    );
    res.status(200).json({ status: 'success', message: `Balance topped up by ${amount} RWF`, data: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
};
