const { pool } = require('../config/db');

// Get user activity logs with pagination
const getUserLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // Get logs with pagination
    const [logs] = await pool.query(
      `SELECT *
       FROM user_logs
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    res.status(200).json({ logs });
  } catch (error) {
    console.error('Error retrieving user logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get system stats (active users, total evidence, etc.)
const getSystemStats = async (req, res) => {
  try {
    // Get active users count
    const [activeUsers] = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE status = 'active'`
    );
    
    // Get total evidence count
    const [totalEvidence] = await pool.query(
      `SELECT COUNT(*) as count FROM evidence WHERE status != 'deleted'`
    );
    
    // Get encrypted evidence count
    const [encryptedEvidence] = await pool.query(
      `SELECT COUNT(*) as count FROM evidence WHERE encrypted = true AND status != 'deleted'`
    );
    
    // Get recent uploads (last 7 days)
    const [recentUploads] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM evidence 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       AND status != 'deleted'`
    );
    
    // Get logs count
    const [logsCount] = await pool.query(
      `SELECT COUNT(*) as count FROM user_logs`
    );
    
    res.status(200).json({
      users: {
        active: activeUsers[0].count
      },
      evidence: {
        total: totalEvidence[0].count,
        encrypted: encryptedEvidence[0].count,
        recentUploads: recentUploads[0].count
      },
      logs: {
        total: logsCount[0].count
      }
    });
  } catch (error) {
    console.error('Error retrieving system stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getUserLogs,
  getSystemStats
}; 