const { pool } = require('../config/db');

async function createUserLogsTable() {
  try {
    console.log('Creating user_logs table...');
    
    // Create the user_logs table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        user_role ENUM('admin', 'officer') NOT NULL,
        action VARCHAR(50) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_logs_user_id (user_id),
        INDEX idx_user_logs_action (action),
        INDEX idx_user_logs_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('user_logs table created successfully with indexes.');
    
  } catch (error) {
    console.error('Error creating user_logs table:', error);
  }
}

// Run the script
createUserLogsTable()
  .then(() => {
    console.log('Database schema updated successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error updating schema:', error);
    process.exit(1);
  }); 