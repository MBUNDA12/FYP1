const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    // Only get active users
    const [users] = await pool.query(
      `SELECT id, name, email, role, badge_number, status, created_at, updated_at 
       FROM users
       WHERE status = 'active'
       ORDER BY created_at DESC`
    );
    
    res.status(200).json({ users });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user by ID (admin only)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [users] = await pool.query(
      `SELECT id, name, email, role, badge_number, status, created_at, updated_at 
       FROM users 
       WHERE id = ?`,
      [id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ user: users[0] });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create new user (admin only)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, badge_number } = req.body;
    
    // Validate input
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password and role are required' });
    }
    
    // Validate role
    if (role !== 'admin' && role !== 'officer') {
      return res.status(400).json({ message: 'Role must be either "admin" or "officer"' });
    }
    
    // Validate badge number for officers
    if (role === 'officer' && !badge_number) {
      return res.status(400).json({ message: 'Badge number is required for officers' });
    }
    
    // Check if email already exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, role, badge_number)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, role, badge_number || null]
    );
    
    // Get the created user
    const [newUser] = await pool.query(
      `SELECT id, name, email, role, badge_number, status, created_at 
       FROM users 
       WHERE id = ?`,
      [result.insertId]
    );
    
    // Log user creation
    await logUserAction(
      newUser[0].id,
      newUser[0].name,
      newUser[0].email,
      newUser[0].role,
      'USER_CREATED',
      `User created by admin ${req.user.name} (ID: ${req.user.id})`,
      req.ip
    );
    
    res.status(201).json({
      message: 'User created successfully',
      user: newUser[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update user (admin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, badge_number, status } = req.body;
    
    // Validate input
    if (!name && !email && !role && !badge_number && status === undefined) {
      return res.status(400).json({ message: 'At least one field to update is required' });
    }
    
    // Check if user exists
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userToUpdate = users[0];
    
    // Prepare update query
    let updateFields = [];
    let queryParams = [];
    let updateDetails = [];
    
    if (name && name !== userToUpdate.name) {
      updateFields.push('name = ?');
      queryParams.push(name);
      updateDetails.push(`name changed from "${userToUpdate.name}" to "${name}"`);
    }
    
    if (email && email !== userToUpdate.email) {
      // Check if email already exists for another user
      const [existingUsers] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (existingUsers.length > 0) {
        return res.status(409).json({ message: 'Email already in use by another user' });
      }
      
      updateFields.push('email = ?');
      queryParams.push(email);
      updateDetails.push(`email changed from "${userToUpdate.email}" to "${email}"`);
    }
    
    if (role && role !== userToUpdate.role) {
      if (role !== 'admin' && role !== 'officer') {
        return res.status(400).json({ message: 'Role must be either "admin" or "officer"' });
      }
      updateFields.push('role = ?');
      queryParams.push(role);
      updateDetails.push(`role changed from "${userToUpdate.role}" to "${role}"`);
    }
    
    if (badge_number !== undefined && badge_number !== userToUpdate.badge_number) {
      updateFields.push('badge_number = ?');
      queryParams.push(badge_number || null);
      updateDetails.push(`badge number changed from "${userToUpdate.badge_number || 'none'}" to "${badge_number || 'none'}"`);
    }
    
    if (status !== undefined && status !== userToUpdate.status) {
      if (status !== 'active' && status !== 'inactive') {
        return res.status(400).json({ message: 'Status must be either "active" or "inactive"' });
      }
      updateFields.push('status = ?');
      queryParams.push(status);
      updateDetails.push(`status changed from "${userToUpdate.status}" to "${status}"`);
    }
    
    // If nothing to update
    if (updateFields.length === 0) {
      return res.status(200).json({
        message: 'No changes to update',
        user: userToUpdate
      });
    }
    
    // Add updated_at field
    updateFields.push('updated_at = NOW()');
    
    // Add ID to query params
    queryParams.push(id);
    
    // Update user
    await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      queryParams
    );
    
    // Get updated user
    const [updatedUser] = await pool.query(
      `SELECT id, name, email, role, badge_number, status, created_at, updated_at 
       FROM users 
       WHERE id = ?`,
      [id]
    );
    
    // Log user update
    await logUserAction(
      updatedUser[0].id,
      updatedUser[0].name,
      updatedUser[0].email,
      updatedUser[0].role,
      'USER_UPDATED',
      `User updated by admin ${req.user.name} (ID: ${req.user.id}). Changes: ${updateDetails.join(', ')}`,
      req.ip
    );
    
    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Reset user password (admin only)
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    // Validate input
    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }
    
    // Check if user exists
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userToUpdate = users[0];
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
    
    // Log password reset
    await logUserAction(
      userToUpdate.id,
      userToUpdate.name,
      userToUpdate.email,
      userToUpdate.role,
      'PASSWORD_RESET',
      `Password reset by admin ${req.user.name} (ID: ${req.user.id})`,
      req.ip
    );
    
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Change own password (any authenticated user)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    // Get user with password
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Add this logging function
const logUserAction = async (userId, userName, userEmail, userRole, action, details, ipAddress) => {
  try {
    await pool.query(
      `INSERT INTO user_logs (user_id, user_name, user_email, user_role, action, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, userName, userEmail, userRole, action, details, ipAddress]
    );
    console.log(`User action logged: ${action} by User ID: ${userId}`);
  } catch (error) {
    console.error('Error logging user action:', error);
  }
};

// Add new deletion functionality
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userToDelete = users[0];
    
    // Don't allow deleting yourself
    if (userToDelete.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    
    // First log the deletion action
    await logUserAction(
      userToDelete.id,
      userToDelete.name,
      userToDelete.email,
      userToDelete.role,
      'USER_DELETED',
      `User deleted by admin ${req.user.name} (ID: ${req.user.id})`,
      req.ip
    );
    
    // Then delete the user
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    
    res.status(200).json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: userToDelete.id,
        name: userToDelete.name,
        email: userToDelete.email
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  resetPassword,
  changePassword,
  deleteUser
}; 