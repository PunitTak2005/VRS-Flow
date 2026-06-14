const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  registerVolunteer,
  login,
  getMe,
  forgotPassword,
  forgotPasswordOTP,
  resetPassword,
  resetPasswordOTP,
  resendResetOTP,
  googleLogin,

} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

// Forgot password: max 5 requests per 15 min per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again in 15 minutes.'
  }
});

// Resend OTP: max 3 resends per 5 min per IP (one resend every ~100 seconds on average)
const resendOTPLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many resend attempts. Please wait before requesting another OTP.'
  }
});

// ---------------------------------------------------------------------------
// File upload handler for registration
// ---------------------------------------------------------------------------
const registerUploads = (req, res, next) => {
  upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'govIdFile', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      let errMsg = err.message || 'Unsupported file type. Please upload JPG, PNG, PDF, DOC or DOCX.';
      if (err.code === 'LIMIT_FILE_SIZE') {
        errMsg = 'File is too large. Maximum size allowed is 10MB.';
      }
      return res.status(400).json({
        success: false,
        message: errMsg,
        error: errMsg
      });
    }
    next();
  });
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.post('/register', registerUploads, registerVolunteer);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/google', googleLogin);

// Legacy OTP flow (kept for backward compatibility)
router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword', resetPassword);

// OTP-based password reset (primary flow)
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordOTP);
router.post('/reset-password', resetPasswordOTP);
router.post('/resend-reset-otp', resendOTPLimiter, resendResetOTP);

// OTP routes removed - functionality deprecated
module.exports = router;
