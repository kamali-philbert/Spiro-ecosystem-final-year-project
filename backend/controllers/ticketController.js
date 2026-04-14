const db = require('../config/db');

exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await db.query('SELECT * FROM repair_tickets ORDER BY created_at DESC');
    res.status(200).json({ status: 'success', data: tickets.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving tickets' });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await db.query('SELECT * FROM repair_tickets WHERE ticket_id = $1', [id]);
    if (ticket.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Ticket not found' });
    res.status(200).json({ status: 'success', data: ticket.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving ticket' });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const { battery_id, issue_description, soh_before } = req.body;
    const technician_id = req.user.user_id;

    if (!battery_id || !issue_description || !soh_before) {
        return res.status(400).json({ status: 'error', message: 'Please provide battery_id, issue_description, and soh_before' });
    }

    const newTicket = await db.query(
      `INSERT INTO repair_tickets (battery_id, technician_id, issue_description, soh_before, status) 
       VALUES ($1, $2, $3, $4, 'OPEN') RETURNING *`,
      [battery_id, technician_id, issue_description, soh_before]
    );

    // Update battery status
    await db.query('UPDATE batteries SET status = \'FLAGGED\' WHERE battery_id = $1', [battery_id]);

    res.status(201).json({ status: 'success', message: 'Ticket created', data: newTicket.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error creating ticket' });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, components_replaced, soh_after, station_id } = req.body;

    const ticket_resolved_at = status === 'RESOLVED' || status === 'END_OF_LIFE' ? new Date() : null;

    const query = `
      UPDATE repair_tickets 
      SET status = COALESCE($1, status), 
          components_replaced = COALESCE($2, components_replaced),
          soh_after = COALESCE($3, soh_after),
          resolved_at = COALESCE($4, resolved_at)
      WHERE ticket_id = $5 RETURNING *`;

    const updatedTicket = await db.query(query, [status, components_replaced, soh_after, ticket_resolved_at, id]);
    if (updatedTicket.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Ticket not found' });

    // When resolved, set battery back to AVAILABLE, SoH to 50%, assign to station
    if (status === 'RESOLVED') {
      const batteryId = updatedTicket.rows[0].battery_id;
      const assignStation = station_id ? parseInt(station_id) : null;
      await db.query(
        `UPDATE batteries 
         SET status = 'AVAILABLE', state_of_health = 50,
             station_id = COALESCE($1, station_id),
             ai_severity = 'MODERATE',
             ai_recommendation = 'Battery serviced by technician. Health restored to 50%. Monitor usage and swap regularly.'
         WHERE battery_id = $2`,
        [assignStation, batteryId]
      );
      if (assignStation) {
        await db.query('UPDATE stations SET available_count = available_count + 1 WHERE station_id = $1', [assignStation]);
      }
    }

    res.status(200).json({ status: 'success', message: 'Ticket updated', data: updatedTicket.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error updating ticket' });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.query('DELETE FROM repair_tickets WHERE ticket_id = $1 RETURNING *', [id]);
    if (deleted.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Ticket not found' });
    res.status(200).json({ status: 'success', message: 'Ticket deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error deleting ticket' });
  }
};
