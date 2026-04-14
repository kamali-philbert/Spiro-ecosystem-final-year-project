const db = require('../config/db');

exports.ingestTelemetry = async (req, res) => {
  try {
    const { battery_id, voltage, temperature, current, internal_resistance, soc } = req.body;

    if (!battery_id || voltage === undefined || temperature === undefined || current === undefined || internal_resistance === undefined || soc === undefined) {
      return res.status(400).json({ status: 'error', message: 'Missing telemetry data fields' });
    }

    // Insert log
    const result = await db.query(
      `INSERT INTO telemetry_logs (battery_id, voltage, temperature, current, internal_resistance, soc) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [battery_id, voltage, temperature, current, internal_resistance, soc]
    );

    let soh = 100.0;
    let flagForMaintenance = false;

    // Call AI Service for SoH Prediction
    try {
      const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const aiResponse = await fetch(`${aiUrl}/predict/soh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voltage, temperature, current, internal_resistance, soc })
      });
      
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        soh = aiData.predicted_soh;
        flagForMaintenance = aiData.flag_for_maintenance;
        // Store recommendation on battery record
        await db.query(
          'UPDATE batteries SET ai_severity = $1, ai_recommendation = $2 WHERE battery_id = $3',
          [aiData.severity, aiData.recommendation, battery_id]
        ).catch(() => {}); // ignore if columns don't exist yet
      } else {
        console.error('AI Service Error:', await aiResponse.text());
      }
    } catch (aiErr) {
      console.error('Failed to communicate with AI Service:', aiErr.message);
    }

    // Update battery's current SoC and SoH
    await db.query('UPDATE batteries SET state_of_charge = $1, state_of_health = $2 WHERE battery_id = $3', [soc, soh, battery_id]);

    // If SoH is below 20%, process maintenance flagging
    if (flagForMaintenance) {
      // Mark battery as FLAGGED
      await db.query("UPDATE batteries SET status = 'FLAGGED' WHERE battery_id = $1", [battery_id]);
      
      // Check if an OPEN or IN_PROGRESS ticket already exists
      const existingTicket = await db.query(
        "SELECT * FROM repair_tickets WHERE battery_id = $1 AND status IN ('OPEN', 'IN_PROGRESS')",
        [battery_id]
      );
      
      if (existingTicket.rows.length === 0) {
        // Find a technician to assign
        const techs = await db.query("SELECT user_id FROM users WHERE role = 'TECHNICIAN' LIMIT 1");
        
        if (techs.rows.length > 0) {
          const technicianId = techs.rows[0].user_id;
          await db.query(
            `INSERT INTO repair_tickets (battery_id, technician_id, issue_description, soh_before, status)
             VALUES ($1, $2, $3, $4, $5)`,
            [battery_id, technicianId, 'AI Predictive Maintenance: Battery SoH dropped below critical threshold (20%).', soh, 'OPEN']
          );
        } else {
          console.error("Could not create repair ticket: No technician found in DB.");
        }
      }
    }

    res.status(201).json({ status: 'success', message: 'Telemetry logged and evaluated', data: result.rows[0], soh });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error ingesting telemetry' });
  }
};

exports.getBatteryTelemetryLogs = async (req, res) => {
  try {
    const { batteryId } = req.params;
    
    const logs = await db.query(
      'SELECT * FROM telemetry_logs WHERE battery_id = $1 ORDER BY recorded_at DESC LIMIT 100',
      [batteryId]
    );

    res.status(200).json({ status: 'success', data: logs.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: 'Server Error retrieving telemetry logs' });
  }
};
