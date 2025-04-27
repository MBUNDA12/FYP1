const mysql = require('mysql2/promise');
require('dotenv').config();

const initDatabase = async () => {
  let connection;
  
  try {
    // Connect to MySQL without selecting a database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    
    console.log('Connected to MySQL server');
    
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`Database ${process.env.DB_NAME} created or already exists`);
    
    // Use the database
    await connection.query(`USE ${process.env.DB_NAME}`);
    
    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'officer') NOT NULL,
        badge_number VARCHAR(20),
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created or already exists');
    
    // Create evidence table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS evidence (
        id INT AUTO_INCREMENT PRIMARY KEY,
        case_number VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        original_file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        file_size INT NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        description TEXT,
        encrypted BOOLEAN DEFAULT FALSE,
        officer_id INT NOT NULL,
        status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (officer_id) REFERENCES users(id)
      )
    `);
    console.log('Evidence table created or already exists');
    
    // Create evidence_logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS evidence_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        evidence_id INT NOT NULL,
        user_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        details TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (evidence_id) REFERENCES evidence(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('Evidence logs table created or already exists');
    
    // Create a default admin user if no users exist
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    
    if (users[0].count === 0) {
      // Using bcrypt to hash the password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Mbunda1!', 10);
      
      await connection.query(`
        INSERT INTO users (name, email, password, role)
        VALUES ('Mbunda mbunda', 'admin@mbunda.com', ?, 'admin')
      `, [hashedPassword]);
      
      await connection.query(`
        INSERT INTO users (name, email, password, role, badge_number)
        VALUES ('MBUNDA', 'mbundaphilimon@gmail.com', ?, 'officer', 'B12345')
      `, [hashedPassword]);
      
      console.log('Default users created');
    }
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run the init function if this script is executed directly
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase; 