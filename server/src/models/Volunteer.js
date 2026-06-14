const mongoose = require('mongoose');

const VolunteerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required']
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say'],
      required: [true, 'Gender is required']
    },
    address: {
      street: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      pincode: { type: String, required: true }
    },
    emergencyContact: {
      name: { type: String, required: true },
      relation: { type: String, required: true },
      phone: { type: String, required: true }
    },
    skills: {
      type: [String],
      default: []
    },
    education: String,
    occupation: String,
    availability: {
      type: [String],
      enum: ['weekdays', 'weekends', 'evenings', 'flexible'],
      default: ['flexible']
    },
    preferredCategory: {
      type: String,
      required: [true, 'Preferred category is required']
    },
    previousExperience: String,
    languages: {
      type: [String],
      default: ['English']
    },
    profilePicture: {
      type: String,
      default: '/uploads/profile_pics/default.png'
    },
    govIdFile: String,
    motivationStatement: String,
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'more-information-required'],
      default: 'pending'
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'More Information Required'],
      default: 'Pending'
    },
    adminRemark: {
      type: String,
      default: ''
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    rejectionReason: String,
    volunteerHours: {
      type: Number,
      default: 0
    },
    badges: {
      type: [String],
      default: []
    },
    qrCodeUrl: String,
    termsAccepted: {
      type: Boolean,
      required: [true, 'Terms must be accepted']
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Volunteer', VolunteerSchema);
