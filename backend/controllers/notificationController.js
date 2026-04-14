const db = require('../config/db');

exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.role !== 'ADMIN' && req.user.user_id.toString() !== userId) {
        return res.status(403).json({ status: 'error', message: 'Access denied' });
    }

    const notifications = await db.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
    );

    res.status(200).json({ status: 'success', data: notifications.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notif = await db.query('SELECT user_id FROM notifications WHERE notification_id = $1', [id]);
    
    if (notif.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Notification not found' });
    
    if (req.user.role !== 'ADMIN' && req.user.user_id.toString() !== notif.rows[0].user_id.toString()) {
        return res.status(403).json({ status: 'error', message: 'Access denied' });
    }

    const updated = await db.query(
        'UPDATE notifications SET is_read = true WHERE notification_id = $1 RETURNING *',
        [id]
    );

    res.status(200).json({ status: 'success', message: 'Notification marked as read', data: updated.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error updating notification' });
  }
};
