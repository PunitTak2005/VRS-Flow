const { Event, Registration, Volunteer, ActivityLog } = require('../models');

/**
 * @desc    Get all events with filters (Search, category, date range, status)
 * @route   GET /api/events
 * @access  Public
 */
const getEvents = async (req, res, next) => {
  try {
    const { search, category, startDate, endDate, status } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.title = new RegExp(search, 'i');
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const events = await Event.find(query).sort('date');
    res.status(200).json({ success: true, count: events.length, events });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single event details
 * @route   GET /api/events/:id
 * @access  Public
 */
const getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate({
      path: 'assignedVolunteers',
      populate: { path: 'userId' }
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.status(200).json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new event
 * @route   POST /api/events
 * @access  Private (Admin only)
 */
const createEvent = async (req, res, next) => {
  try {
    const { title, description, category, skillsRequired, date, startTime, endTime, location, capacity } = req.body;

    let image = '/uploads/event_pics/default.png';
    if (req.file) {
      image = `/uploads/event_pics/${req.file.filename}`;
    }

    const event = await Event.create({
      title,
      description,
      category,
      skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : (skillsRequired ? skillsRequired.split(',').map(s => s.trim()) : []),
      date: new Date(date),
      startTime,
      endTime,
      location,
      capacity: parseInt(capacity),
      image
    });

    // Audit Log
    await ActivityLog.create({
      userId: req.user._id,
      action: 'create_event',
      details: `Created new event: ${title}`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update event details
 * @route   PUT /api/events/:id
 * @access  Private (Admin only)
 */
const updateEvent = async (req, res, next) => {
  try {
    let event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const { title, description, category, skillsRequired, date, startTime, endTime, location, capacity, status } = req.body;

    let image = event.image;
    if (req.file) {
      image = `/uploads/event_pics/${req.file.filename}`;
    }

    const updateFields = {
      title: title || event.title,
      description: description || event.description,
      category: category || event.category,
      skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : (skillsRequired ? skillsRequired.split(',').map(s => s.trim()) : event.skillsRequired),
      date: date ? new Date(date) : event.date,
      startTime: startTime || event.startTime,
      endTime: endTime || event.endTime,
      location: location || event.location,
      capacity: capacity ? parseInt(capacity) : event.capacity,
      status: status || event.status,
      image
    };

    event = await Event.findByIdAndUpdate(req.params.id, updateFields, { new: true });

    // Update Status of all associated registrations to match completed event
    if (status === 'completed') {
      // Auto-assign volunteer hours if event is marked completed (e.g. 3 hours default or custom)
      // Standard calculation: difference between end time and start time or default 3 hours
      await Registration.updateMany({ eventId: event._id }, { status: 'attended', hoursLogged: 3 });
      const regs = await Registration.find({ eventId: event._id });
      for (const reg of regs) {
        await Volunteer.findByIdAndUpdate(reg.volunteerId, { $inc: { volunteerHours: 3 } });
      }
    }

    // Audit Log
    await ActivityLog.create({
      userId: req.user._id,
      action: 'update_event',
      details: `Updated event: ${event.title}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete event and remove all registrations
 * @route   DELETE /api/events/:id
 * @access  Private (Admin only)
 */
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // 1. Delete associated registrations
    await Registration.deleteMany({ eventId: event._id });

    // 2. Delete Event
    await Event.findByIdAndDelete(req.params.id);

    // Audit Log
    await ActivityLog.create({
      userId: req.user._id,
      action: 'delete_event',
      details: `Deleted event: ${event.title}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record event attendance and log volunteer hours
 * @route   PUT /api/events/:id/attendance/:registrationId
 * @access  Private (Admin only)
 */
const logAttendance = async (req, res, next) => {
  try {
    const { status, hoursLogged } = req.body; // status: 'attended' / 'no-show', hoursLogged: Number
    
    if (!['attended', 'no-show', 'registered'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid attendance status' });
    }

    const reg = await Registration.findById(req.params.registrationId).populate('volunteerId');
    if (!reg) {
      return res.status(404).json({ success: false, error: 'Event registration not found' });
    }

    const prevHours = reg.hoursLogged || 0;
    const nextHours = status === 'attended' ? parseFloat(hoursLogged || 0) : 0;
    const hourDiff = nextHours - prevHours;

    // Update registration status
    reg.status = status;
    reg.hoursLogged = nextHours;
    await reg.save();

    // Increment/decrement hours in volunteer profile
    const volunteer = await Volunteer.findById(reg.volunteerId._id);
    const newHours = Math.max(0, (volunteer.volunteerHours || 0) + hourDiff);
    
    // Manage badges based on volunteer hours
    const badges = [...(volunteer.badges || [])];
    if (newHours >= 10 && !badges.includes('Bronze Contributor')) badges.push('Bronze Contributor');
    if (newHours >= 25 && !badges.includes('Silver Helper')) badges.push('Silver Helper');
    if (newHours >= 50 && !badges.includes('Gold Champion')) badges.push('Gold Champion');
    if (newHours >= 100 && !badges.includes('Platinum Hero')) badges.push('Platinum Hero');

    await Volunteer.findByIdAndUpdate(reg.volunteerId._id, {
      volunteerHours: newHours,
      badges
    });

    // Log attendance confirmation to console (notification system removed)
    if (status === 'attended') {
      console.log(`Attendance logged for volunteer ${reg.volunteerId._id}: ${nextHours} hours credited.`);
    }

    res.status(200).json({ success: true, registration: reg });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  logAttendance
};
