
const db = require('../config/db');
const { generateUUID, hashPassword, comparePassword, generateToken } = require('../utils/helpers');
const sendEmail = require('../utils/email');
const crypto = require('crypto');
const { logSecurityEvent, SECURITY_EVENTS } = require('../utils/securityLogger');

// Helper to parse metadata
const parseMetadata = (metadata) => {
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }
  return metadata || {};
};

// Check if system has any admin
const checkFirstAdmin = async (req, res) => {
  try {
    const [admins] = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'approved'"
    );

    res.json({ isFirstAdmin: admins[0].count === 0 });
  } catch (error) {
    console.error('Check first admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Register user (Admin/Instructor)
const register = async (req, res) => {
  try {
    const { name, email, password, role, department, metadata } = req.body;
    console.log('Register Request:', { name, email, role, department, metadata, passwordLength: password ? password.length : 0 });

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if email exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check if this is the first admin
    const [admins] = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'approved'"
    );
    const isFirstAdmin = admins[0].count === 0;

    // Hash password
    const hashedPassword = await hashPassword(password);
    const userId = generateUUID();

    // Set status - first admin is auto-approved
    const status = isFirstAdmin && role === 'admin' ? 'approved' : 'pending';

    // Insert user
    await db.query(
      'INSERT INTO users (id, name, email, password_hash, role, status, department, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, name, email, hashedPassword, role || 'student', status, department, JSON.stringify(metadata || {})]
    );

    // If first admin, auto-login
    if (status === 'approved') {
      // Log account creation
      await logSecurityEvent(userId, SECURITY_EVENTS.ACCOUNT_CREATED, {
        email: email,
        role: role || 'student',
        isFirstAdmin: true
      }, req);

      const token = generateToken({ id: userId, email, role: role || 'student', name });
      return res.status(201).json({
        message: 'Registration successful',
        token,
        user: { id: userId, name, email, role: role || 'student', status: 'approved', department, metadata: metadata || {} }
      });
    }

    // Log account creation (pending approval)
    await logSecurityEvent(userId, SECURITY_EVENTS.ACCOUNT_CREATED, {
      email: email,
      role: role || 'student',
      status: 'pending'
    }, req);

    res.status(201).json({
      message: 'Registration successful. Awaiting admin approval.',
      user: { id: userId, name, email, role: role || 'student', status: 'pending', department, metadata: metadata || {} }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: [error.message] });
  }
};

// Register student (No password, no login)
const registerStudent = async (req, res) => {
  try {
    const { name, email, rollNumber, sectionId } = req.body;

    // Validate input
    if (!name || !email || !rollNumber || !sectionId) {
      return res.status(400).json({ error: 'Name, email, roll number, and section are required' });
    }

    // Check if email exists
    const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check if roll number exists
    const [existingRoll] = await db.query('SELECT id FROM users WHERE roll_number = ?', [rollNumber]);
    if (existingRoll.length > 0) {
      return res.status(400).json({ error: 'Roll number already registered' });
    }

    // Verify section exists
    const [sections] = await db.query('SELECT id, name FROM sections WHERE id = ?', [sectionId]);
    if (sections.length === 0) {
      return res.status(400).json({ error: 'Invalid section' });
    }

    const userId = generateUUID();

    // Insert student (no password, auto-approved)
    await db.query(
      'INSERT INTO users (id, name, email, roll_number, section_id, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, name, email, rollNumber, sectionId, 'student', 'approved']
    );

    // Send confirmation email
    try {
      await sendEmail({
        email: email,
        subject: 'Registration Successful - EmersonSched',
        message: `Dear ${name},\n\nYour registration has been successful!\n\nRoll Number: ${rollNumber}\nSection: ${sections[0].name}\n\nYou will receive your timetable and any updates via email.\n\nBest regards,\nEmersonSched Team`
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      message: 'Student registration successful. You will receive timetable updates via email.',
      student: { id: userId, name, email, rollNumber, sectionId }
    });
  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({ error: 'Student registration failed' });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      // Log failed login attempt for non-existent user
      await logSecurityEvent(null, SECURITY_EVENTS.LOGIN_FAILED, {
        email: email,
        reason: 'User not found'
      }, req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check if approved
    if (user.status !== 'approved') {
      await logSecurityEvent(user.id, SECURITY_EVENTS.LOGIN_FAILED, {
        email: user.email,
        reason: 'Account not approved'
      }, req);
      return res.status(403).json({ error: 'Account pending approval' });
    }

    // Check if account is locked
    const lockoutTime = 15 * 60 * 1000; // 15 minutes in milliseconds
    const maxAttempts = 5;

    if (user.loginAttempts >= maxAttempts && user.lastFailedLogin) {
      const timeSinceLastFailed = Date.now() - new Date(user.lastFailedLogin).getTime();
      if (timeSinceLastFailed < lockoutTime) {
        const remainingTime = Math.ceil((lockoutTime - timeSinceLastFailed) / 60000);
        await logSecurityEvent(user.id, SECURITY_EVENTS.LOGIN_FAILED, {
          email: user.email,
          reason: 'Account locked',
          remainingLockoutMinutes: remainingTime
        }, req);
        return res.status(423).json({
          error: `Account locked. Try again in ${remainingTime} minutes.`,
          lockoutRemaining: remainingTime
        });
      } else {
        // Reset attempts if lockout period has passed
        await db.query('UPDATE users SET loginAttempts = 0, lastFailedLogin = NULL WHERE id = ?', [user.id]);
        user.loginAttempts = 0;
      }
    }

    // Verify password
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      // Increment failed attempts
      const newAttempts = (user.loginAttempts || 0) + 1;
      await db.query('UPDATE users SET loginAttempts = ?, lastFailedLogin = NOW() WHERE id = ?', [newAttempts, user.id]);

      const attemptsLeft = maxAttempts - newAttempts;

      // Log failed login
      await logSecurityEvent(user.id, SECURITY_EVENTS.LOGIN_FAILED, {
        email: user.email,
        attemptsRemaining: Math.max(0, attemptsLeft),
        totalAttempts: newAttempts
      }, req);

      // Check if account should be locked
      if (newAttempts >= maxAttempts) {
        await logSecurityEvent(user.id, SECURITY_EVENTS.ACCOUNT_LOCKED, {
          email: user.email,
          lockoutDurationMinutes: 15
        }, req);
        return res.status(423).json({
          error: 'Account locked due to too many failed attempts. Try again in 15 minutes.',
          lockoutRemaining: 15
        });
      }

      return res.status(401).json({
        error: `Invalid credentials. ${attemptsLeft} attempts remaining.`,
        attemptsRemaining: attemptsLeft
      });
    }

    // Successful login - reset attempts and update last login
    await db.query('UPDATE users SET loginAttempts = 0, lastFailedLogin = NULL, lastLogin = NOW() WHERE id = ?', [user.id]);

    // Log successful login
    await logSecurityEvent(user.id, SECURITY_EVENTS.LOGIN_SUCCESS, {
      email: user.email,
      role: user.role
    }, req);

    // Generate token
    const token = generateToken(user);
    const metadata = parseMetadata(user.metadata);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        metadata: metadata
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, department, status, metadata, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    user.metadata = parseMetadata(user.metadata);

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, department, specialization, profile_picture } = req.body;
    const userId = req.user.id;

    // Get existing metadata
    const [users] = await db.query('SELECT metadata FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    let metadata = parseMetadata(users[0].metadata);

    // Update metadata fields
    if (specialization !== undefined) metadata.specialization = specialization;
    if (profile_picture !== undefined) metadata.profile_picture = profile_picture;

    const updateFields = [];
    const updateValues = [];

    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (department) {
      updateFields.push('department = ?');
      updateValues.push(department);
    }

    updateFields.push('metadata = ?');
    updateValues.push(JSON.stringify(metadata));

    updateValues.push(userId); // For WHERE clause

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.query(query, updateValues);

    // Log profile update
    await logSecurityEvent(userId, SECURITY_EVENTS.DATA_MODIFIED, {
      type: 'profile_update',
      fields: Object.keys(req.body)
    }, req);

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: userId,
        name: name || req.user.name,
        email: req.user.email,
        role: req.user.role,
        department: department || req.user.department,
        metadata: metadata
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};


// Get pending registrations (admin only)
const getPendingRegistrations = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, role, department, metadata, created_at FROM users WHERE status = 'pending' ORDER BY created_at DESC"
    );

    res.json({ users });
  } catch (error) {
    console.error('Get pending registrations error:', error);
    res.status(500).json({ error: 'Failed to get pending registrations' });
  }
};

// Approve/Reject registration
const updateRegistrationStatus = async (req, res) => {
  try {
    const { userId, status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.query('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

    res.json({ message: `User ${status} successfully` });
  } catch (error) {
    console.error('Update registration status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const { email, name } = req.body;

    // 1) Get user based on POSTed email and name
    const [users] = await db.query('SELECT * FROM users WHERE email = ? AND name = ?', [email, name]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];

    // 2) Generate the random reset token
    const resetToken = crypto.randomInt(100000, 1000000).toString();
    const hashedToken = await hashPassword(resetToken);

    // 3) Set token and expiry on user
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await db.query('UPDATE users SET resetOTP = ?, resetOTPExpiry = ?, otpAttempts = 0 WHERE id = ?', [
      hashedToken,
      new Date(expiry),
      user.id,
    ]);

    // 4) Send it to user's email
    const message = `Forgot your password? Submit this OTP to reset your password: ${resetToken}. This OTP is valid for 10 minutes.`;

    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });

    // Log password reset request
    await logSecurityEvent(user.id, SECURITY_EVENTS.PASSWORD_RESET_REQUESTED, {
      email: user.email
    }, req);

    res.status(200).json({ message: 'Token sent to email!' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Error sending email' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];

    if (user.otpAttempts >= 3) {
      return res.status(401).json({ error: 'Too many attempts. Please request a new OTP.' });
    }

    const isValid = await comparePassword(otp, user.resetOTP);

    if (!isValid) {
      await db.query('UPDATE users SET otpAttempts = otpAttempts + 1 WHERE id = ?', [user.id]);
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    if (user.resetOTPExpiry < new Date()) {
      return res.status(401).json({ error: 'OTP has expired' });
    }

    res.status(200).json({ message: 'OTP verified' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'OTP verification failed' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];


    const hashedPassword = await hashPassword(password);
    await db.query('UPDATE users SET password_hash = ?, resetOTP = NULL, resetOTPExpiry = NULL, otpAttempts = 0 WHERE id = ?', [
      hashedPassword,
      user.id,
    ]);

    // Log password reset completion
    await logSecurityEvent(user.id, SECURITY_EVENTS.PASSWORD_RESET_COMPLETED, {
      email: user.email
    }, req);

    const token = generateToken(user);
    res.status(200).json({ token, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // 1) Get user from the collection
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = users[0];

    // 2) Check if posted current password is correct
    const isValid = await comparePassword(oldPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect old password' });
    }

    // 3) If so, update password
    const hashedPassword = await hashPassword(newPassword);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);

    // Log password change
    await logSecurityEvent(user.id, SECURITY_EVENTS.PASSWORD_CHANGED, {
      email: user.email
    }, req);

    // 4) Log the user in, send JWT
    const token = generateToken(user);
    res.status(200).json({ token, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Password update failed' });
  }
};

module.exports = {
  checkFirstAdmin,
  register,
  registerStudent,
  login,
  getProfile,
  updateProfile,
  getPendingRegistrations,
  updateRegistrationStatus,
  forgotPassword,
  verifyOtp,
  resetPassword,
  updatePassword,
};
