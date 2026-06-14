const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  logAttendance
} = require('../controllers/eventController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Public routes
router.get('/', getEvents);
router.get('/:id', getEvent);

// Admin-only event management routes
router.post('/', protect, authorize('admin'), upload.single('eventImage'), createEvent);
router.put('/:id', protect, authorize('admin'), upload.single('eventImage'), updateEvent);
router.delete('/:id', protect, authorize('admin'), deleteEvent);
router.put('/:id/attendance/:registrationId', protect, authorize('admin'), logAttendance);

module.exports = router;
