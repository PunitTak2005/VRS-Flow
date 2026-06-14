const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, Volunteer, ActivityLog } = require('../models');
// OTP model import removed
const { sendEmail } = require('../services/emailService');
const { getPasswordResetOTPTemplate } = require('../templates/emailTemplate');
// sendSms import removed

// Helper to sign JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'volunteersystem_super_secret_dev_key_123!', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

/**
 * @desc    Register a new volunteer profile
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerVolunteer = async (req, res, next) => {
  console.log('RegisterVolunteer called with body:', req.body);
  console.log('Files:', req.files);
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      dob,
      gender,
      street,
      city,
      state,
      country,
      pincode,
      emergencyName,
      emergencyRelation,
      emergencyPhone,
      skills,
      education,
      occupation,
      availability,
      preferredCategory,
      previousExperience,
      languages,
      motivationStatement,
      termsAccepted
    } = req.body;

    // Manual field validation to prevent Mongoose Validation Errors and return friendly JSON error responses
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Name is required.', error: 'Name is required.' });
    }
    if (!email || email.trim() === '') {
      return res.status(400).json({ success: false, message: 'Email is required.', error: 'Email is required.' });
    }
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please add a valid email.', error: 'Please add a valid email.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.', error: 'Password must be at least 6 characters.' });
    }
    if (!phoneNumber || phoneNumber.trim() === '') {
      return res.status(400).json({ success: false, message: 'Phone number is required.', error: 'Phone number is required.' });
    }
    if (!dob) {
      return res.status(400).json({ success: false, message: 'Date of birth is required.', error: 'Date of birth is required.' });
    }
    const parsedDob = new Date(dob);
    if (isNaN(parsedDob.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid Date of birth.', error: 'Invalid Date of birth.' });
    }
    if (!gender || !['male', 'female', 'other', 'prefer-not-to-say'].includes(gender)) {
      return res.status(400).json({ success: false, message: 'Gender is required.', error: 'Gender is required.' });
    }
    if (!city || city.trim() === '') {
      return res.status(400).json({ success: false, message: 'City is required.', error: 'City is required.' });
    }
    if (!state || state.trim() === '') {
      return res.status(400).json({ success: false, message: 'State is required.', error: 'State is required.' });
    }
    if (!country || country.trim() === '') {
      return res.status(400).json({ success: false, message: 'Country is required.', error: 'Country is required.' });
    }
    if (!pincode || pincode.trim() === '') {
      return res.status(400).json({ success: false, message: 'Pincode is required.', error: 'Pincode is required.' });
    }
    if (!emergencyName || emergencyName.trim() === '') {
      return res.status(400).json({ success: false, message: 'Emergency contact name is required.', error: 'Emergency contact name is required.' });
    }
    if (!emergencyRelation || emergencyRelation.trim() === '') {
      return res.status(400).json({ success: false, message: 'Emergency contact relation is required.', error: 'Emergency contact relation is required.' });
    }
    if (!emergencyPhone || emergencyPhone.trim() === '') {
      return res.status(400).json({ success: false, message: 'Emergency contact phone number is required.', error: 'Emergency contact phone number is required.' });
    }
    if (!preferredCategory) {
      return res.status(400).json({ success: false, message: 'Preferred category is required.', error: 'Preferred category is required.' });
    }
    if (termsAccepted !== 'true' && termsAccepted !== true) {
      return res.status(400).json({ success: false, message: 'Terms must be accepted.', error: 'Terms must be accepted.' });
    }

    // 1. Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already registered', error: 'Email already registered' });
    }

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create User
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'volunteer',
      isEmailVerified: true
    });

    console.log(`Registration saved successfully in DB for user: ${email}`);

    // Handle uploaded files
    let profilePicture = '/uploads/profile_pics/default.png';
    let govIdFile = '';

    if (req.files) {
      if (req.files.profilePicture) {
        profilePicture = `/uploads/profile_pics/${req.files.profilePicture[0].filename}`;
      }
      if (req.files.govIdFile) {
        govIdFile = `/uploads/gov_ids/${req.files.govIdFile[0].filename}`;
      }
    }

    // 4. Create Volunteer profile linked to User
    const volunteer = await Volunteer.create({
      userId: user._id,
      phoneNumber,
      dob: parsedDob,
      gender,
      address: { street, city, state, country, pincode },
      emergencyContact: { name: emergencyName, relation: emergencyRelation, phone: emergencyPhone },
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []),
      education,
      occupation,
      availability: Array.isArray(availability) ? availability : (availability ? [availability] : []),
      preferredCategory,
      previousExperience,
      languages: Array.isArray(languages) ? languages : (languages ? languages.split(',').map(l => l.trim()) : []),
      profilePicture,
      govIdFile,
      motivationStatement,
      termsAccepted: termsAccepted === 'true' || termsAccepted === true
    });

    // 5. Audit Log
    await ActivityLog.create({
      action: 'volunteer_registration',
      details: `New volunteer registered: ${user.email}`,
      ipAddress: req.ip
    });

    // 7. Send Response
    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      volunteer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user (volunteer or admin)
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    // Check user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Get Volunteer profile if role is volunteer
    let volunteer = null;
    if (user.role === 'volunteer') {
      volunteer = await Volunteer.findOne({ userId: user._id });
    }

    // Sign Token
    const token = generateToken(user._id);

    // Set cookie if remember me is active
    if (rememberMe) {
      res.cookie('token', token, {
        httpOnly: true,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
    }

    // Audit Log
    await ActivityLog.create({
      userId: user._id,
      action: 'user_login',
      details: `${user.role} logged in: ${user.email}`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      volunteer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user profile details
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let volunteer = null;

    if (user.role === 'volunteer') {
      volunteer = await Volunteer.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      user,
      volunteer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot Password (legacy OTP flow — kept for backward compat)
 * @route   POST /api/auth/forgotpassword
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, error: 'There is no user with that email' });
    }

    const resetOTP = Math.floor(100000 + Math.random() * 900000).toString();

    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: resetOTP,
      resetPasswordExpires: Date.now() + 10 * 60 * 1000
    });

    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset OTP Code',
        text: `Your OTP code for password reset is: ${resetOTP}.\nIt will expire in 10 minutes.`
      });
      res.status(200).json({ success: true, message: 'Password reset OTP sent to email' });
    } catch (err) {
      console.warn(`Failed to send OTP email: ${err.message}`);
      res.status(500).json({ success: false, error: 'Failed to send reset email. Please try again.' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot Password — OTP-based flow
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPasswordOTP = async (req, res, next) => {
  // Generic response for ALL outcomes — never reveal whether the email exists
  const GENERIC_SUCCESS = {
    success: true,
    message: 'If an account exists for this email, an OTP has been sent.'
  };

  try {
    const { email } = req.body;

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // No user → still return generic success
    if (!user) {
      return res.status(200).json(GENERIC_SUCCESS);
    }

    // Generate 6-digit OTP and hash it for storage
    const rawOTP = String(Math.floor(100000 + Math.random() * 900000));
    const hashedOTP = crypto.createHash('sha256').update(rawOTP).digest('hex');
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    await User.findByIdAndUpdate(user._id, {
      passwordResetOTP: hashedOTP,
      passwordResetOTPExpires: expiry
    });

    const htmlBody = getPasswordResetOTPTemplate({
      userName: user.name,
      otp: rawOTP,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@volunteersystem.com'
    });

    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset OTP',
        html: htmlBody
      });
    } catch (emailErr) {
      // Roll back OTP so user can request again cleanly
      await User.findByIdAndUpdate(user._id, {
        passwordResetOTP: undefined,
        passwordResetOTPExpires: undefined
      });
      console.error(`Failed to send OTP email to ${user.email}: ${emailErr.message}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again later.'
      });
    }

    await ActivityLog.create({
      userId: user._id,
      action: 'forgot_password_otp_request',
      details: `Password reset OTP requested for: ${user.email}`,
      ipAddress: req.ip
    });

    return res.status(200).json(GENERIC_SUCCESS);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset Password — verify OTP and set new password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPasswordOTP = async (req, res, next) => {
  try {
    const { email, otp, password, confirmPassword } = req.body;

    // 1. Basic presence checks
    if (!email || !otp || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, password, and confirm password are all required.'
      });
    }

    // 2. Passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    // 3. Password strength (min 8 chars, at least one digit)
    if (password.length < 8 || !/\d/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and contain at least one number.'
      });
    }

    // 4. OTP format (6 digits)
    if (!/^\d{6}$/.test(otp.trim())) {
      return res.status(400).json({ success: false, message: 'OTP must be a 6-digit number.' });
    }

    // 5. Hash the incoming OTP and look up user
    const hashedOTP = crypto.createHash('sha256').update(otp.trim()).digest('hex');

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      passwordResetOTP: hashedOTP,
      passwordResetOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'The OTP is invalid or has expired. Please request a new one.'
      });
    }

    // 6. Hash new password and save; clear OTP fields (one-time use)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      passwordResetOTP: undefined,
      passwordResetOTPExpires: undefined
    });

    await ActivityLog.create({
      userId: user._id,
      action: 'password_reset',
      details: `Password reset via OTP for user: ${user.email}`,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend Password Reset OTP
 * @route   POST /api/auth/resend-reset-otp
 * @access  Public
 */
const resendResetOTP = async (req, res, next) => {
  const GENERIC_SUCCESS = {
    success: true,
    message: 'If an account exists for this email, a new OTP has been sent.'
  };

  try {
    const { email } = req.body;

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(200).json(GENERIC_SUCCESS);
    }

    // Generate fresh OTP — invalidates any previous one
    const rawOTP = String(Math.floor(100000 + Math.random() * 900000));
    const hashedOTP = crypto.createHash('sha256').update(rawOTP).digest('hex');
    const expiry = Date.now() + 10 * 60 * 1000;

    await User.findByIdAndUpdate(user._id, {
      passwordResetOTP: hashedOTP,
      passwordResetOTPExpires: expiry
    });

    const htmlBody = getPasswordResetOTPTemplate({
      userName: user.name,
      otp: rawOTP,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@volunteersystem.com'
    });

    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset OTP (Resent)',
        html: htmlBody
      });
    } catch (emailErr) {
      await User.findByIdAndUpdate(user._id, {
        passwordResetOTP: undefined,
        passwordResetOTPExpires: undefined
      });
      console.error(`Failed to resend OTP to ${user.email}: ${emailErr.message}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to resend OTP. Please try again later.'
      });
    }

    return res.status(200).json(GENERIC_SUCCESS);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset Password using OTP code
 * @route   POST /api/auth/resetpassword
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordToken: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP code' });
    }

    // Hash New Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined
    });

    // Audit Log
    await ActivityLog.create({
      userId: user._id,
      action: 'password_reset',
      details: `Password reset successfully for user: ${user.email}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Simulated Google OAuth integration
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleLogin = async (req, res, next) => {
  try {
    const { email, name, googleId } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      // Create a user for social register
      const randomPassword = Math.random().toString(36).substring(2, 12);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'volunteer',
        isEmailVerified: true
      });

      // Initialize an empty volunteer profile that they can complete later
      await Volunteer.create({
        userId: user._id,
        phone: 'Not provided',
        dob: new Date('2000-01-01'),
        gender: 'prefer-not-to-say',
        address: { city: 'Not provided', state: 'Not provided', country: 'Not provided', pincode: 'Not provided' },
        emergencyContact: { name: 'Not provided', relation: 'Not provided', phone: 'Not provided' },
        preferredCategory: 'Other',
        termsAccepted: true
      });
    }

    const volunteer = await Volunteer.findOne({ userId: user._id });
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      volunteer
    });
  } catch (error) {
    next(error);
  }
};
// OTP functionality removed

module.exports = {
  registerVolunteer,
  login,
  getMe,
  forgotPassword,
  forgotPasswordOTP,
  resetPassword,
  resetPasswordOTP,
  resendResetOTP,
  googleLogin,
  // sendOtp,
  // verifyOtp
};










