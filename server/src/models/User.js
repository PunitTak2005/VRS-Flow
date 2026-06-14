const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,6})+$/,
        'Please add a valid email'
      ],
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ['volunteer', 'admin'],
      default: 'volunteer'
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    },
    verificationOTP: String,
    otpExpiry: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    // OTP-based password reset fields
    passwordResetOTP: String,
    passwordResetOTPExpires: Date,
    phoneNumber: String,
    status: {
      type: String,
      default: 'Active'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', UserSchema);
