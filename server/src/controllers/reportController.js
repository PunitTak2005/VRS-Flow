const { Volunteer, Registration, Event, User } = require('../models');
const { generateCSV, generateExcel, generatePDF } = require('../services/reportService');

// Helper to calculate age from DOB
const calculateAge = (dob) => {
  if (!dob) return 0;
  const diffMs = Date.now() - new Date(dob).getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

/**
 * @desc    Generate Reports by type and format
 * @route   GET /api/reports/:type
 * @access  Private (Admin only)
 */
const generateReport = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;

    let title = '';
    let headers = [];
    let rows = [];
    let rawData = [];

    // Compile reports based on type
    if (type === 'volunteers') {
      title = 'Volunteer Registration List';
      headers = ['ID', 'Name', 'Email', 'Phone', 'City', 'Status', 'Hours Logged'];
      rawData = await Volunteer.find().populate('userId');
      rows = rawData.map(v => [
        v._id.toString(),
        v.userId?.name || 'N/A',
        v.userId?.email || 'N/A',
        v.phoneNumber || 'N/A',
        v.address?.city || 'N/A',
        v.approvalStatus,
        v.volunteerHours
      ]);
    } else if (type === 'gender') {
      title = 'Gender Distribution Report';
      headers = ['Gender', 'Count', 'Percentage'];
      
      const counts = { male: 0, female: 0, other: 0, 'prefer-not-to-say': 0 };
      const volunteers = await Volunteer.find();
      volunteers.forEach(v => {
        const g = v.gender || 'prefer-not-to-say';
        if (counts[g] !== undefined) counts[g]++;
      });

      const total = volunteers.length || 1;
      rawData = Object.entries(counts).map(([gender, count]) => ({
        gender,
        count,
        percentage: `${((count / total) * 100).toFixed(1)}%`
      }));

      rows = rawData.map(r => [
        r.gender.toUpperCase(),
        r.count,
        r.percentage
      ]);
    } else if (type === 'age') {
      title = 'Age Demographics Report';
      headers = ['Age Bracket', 'Count', 'Percentage'];

      const brackets = {
        'Under 18': 0,
        '18 - 25': 0,
        '26 - 35': 0,
        '36 - 50': 0,
        '50+': 0
      };

      const volunteers = await Volunteer.find();
      volunteers.forEach(v => {
        const age = calculateAge(v.dob);
        if (age < 18) brackets['Under 18']++;
        else if (age <= 25) brackets['18 - 25']++;
        else if (age <= 35) brackets['26 - 35']++;
        else if (age <= 50) brackets['36 - 50']++;
        else brackets['50+']++;
      });

      const total = volunteers.length || 1;
      rawData = Object.entries(brackets).map(([bracket, count]) => ({
        bracket,
        count,
        percentage: `${((count / total) * 100).toFixed(1)}%`
      }));

      rows = rawData.map(r => [
        r.bracket,
        r.count,
        r.percentage
      ]);
    } else if (type === 'attendance') {
      title = 'Volunteer Event Attendance Report';
      headers = ['Volunteer Name', 'Event Title', 'Status', 'Hours Credited', 'Date Logged'];
      rawData = await Registration.find().populate({
        path: 'volunteerId',
        populate: { path: 'userId' }
      }).populate('eventId');

      rows = rawData.map(r => [
        r.volunteerId?.userId?.name || 'N/A',
        r.eventId?.title || 'N/A',
        r.status,
        r.hoursLogged,
        new Date(r.createdAt).toLocaleDateString()
      ]);
    } else if (type === 'top-volunteers') {
      title = 'Top Volunteer Leaderboard';
      headers = ['Rank', 'Volunteer Name', 'Email', 'City', 'Hours Logged', 'Badges Earned'];
      rawData = await Volunteer.find({ approvalStatus: 'approved' })
        .populate('userId')
        .sort('-volunteerHours')
        .limit(10);

      rows = rawData.map((v, index) => [
        index + 1,
        v.userId?.name || 'N/A',
        v.userId?.email || 'N/A',
        v.address?.city || 'N/A',
        v.volunteerHours,
        (v.badges || []).join(', ') || 'None'
      ]);
    } else if (type === 'inactive') {
      title = 'Inactive Volunteers Report';
      headers = ['Volunteer Name', 'Email', 'Phone', 'City', 'Preferred Category', 'Registered Date'];
      rawData = await Volunteer.find({ approvalStatus: 'approved', volunteerHours: 0 }).populate('userId');

      rows = rawData.map(v => [
        v.userId?.name || 'N/A',
        v.userId?.email || 'N/A',
        v.phoneNumber || 'N/A',
        v.address?.city || 'N/A',
        v.preferredCategory,
        new Date(v.createdAt).toLocaleDateString()
      ]);
    } else {
      return res.status(400).json({ success: false, error: 'Invalid report type specified' });
    }

    // Process formats
    if (format === 'csv') {
      const csvContent = generateCSV(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_report.csv`);
      return res.status(200).send(csvContent);
    } else if (format === 'excel') {
      return await generateExcel(title, headers, rows, res);
    } else if (format === 'pdf') {
      return generatePDF(title, headers, rows, res);
    } else {
      // Return raw JSON
      return res.status(200).json({
        success: true,
        reportType: type,
        title,
        headers,
        data: rawData
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { generateReport };
