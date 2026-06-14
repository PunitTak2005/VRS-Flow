const bcrypt = require('bcryptjs');
const { Volunteer, User, Event, Registration, Category, Skill, ActivityLog, Announcement } = require('../models');
const { sendEmail } = require('../services/emailService');
const { generateQRCode } = require('../services/qrService');

/**
 * @desc    Get Admin Dashboard Statistics
 * @route   GET /api/admin/stats
 * @access  Private (Admin only)
 */
const getDashboardStats = async (req, res, next) => {
  try {
    // 1. Volunteer Counts
    const totalVolunteers = await Volunteer.countDocuments();
    const pendingVolunteers = await Volunteer.countDocuments({ approvalStatus: 'pending' });
    const approvedVolunteers = await Volunteer.countDocuments({ approvalStatus: 'approved' });
    const rejectedVolunteers = await Volunteer.countDocuments({ approvalStatus: 'rejected' });

    // 2. Event Counts
    const totalEvents = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({ status: 'upcoming' });
    const completedEvents = await Event.countDocuments({ status: 'completed' });

    // 3. Recent Registrations (limit to 5)
    const recentRegistrations = await Volunteer.find()
      .populate('userId')
      .sort('-createdAt')
      .limit(5);

    // 4. Monthly Registration velocity (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // Aggregation for registration trends
    const trends = await Volunteer.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format trends data for ChartJS
    const chartData = trends.map(t => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        label: `${monthNames[t._id.month - 1]} ${t._id.year}`,
        value: t.count
      };
    });

    res.status(200).json({
      success: true,
      stats: {
        volunteers: { total: totalVolunteers, pending: pendingVolunteers, approved: approvedVolunteers, rejected: rejectedVolunteers },
        events: { total: totalEvents, upcoming: upcomingEvents, completed: completedEvents }
      },
      recentRegistrations,
      registrationTrends: chartData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all volunteers with filtering, search, sorting and pagination
 * @route   GET /api/admin/volunteers
 * @access  Private (Admin only)
 */
const getVolunteers = async (req, res, next) => {
  try {
    const { search, status, skill, category, city, state, sort, page = 1, limit = 10 } = req.query;

    const query = {};

    // 1. Approval status filter
    if (status) {
      query.approvalStatus = status;
    }

    // 2. Skill filter
    if (skill) {
      query.skills = skill;
    }

    // 3. Category filter
    if (category) {
      query.preferredCategory = category;
    }

    // 4. City/State filters
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }
    if (state) {
      query['address.state'] = new RegExp(state, 'i');
    }

    // 5. Search by name or email (needs populating User or mapping matches first)
    if (search) {
      // Find matching users first
      const users = await User.find({
        $or: [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') }
        ]
      });
      const userIds = users.map(u => u._id);
      
      query.$or = [
        { userId: { $in: userIds } },
        { phone: new RegExp(search, 'i') }
      ];
    }

    // 6. Pagination setup
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // 7. Sort setup
    let sortOption = '-createdAt';
    if (sort) {
      sortOption = sort;
    }

    const volunteers = await Volunteer.find(query)
      .populate('userId')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    const total = await Volunteer.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      volunteers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve or Reject volunteer registration
 * @route   PUT /api/admin/volunteers/:id/status
 * @access  Private (Admin only)
 */
const updateVolunteerStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid approval status' });
    }

    const volunteer = await Volunteer.findById(req.params.id).populate('userId');
    if (!volunteer) {
      return res.status(404).json({ success: false, error: 'Volunteer not found' });
    }

    const updateData = { approvalStatus: status };
    if (status === 'rejected') {
      updateData.rejectionReason = rejectionReason || 'Does not match requirement criteria.';
    }

    // Generate and save QR code if approved and not yet generated
    if (status === 'approved') {
      const qrPayload = {
        volunteerId: volunteer._id,
        name: volunteer.userId.name,
        email: volunteer.userId.email,
        role: 'volunteer',
        status: 'approved'
      };
      updateData.qrCodeUrl = await generateQRCode(qrPayload);
    }

    const updated = await Volunteer.findByIdAndUpdate(volunteer._id, updateData, { new: true }).populate('userId');

    // Send email
    await sendEmail({
      to: volunteer.userId.email,
      subject: `Volunteer Application ${status.toUpperCase()}`,
      text: `Hello ${volunteer.userId.name},\n\nYour application has been ${status}.\n\n` + 
        (status === 'approved' 
          ? 'Log in to your dashboard to view events and download your volunteer ID.' 
          : `Rejection reason: ${rejectionReason || 'No reason provided.'}`) + 
        `\n\nBest regards,\nVolunteer System Team`
    });

    // Audit Log
    await ActivityLog.create({
      userId: req.user._id,
      action: `approve_volunteer_status_${status}`,
      details: `${status.toUpperCase()} volunteer profile for user: ${volunteer.userId.email}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, volunteer: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin creates a volunteer directly
 * @route   POST /api/admin/volunteers
 * @access  Private (Admin only)
 */
const createVolunteer = async (req, res, next) => {
  try {
    const { name, email, password, phone, phoneNumber, dob, gender, city, state, country, pincode, preferredCategory } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'Volunteer123!', salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'volunteer',
      isEmailVerified: true
    });

    const volunteer = await Volunteer.create({
      userId: user._id,
      phoneNumber: phoneNumber || phone,
      dob: new Date(dob || '2000-01-01'),
      gender: gender || 'prefer-not-to-say',
      address: { city: city || 'Not specified', state: state || 'Not specified', country: country || 'Not specified', pincode: pincode || '000000' },
      emergencyContact: { name: 'Admin', relation: 'Admin', phone: '000-000-0000' },
      preferredCategory: preferredCategory || 'Community',
      approvalStatus: 'approved',
      termsAccepted: true
    });

    // Generate QR
    const qrPayload = { volunteerId: volunteer._id, name: user.name, email: user.email, role: 'volunteer', status: 'approved' };
    const qrCodeUrl = await generateQRCode(qrPayload);
    await Volunteer.findByIdAndUpdate(volunteer._id, { qrCodeUrl });

    res.status(201).json({ success: true, volunteer });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin edits a volunteer profile
 * @route   PUT /api/admin/volunteers/:id
 * @access  Private (Admin only)
 */
const updateVolunteer = async (req, res, next) => {
  try {
    const { name, phoneNumber, gender, preferredCategory, approvalStatus } = req.body;
    
    const volunteer = await Volunteer.findById(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ success: false, error: 'Volunteer not found' });
    }

    if (name) {
      await User.findByIdAndUpdate(volunteer.userId, { name });
    }

    const updateFields = {
      phoneNumber: phoneNumber || volunteer.phoneNumber,
      gender: gender || volunteer.gender,
      preferredCategory: preferredCategory || volunteer.preferredCategory,
      approvalStatus: approvalStatus || volunteer.approvalStatus
    };

    const updated = await Volunteer.findByIdAndUpdate(volunteer._id, updateFields, { new: true }).populate('userId');

    res.status(200).json({ success: true, volunteer: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete volunteer profile and associated User record
 * @route   DELETE /api/admin/volunteers/:id
 * @access  Private (Admin only)
 */
const deleteVolunteer = async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ success: false, error: 'Volunteer not found' });
    }

    // Clean associations
    await Registration.deleteMany({ volunteerId: volunteer._id });
    await Event.updateMany(
      { assignedVolunteers: volunteer._id },
      { $pull: { assignedVolunteers: volunteer._id } }
    );

    await User.findByIdAndDelete(volunteer.userId);
    await Volunteer.findByIdAndDelete(volunteer._id);

    res.status(200).json({ success: true, message: 'Volunteer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk Delete Volunteers
 * @route   POST /api/admin/volunteers/bulk-delete
 * @access  Private (Admin only)
 */
const bulkDeleteVolunteers = async (req, res, next) => {
  try {
    const { ids } = req.body; // Array of volunteer IDs
    if (!ids || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No IDs provided' });
    }

    for (const id of ids) {
      const volunteer = await Volunteer.findById(id);
      if (volunteer) {
        await Registration.deleteMany({ volunteerId: volunteer._id });
        await Event.updateMany({ assignedVolunteers: volunteer._id }, { $pull: { assignedVolunteers: volunteer._id } });
        await User.findByIdAndDelete(volunteer.userId);
        await Volunteer.findByIdAndDelete(volunteer._id);
      }
    }

    res.status(200).json({ success: true, message: `Successfully deleted ${ids.length} volunteers` });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send customized email to volunteer
 * @route   POST /api/admin/volunteers/:id/email
 * @access  Private (Admin only)
 */
const sendVolunteerEmail = async (req, res, next) => {
  try {
    const { subject, body } = req.body;
    const volunteer = await Volunteer.findById(req.params.id).populate('userId');

    if (!volunteer) {
      return res.status(404).json({ success: false, error: 'Volunteer not found' });
    }

    await sendEmail({
      to: volunteer.userId.email,
      subject,
      text: body
    });

    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get participants for a specific event
 * @route   GET /api/admin/events/:id/participants
 * @access  Private (Admin only)
 */
const getEventParticipants = async (req, res, next) => {
  try {
    const registrations = await Registration.find({ eventId: req.params.id }).populate({
      path: 'volunteerId',
      populate: { path: 'userId' }
    });

    res.status(200).json({ success: true, participants: registrations });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign a volunteer to an event directly
 * @route   POST /api/admin/events/:id/assign
 * @access  Private (Admin only)
 */
const assignVolunteer = async (req, res, next) => {
  try {
    const { volunteerId } = req.body;
    const event = await Event.findById(req.params.id);
    const volunteer = await Volunteer.findById(volunteerId).populate('userId');

    if (!event || !volunteer) {
      return res.status(404).json({ success: false, error: 'Event or Volunteer not found' });
    }

    // Check duplicate
    const existing = await Registration.findOne({ eventId: event._id, volunteerId: volunteer._id });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Volunteer is already registered' });
    }

    await Registration.create({ eventId: event._id, volunteerId: volunteer._id });
    await Event.findByIdAndUpdate(event._id, { $push: { assignedVolunteers: volunteer._id } });

    res.status(200).json({ success: true, message: 'Volunteer assigned successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Manage categories (List)
 * @route   GET /api/admin/categories
 * @access  Private
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort('name');
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create Category
 * @route   POST /api/admin/categories
 * @access  Private (Admin only)
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const category = await Category.create({ name, description });
    res.status(201).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create Skill
 * @route   POST /api/admin/skills
 * @access  Private (Admin only)
 */
const createSkill = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const skill = await Skill.create({ name, description });
    res.status(201).json({ success: true, skill });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Skills
 * @route   GET /api/admin/skills
 * @access  Private
 */
const getSkills = async (req, res, next) => {
  try {
    const skills = await Skill.find().sort('name');
    res.status(200).json({ success: true, skills });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all announcements (newest first)
 * @route   GET /api/admin/announcements
 * @access  Private (any authenticated user)
 */
const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find().sort('-createdAt').limit(20);
    res.status(200).json({ success: true, announcements });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Post a new announcement — stored in DB, visible on all dashboards
 * @route   POST /api/admin/announcements
 * @access  Private (Admin only)
 */
const createAnnouncement = async (req, res, next) => {
  try {
    const { title, message } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a title for the announcement.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a message for the announcement.' });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      postedBy: req.user._id
    });

    // Audit log
    await ActivityLog.create({
      userId: req.user._id,
      action: 'create_announcement',
      details: `Admin posted announcement: "${title.trim()}"`,
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Announcement posted successfully. All users will see it on their dashboard.',
      announcement
    });
  } catch (error) {
    console.error('Error in createAnnouncement:', error);
    return res.status(500).json({ success: false, message: 'Unable to create announcement.' });
  }
};

/**
 * @desc    Delete an announcement
 * @route   DELETE /api/admin/announcements/:id
 * @access  Private (Admin only)
 */
const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Announcement deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getVolunteers,
  updateVolunteerStatus,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
  bulkDeleteVolunteers,
  sendVolunteerEmail,
  getEventParticipants,
  assignVolunteer,
  getCategories,
  createCategory,
  getSkills,
  createSkill,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement
};
