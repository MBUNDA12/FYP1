const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

async function seedUsers() {
  try {
    console.log('Seeding users table...');
    
    // Check if admin user already exists
    const [adminExists] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE email = ?',
      ['admin@mbunda.com']
    );
    
    if (adminExists[0].count === 0) {
      // Admin user
      const adminPassword = await bcrypt.hash('Mbunda1!', 10);
      await pool.query(
        `INSERT INTO users (name, email, password, role, status, created_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        ['Admin User', 'admin@mbunda.com', adminPassword, 'admin', 'active']
      );
      console.log('Created admin user: admin@mbunda.com / Mbunda1!');
    } else {
      console.log('Admin user already exists, skipping.');
    }
    
    // Check if officer user already exists
    const [officerExists] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE email = ?',
      ['mbundaphilimon@gmail.com']
    );
    
    if (officerExists[0].count === 0) {
      // Officer user
      const officerPassword = await bcrypt.hash('Mbunda1!', 10);
      await pool.query(
        `INSERT INTO users (name, email, password, role, badge_number, status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        ['Officer User', 'mbundaphilimon@gmail.com', officerPassword, 'officer', 'B12345', 'active']
      );
      console.log('Created officer user: mbundaphilimon@gmail.com / Mbunda1!');
    } else {
      console.log('Officer user already exists, skipping.');
    }
    
    console.log('User seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding users:', error);
  }
}

// Run the seeding
seedUsers()
  .then(() => {
    console.log('Database seeding completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during seeding:', error);
    process.exit(1);
  }); 