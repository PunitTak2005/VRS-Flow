const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Event description is required']
    },
    category: {
      type: String,
      required: [true, 'Event category is required']
    },
    skillsRequired: {
      type: [String],
      default: []
    },
    date: {
      type: Date,
      required: [true, 'Event date is required']
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required']
    },
    location: {
      type: String,
      required: [true, 'Location/Platform is required']
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required']
    },
    status: {
      type: String,
      enum: ['upcoming', 'completed', 'cancelled'],
      default: 'upcoming'
    },
    image: {
      type: String,
      default: '/uploads/event_pics/default.png'
    },
    assignedVolunteers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Volunteer'
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Event', EventSchema);
