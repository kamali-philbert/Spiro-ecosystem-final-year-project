const db = require('./config/db');

(async () => {
    try {
        const techs = await db.query("SELECT user_id, full_name FROM users WHERE role = 'TECHNICIAN'");
        console.log('--------- TECHNICIANS ---------');
        console.log(techs.rows);

        const batts = await db.query("SELECT battery_id, status, state_of_health FROM batteries WHERE status = 'FLAGGED'");
        console.log('--------- FLAGGED BATTERIES ---------');
        console.log(batts.rows);

        const tickets = await db.query("SELECT * FROM repair_tickets");
        console.log('--------- REPAIR TICKETS ---------');
        console.log(tickets.rows);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
