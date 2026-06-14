const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  submitMessage,
  getMessages,
  getMessage,
  updateMessageStatus,
  deleteMessage
} = require('../controllers/contactController');

const router = express.Router();

// Strict rate limiter for contact message submissions to prevent spam (max 5 per 15 minutes)
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many messages sent. Please wait 15 minutes before sending another message.' }
});

router.post('/', contactLimiter, submitMessage);

// Admin-only management endpoints
router.get('/', protect, authorize('admin'), getMessages);
router.get('/:id', protect, authorize('admin'), getMessage);
router.patch('/:id', protect, authorize('admin'), updateMessageStatus);
router.delete('/:id', protect, authorize('admin'), deleteMessage);

module.exports = router;
