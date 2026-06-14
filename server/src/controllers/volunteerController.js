const bcrypt = require('bcryptjs');
const { Volunteer, User, Event, Registration, ActivityLog } = require('../models');
const { generateQRCode } = require('../services/qrService');
const { sendEmail } = require('../services/emailService');

/**
 * @desc    Get current volunteer profile
 * @route   GET /api/volunteer/profile
 * @access  Private (Volunteer only)
 */
const getProfile = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findOne({ userId: req.user._id }).populate('userId');
    if (!volunteer) {
      return res.status(404).json({ success: false, error: 'Volunteer profile not found' });
    }
    res.status(200).json({ success: true, volunteer });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update volunteer profile
 * @route   PUT /api/volunteer/profile
 * @access  Private (Volunteer only)
 */
const updateProfile = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findOne({ userId: req.user._id });
    if (!volunteer) {
      return res.status(404).json({ success: false, error: 'Volunteer profile not found' });
    }

    const {
      name,
      phoneNumber,
      gender,
      dob,
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
      motivationStatement
    } = req.body;

    // Update User model fields
    if (name) {
      await User.findByIdAndUpdate(req.user._id, { name });
    }

    // Handle profile image upload
    let profilePicture = volunteer.profilePicture;
    if (req.file) {
      profilePicture = `/uploads/profile_pics/${req.file.filename}`;
    }

    const updateData = {
      phoneNumber: phoneNumber || volunteer.phoneNumber,
      gender: gender || volunteer.gender,
      dob: dob ? new Date(dob) : volunteer.dob,
      address: {
        street: street || volunteer.address.street,
        city: city || volunteer.address.city,
        state: state || volunteer.address.state,
        country: country || volunteer.address.country,
        pincode: pincode || volunteer.address.pincode
      },
      emergencyContact: {
        name: emergencyName || volunteer.emergencyContact.name,
        relation: emergencyRelation || volunteer.emergencyContact.relation,
        phone: emergencyPhone || volunteer.emergencyContact.phone
      },
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : volunteer.skills),
      education: education || volunteer.education,
      occupation: occupation || volunteer.occupation,
      availability: Array.isArray(availability) ? availability : (availability ? [availability] : volunteer.availability),
      preferredCategory: preferredCategory || volunteer.preferredCategory,
      previousExperience: previousExperience || volunteer.previousExperience,
      languages: Array.isArray(languages) ? languages : (languages ? languages.split(',').map(l => l.trim()) : volunteer.languages),
      profilePicture,
      motivationStatement: motivationStatement || volunteer.motivationStatement
    };

    const updatedVolunteer = await Volunteer.findByIdAndUpdate(volunteer._id, updateData, { new: true }).populate('userId');

    // Audit Log
    await ActivityLog.create({
      userId: req.user._id,
      action: 'update_profile',
      details: `Volunteer profile updated for: ${req.user.email}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, volunteer: updatedVolunteer });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get events volunteer is registered for
 * @route   GET /api/volunteer/events
 * @access  Private (Volunteer only)
 */
const getAppliedEvents = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findOne({ userId: req.user._id });
    if (!volunteer) {
      return res.status(404).json({ success: false, error: 'Volunteer profile not found' });
    }

    const registrations = await Registration.find({ volunteerId: volunteer._id }).populate('eventId');
    res.status(200).json({ success: true, registrations });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register for an event
 * @route   POST /api/volunteer/events/:id/register
 * @access  Private (Volunteer only)
 */
const registerForEvent = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findOne({ userId: req.user._id });
    if (!volunteer) {
      return res.status(404).json({ success: false, error: 'Volunteer profile not found' });
    }

    if (volunteer.approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'Your registration is not approved yet. Only approved volunteers can register for events.'
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    if (event.status !== 'upcoming') {
      return res.status(400).json({ success: false, error: 'Cannot register for a non-upcoming event' });
    }

    // Check capacity
    const regCount = await Registration.countDocuments({ eventId: event._id });
    if (regCount >= event.capacity) {
      return res.status(400).json({ success: false, error: 'This event is already at full capacity' });
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({
      eventId: event._id,
      volunteerId: volunteer._id
    });

    if (existingRegistration) {
      return res.status(400).json({ success: false, error: 'You are already registered for this event' });
    }

    // Create Registration
    const registration = await Registration.create({
      eventId: event._id,
      volunteerId: volunteer._id,
      status: 'registered'
    });

    // Assign volunteer to event array
    await Event.findByIdAndUpdate(event._id, {
      $push: { assignedVolunteers: volunteer._id }
    });

    // Send confirmation email
    await sendEmail({
      to: req.user.email,
      subject: `Event Registration Confirmation: ${event.title}`,
      text: `Hello ${req.user.name},\n\nYou have successfully registered for the event: ${event.title}.\nDate: ${new Date(event.date).toLocaleDateString()}\nTime: ${event.startTime} - ${event.endTime}\nLocation: ${event.location}\n\nThank you for volunteering!\n\nBest regards,\nVolunteer System Team`
    });

    // Audit Log
    await ActivityLog.create({
      userId: req.user._id,
      action: 'register_event',
      details: `Registered for event ${event.title} (ID: ${event._id})`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, registration });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel event registration
 * @route   DELETE /api/volunteer/events/:id/cancel
 * @access  Private (Volunteer only)
 */
const cancelEventRegistration = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findOne({ userId: req.user._id });
    if (!volunteer) {
      return res.status(404).json({ success: false, error: 'Volunteer profile not found' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Find and delete registration
    const registration = await Registration.findOneAndDelete({
      eventId: event._id,
      volunteerId: volunteer._id
    });

    if (!registration) {
      return res.status(400).json({ success: false, error: 'You are not registered for this event' });
    }

    // Pull from Event's assigned array
    await Event.findByIdAndUpdate(event._id, {
      $pull: { assignedVolunteers: volunteer._id }
    });

    // Audit Log
    await ActivityLog.create({
      userId: req.user._id,
      action: 'cancel_event_registration',
      details: `Cancelled registration for event ${event.title}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Registration cancelled successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate QR Code and get Volunteer ID Card data
 * @route   GET /api/volunteer/idcard
 * @access  Private (Volunteer only)
 */
const getIDCardData = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findOne({ userId: req.user._id }).populate('userId');
    if (!volunteer) {
      return res.status(404).json({ success: false, error: 'Volunteer profile not found' });
    }

    // Generate QR payload containing verification info
    const qrPayload = {
      volunteerId: volunteer._id,
      name: req.user.name,
      email: req.user.email,
      role: 'volunteer',
      status: volunteer.approvalStatus
    };

    const qrCodeUrl = await generateQRCode(qrPayload);

    // Save QR Code URL
    await Volunteer.findByIdAndUpdate(volunteer._id, { qrCodeUrl });

    res.status(200).json({
      success: true,
      card: {
        volunteerId: volunteer._id,
        name: req.user.name,
        email: req.user.email,
        phone: volunteer.phoneNumber,
        phoneNumber: volunteer.phoneNumber,
        preferredCategory: volunteer.preferredCategory,
        profilePicture: volunteer.profilePicture,
        approvalStatus: volunteer.approvalStatus,
        qrCodeUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change logged-in user password
 * @route   PUT /api/volunteer/change-password
 * @access  Private (Volunteer/Admin)
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(req.user._id, { password: hashedPassword });

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete volunteer account
 * @route   DELETE /api/volunteer/delete-account
 * @access  Private (Volunteer only)
 */
const deleteAccount = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findOne({ userId: req.user._id });
    if (!volunteer) {
      return res.status(404).json({ success: false, error: 'Volunteer profile not found' });
    }

    // 1. Delete associated registrations
    await Registration.deleteMany({ volunteerId: volunteer._id });
    
    // 2. Remove volunteer from any events assignedVolunteers list
    await Event.updateMany(
      { assignedVolunteers: volunteer._id },
      { $pull: { assignedVolunteers: volunteer._id } }
    );

    // 4. Delete Volunteer Profile
    await Volunteer.findByIdAndDelete(volunteer._id);

    // 5. Delete User Profile
    await User.findByIdAndDelete(req.user._id);

    res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getAppliedEvents,
  registerForEvent,
  cancelEventRegistration,
  getIDCardData,
  changePassword,
  deleteAccount
};
