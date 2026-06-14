const mongoose = require('mongoose');

const ContactMessageSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      minlength: [3, 'Name must be at least 3 characters']
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
      minlength: [10, 'Message must be at least 10 characters'],
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: ['Unread', 'Read', 'Replied'],
      default: 'Unread'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ContactMessage', ContactMessageSchema);
