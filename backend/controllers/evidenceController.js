const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const crypto = require('crypto');

// Get all evidence with optional filters
const getAllEvidence = async (req, res) => {
  try {
    const { caseNumber, officerId } = req.query;
    
    // Build query based on filters
    let query = `
      SELECT e.*, u.name as officer_name
      FROM evidence e
      JOIN users u ON e.officer_id = u.id
      WHERE e.status != 'deleted'
    `;
    
    const queryParams = [];
    
    if (caseNumber) {
      query += ' AND e.case_number = ?';
      queryParams.push(caseNumber);
    }
    
    if (officerId) {
      query += ' AND e.officer_id = ?';
      queryParams.push(officerId);
    }
    
    // Non-admin users can only see their own evidence
    if (req.user.role !== 'admin') {
      query += ' AND e.officer_id = ?';
      queryParams.push(req.user.id);
    }
    
    query += ' ORDER BY e.created_at DESC';
    
    const [evidence] = await pool.query(query, queryParams);
    
    res.status(200).json({ evidence });
  } catch (error) {
    console.error('Error getting evidence:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get evidence by ID
const getEvidenceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get evidence with officer details
    const [evidence] = await pool.query(
      `SELECT e.*, u.name as officer_name, u.badge_number as officer_badge
       FROM evidence e
       JOIN users u ON e.officer_id = u.id
       WHERE e.id = ? AND e.status != 'deleted'`,
      [id]
    );
    
    if (evidence.length === 0) {
      return res.status(404).json({ message: 'Evidence not found' });
    }
    
    // Non-admin users can only view their own evidence
    if (req.user.role !== 'admin' && evidence[0].officer_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to view this evidence' });
    }
    
    // Get access logs for this evidence
    const [logs] = await pool.query(
      `SELECT l.*, u.name as user_name, u.role as user_role
       FROM evidence_logs l
       JOIN users u ON l.user_id = u.id
       WHERE l.evidence_id = ?
       ORDER BY l.created_at DESC`,
      [id]
    );
    
    // Add logs to evidence object
    evidence[0].logs = logs;
    
    res.status(200).json({ evidence: evidence[0] });
  } catch (error) {
    console.error('Error getting evidence by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Upload new evidence
const uploadEvidence = async (req, res) => {
  try {
    // File should be available from multer middleware
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { caseNumber, description } = req.body;
    
    // Validate case number
    if (!caseNumber) {
      // Remove the uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Case number is required' });
    }
    
    // Save file details to database
    const [result] = await pool.query(
      `INSERT INTO evidence (
        case_number,
        file_name,
        original_file_name,
        file_path,
        file_size,
        file_type,
        description,
        officer_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        caseNumber,
        req.file.filename,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        description || null,
        req.user.id
      ]
    );
    
    // Log the upload action
    await pool.query(
      `INSERT INTO evidence_logs (evidence_id, user_id, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        result.insertId,
        req.user.id,
        'UPLOAD',
        `File uploaded: ${req.file.originalname}`,
        req.ip
      ]
    );
    
    // Get the created evidence record
    const [evidence] = await pool.query(
      `SELECT e.*, u.name as officer_name
       FROM evidence e
       JOIN users u ON e.officer_id = u.id
       WHERE e.id = ?`,
      [result.insertId]
    );
    
    res.status(201).json({
      message: 'Evidence uploaded successfully',
      evidence: evidence[0]
    });
  } catch (error) {
    console.error('Error uploading evidence:', error);
    
    // Clean up file if upload fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Simulate encrypting evidence file
const encryptFile = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if evidence exists
    const [evidence] = await pool.query(
      'SELECT * FROM evidence WHERE id = ? AND status != "deleted"',
      [id]
    );
    
    if (evidence.length === 0) {
      return res.status(404).json({ message: 'Evidence not found' });
    }
    
    // Non-admin users can only encrypt their own evidence
    if (req.user.role !== 'admin' && evidence[0].officer_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to encrypt this evidence' });
    }
    
    // Check if already encrypted
    if (evidence[0].encrypted) {
      return res.status(400).json({ message: 'Evidence is already encrypted' });
    }
    
    // Update encrypted status
    await pool.query(
      'UPDATE evidence SET encrypted = true WHERE id = ?',
      [id]
    );
    
    // Log the encryption action
    await pool.query(
      `INSERT INTO evidence_logs (evidence_id, user_id, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        'ENCRYPT',
        `File encrypted by ${req.user.name}`,
        req.ip
      ]
    );
    
    res.status(200).json({
      message: 'Evidence encrypted successfully',
      success: true
    });
  } catch (error) {
    console.error('Error encrypting evidence:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Simulate decrypting evidence file (admin only)
const decryptFile = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if evidence exists
    const [evidence] = await pool.query(
      'SELECT * FROM evidence WHERE id = ? AND status != "deleted"',
      [id]
    );
    
    if (evidence.length === 0) {
      return res.status(404).json({ message: 'Evidence not found' });
    }
    
    // Only admins can decrypt files
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can decrypt evidence' });
    }
    
    // Check if already decrypted
    if (!evidence[0].encrypted) {
      return res.status(400).json({ message: 'Evidence is not encrypted' });
    }
    
    // Update encrypted status
    await pool.query(
      'UPDATE evidence SET encrypted = false WHERE id = ?',
      [id]
    );
    
    // Log the decryption action
    await pool.query(
      `INSERT INTO evidence_logs (evidence_id, user_id, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        'DECRYPT',
        `File decrypted by administrator ${req.user.name}`,
        req.ip
      ]
    );
    
    res.status(200).json({
      message: 'Evidence decrypted successfully',
      success: true
    });
  } catch (error) {
    console.error('Error decrypting evidence:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete evidence (admin only, soft delete)
const deleteEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if evidence exists
    const [evidence] = await pool.query(
      'SELECT * FROM evidence WHERE id = ? AND status != "deleted"',
      [id]
    );
    
    if (evidence.length === 0) {
      return res.status(404).json({ message: 'Evidence not found' });
    }
    
    // Only admins can delete evidence
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete evidence' });
    }
    
    // Soft delete by updating status
    await pool.query(
      'UPDATE evidence SET status = "deleted" WHERE id = ?',
      [id]
    );
    
    // Log the deletion action
    await pool.query(
      `INSERT INTO evidence_logs (evidence_id, user_id, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        'DELETE',
        `Evidence marked as deleted by administrator ${req.user.name}`,
        req.ip
      ]
    );
    
    res.status(200).json({
      message: 'Evidence deleted successfully',
      success: true
    });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Download evidence file
const downloadEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if evidence exists
    const [evidence] = await pool.query(
      'SELECT * FROM evidence WHERE id = ? AND status != "deleted"',
      [id]
    );
    
    if (evidence.length === 0) {
      return res.status(404).json({ message: 'Evidence not found' });
    }
    
    // Check permission: non-admin users can only download their own evidence
    if (req.user.role !== 'admin' && evidence[0].officer_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to download this evidence' });
    }
    
    // Check if file exists
    if (!fs.existsSync(evidence[0].file_path)) {
      return res.status(404).json({ message: 'Evidence file not found on server' });
    }
    
    // Log the download action
    await pool.query(
      `INSERT INTO evidence_logs (evidence_id, user_id, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        'DOWNLOAD',
        `File downloaded by ${req.user.name}`,
        req.ip
      ]
    );
    
    // Send file
    res.download(evidence[0].file_path, evidence[0].original_file_name);
  } catch (error) {
    console.error('Error downloading evidence:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAllEvidence,
  getEvidenceById,
  uploadEvidence,
  encryptFile,
  decryptFile,
  deleteEvidence,
  downloadEvidence
}; 