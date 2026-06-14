const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All admin routes require token authentication
router.use(protect);

// Basic lookups (Categories and Skills) can be accessed by both volunteers and admins
router.get('/categories', getCategories);
router.get('/skills', getSkills);

// Announcements — GET is accessible by any logged-in user (volunteer or admin)
router.get('/announcements', getAnnouncements);

// Admin-restricted routes
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/volunteers', getVolunteers);
router.post('/volunteers', createVolunteer);
router.put('/volunteers/:id', updateVolunteer);
router.delete('/volunteers/:id', deleteVolunteer);
router.post('/volunteers/bulk-delete', bulkDeleteVolunteers);
router.put('/volunteers/:id/status', updateVolunteerStatus);
router.post('/volunteers/:id/email', sendVolunteerEmail);
router.get('/events/:id/participants', getEventParticipants);
router.post('/events/:id/assign', assignVolunteer);
router.post('/categories', createCategory);
router.post('/skills', createSkill);
router.post('/announcements', createAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);

module.exports = router;
