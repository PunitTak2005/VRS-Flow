const { ContactMessage, User } = require('../models');

// @desc    Submit a new contact message
// @route   POST /api/contact
// @access  Public
exports.submitMessage = async (req, res, next) => {
  try {
    let { fullName, email, message } = req.body;

    // Sanitize and trim
    fullName = typeof fullName === 'string' ? fullName.trim() : '';
    email = typeof email === 'string' ? email.trim() : '';
    message = typeof message === 'string' ? message.trim() : '';

    // Server-side validation
    if (!fullName || !email || !message) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    if (fullName.length < 3) {
      return res.status(400).json({ success: false, error: 'Full name must be at least 3 characters long.' });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (message.length < 10) {
      return res.status(400).json({ success: false, error: 'Message must be at least 10 characters long.' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ success: false, error: 'Message cannot exceed 1000 characters.' });
    }

    // Create message in MongoDB
    const contactMessage = await ContactMessage.create({
      fullName,
      email,
      message,
      status: 'Unread'
    });

    // Admin notification dispatch removed (Notification model not available)
    // The contact message is persisted above; admins can view it via the dashboard.

    res.status(201).json({
      success: true,
      message: "Your message has been sent successfully. We'll get back to you within 24 hours.",
      data: contactMessage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Private/Admin
exports.getMessages = async (req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single contact message by ID
// @route   GET /api/contact/:id
// @access  Private/Admin
exports.getMessage = async (req, res, next) => {
  try {
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update contact message status
// @route   PATCH /api/contact/:id
// @access  Private/Admin
exports.updateMessageStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !['Unread', 'Read', 'Replied'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid message status.' });
    }

    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete contact message
// @route   DELETE /api/contact/:id
// @access  Private/Admin
exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    await ContactMessage.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};
