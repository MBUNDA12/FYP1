const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Admin only routes
router.get('/', authorize('admin'), userController.getAllUsers);
router.get('/:id', authorize('admin'), userController.getUserById);
router.post('/', authorize('admin'), userController.createUser);
router.put('/:id', authorize('admin'), userController.updateUser);
router.post('/:id/reset-password', authorize('admin'), userController.resetPassword);
router.delete('/:id', authorize('admin'), userController.deleteUser);

// Any authenticated user can change their own password
router.post('/change-password', userController.changePassword);

module.exports = router; 