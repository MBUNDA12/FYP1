const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Authentication middleware - verify JWT token
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists in database
    const [rows] = await pool.query(
      'SELECT id, name, email, role, badge_number, status FROM users WHERE id = ?',
      [decoded.userId]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid token - user not found' });
    }
    
    const user = rows[0];
    
    // Check if user is active
    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'User account is inactive' });
    }
    
    // Set user on request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

// Authorization middleware - check if user has required role
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // If roles is not an array, convert it to array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    // Check if user's role is included in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Special authorization for officers/admins
// Admins can do everything officers can do
const authorizeOfficerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'officer' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  
  next();
};

module.exports = {
  authenticate,
  authorize,
  authorizeOfficerOrAdmin
}; 