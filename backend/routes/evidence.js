const express = require('express');
const router = express.Router();
const evidenceController = require('../controllers/evidenceController');
const { authenticate, authorize, authorizeOfficerOrAdmin } = require('../middlewares/auth');
const { evidenceUpload, handleUploadErrors } = require('../middlewares/upload');

// All routes require authentication
router.use(authenticate);

// Routes for officers and admins
router.get('/', evidenceController.getAllEvidence);
router.get('/:id', evidenceController.getEvidenceById);
router.get('/:id/download', evidenceController.downloadEvidence);

// Upload route - needs file upload middleware
router.post('/upload', authorizeOfficerOrAdmin, evidenceUpload, handleUploadErrors, evidenceController.uploadEvidence);

// Encryption routes
router.post('/:id/encrypt', authorizeOfficerOrAdmin, evidenceController.encryptFile);
router.post('/:id/decrypt', authorize('admin'), evidenceController.decryptFile);

// Admin only routes
router.delete('/:id', authorize('admin'), evidenceController.deleteEvidence);

module.exports = router; 