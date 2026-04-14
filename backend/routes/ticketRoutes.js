const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Only Admin and Tech should access these
router.use(roleMiddleware(['ADMIN', 'TECHNICIAN']));

router.route('/')
  .get(ticketController.getAllTickets)
  .post(ticketController.createTicket);

router.route('/:id')
  .get(ticketController.getTicketById)
  .put(ticketController.updateTicket)
  .delete(roleMiddleware(['ADMIN']), ticketController.deleteTicket);

module.exports = router;
