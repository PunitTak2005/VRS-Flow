const mongoose = require('mongoose');

const RegistrationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Volunteer',
      required: true
    },
    status: {
      type: String,
      enum: ['registered', 'attended', 'no-show'],
      default: 'registered'
    },
    hoursLogged: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate registration of a volunteer for the same event
RegistrationSchema.index({ eventId: 1, volunteerId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', RegistrationSchema);
