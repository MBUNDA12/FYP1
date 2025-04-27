const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/auth');

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Admin routes
router.get('/user-logs', adminController.getUserLogs);
router.get('/system-stats', adminController.getSystemStats);

module.exports = router; 