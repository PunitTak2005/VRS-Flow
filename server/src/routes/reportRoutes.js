const express = require('express');
const router = express.Router();
const { generateReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Report generation is restricted to Admin users
router.get('/:type', protect, authorize('admin'), generateReport);

module.exports = router;
