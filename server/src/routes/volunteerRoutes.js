const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getAppliedEvents,
  registerForEvent,
  cancelEventRegistration,
  getIDCardData,
  changePassword,
  deleteAccount
} = require('../controllers/volunteerController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// All volunteer routes are protected
router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', upload.single('profilePicture'), updateProfile);
router.get('/events', getAppliedEvents);
router.post('/events/:id/register', registerForEvent);
router.delete('/events/:id/cancel', cancelEventRegistration);
router.get('/idcard', getIDCardData);
router.put('/change-password', changePassword);
router.delete('/delete-account', deleteAccount);

module.exports = router;
