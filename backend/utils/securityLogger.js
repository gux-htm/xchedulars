const db = require('../config/db');

/**
 * Log security events for audit trail
 * @param {string} userId - User ID (can be null for failed login attempts)
 * @param {string} action - Security event type
 * @param {object} details - Additional details about the event
 * @param {object} req - Express request object
 */
const logSecurityEvent = async (userId, action, details, req) => {
  try {
    // Extract IP address (handle proxy scenarios)
    const ipAddress = req.ip || 
                     req.headers['x-forwarded-for']?.split(',')[0] || 
                     req.connection.remoteAddress || 
                     'Unknown';
    
    // Extract user agent
    const userAgent = req.get('user-agent') || 'Unknown';
    
    // Insert security log
    await db.query(
      'INSERT INTO security_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [userId, action, JSON.stringify(details), ipAddress, userAgent]
    );
    
    console.log(`[SECURITY] ${action} - User: ${userId || 'N/A'} - IP: ${ipAddress}`);
  } catch (error) {
    console.error('Security logging error:', error);
    // Don't throw - logging failure shouldn't break the app
  }
};

/**
 * Get security logs for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of logs to retrieve
 */
const getUserSecurityLogs = async (userId, limit = 50) => {
  try {
    const [logs] = await db.query(
      'SELECT * FROM security_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, limit]
    );
    return logs;
  } catch (error) {
    console.error('Error fetching security logs:', error);
    return [];
  }
};

/**
 * Get recent security events
 * @param {number} limit - Number of logs to retrieve
 */
const getRecentSecurityLogs = async (limit = 100) => {
  try {
    const [logs] = await db.query(
      `SELECT sl.*, u.name, u.email, u.role 
       FROM security_logs sl 
       LEFT JOIN users u ON sl.user_id = u.id 
       ORDER BY sl.timestamp DESC 
       LIMIT ?`,
      [limit]
    );
    return logs;
  } catch (error) {
    console.error('Error fetching recent security logs:', error);
    return [];
  }
};

/**
 * Get failed login attempts for an IP
 * @param {string} ipAddress - IP address
 * @param {number} windowMinutes - Time window in minutes
 */
const getFailedLoginAttempts = async (ipAddress, windowMinutes = 15) => {
  try {
    const [attempts] = await db.query(
      `SELECT COUNT(*) as count 
       FROM security_logs 
       WHERE action = ? 
       AND ip_address = ? 
       AND timestamp > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [SECURITY_EVENTS.LOGIN_FAILED, ipAddress, windowMinutes]
    );
    return attempts[0].count;
  } catch (error) {
    console.error('Error fetching failed login attempts:', error);
    return 0;
  }
};

/**
 * Clean old security logs (for maintenance)
 * @param {number} daysToKeep - Number of days to keep logs
 */
const cleanOldSecurityLogs = async (daysToKeep = 90) => {
  try {
    const [result] = await db.query(
      'DELETE FROM security_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [daysToKeep]
    );
    console.log(`Cleaned ${result.affectedRows} old security logs`);
    return result.affectedRows;
  } catch (error) {
    console.error('Error cleaning old security logs:', error);
    return 0;
  }
};

// Security event types
const SECURITY_EVENTS = {
  // Authentication Events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
  
  // Password Events
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  OTP_GENERATED: 'OTP_GENERATED',
  OTP_VERIFIED: 'OTP_VERIFIED',
  OTP_FAILED: 'OTP_FAILED',
  
  // Authorization Events
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  
  // Account Events
  ACCOUNT_CREATED: 'ACCOUNT_CREATED',
  ACCOUNT_APPROVED: 'ACCOUNT_APPROVED',
  ACCOUNT_REJECTED: 'ACCOUNT_REJECTED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  
  // Data Events
  DATA_CREATED: 'DATA_CREATED',
  DATA_MODIFIED: 'DATA_MODIFIED',
  DATA_DELETED: 'DATA_DELETED',
  DATA_EXPORTED: 'DATA_EXPORTED',
  
  // Security Events
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  CSRF_DETECTED: 'CSRF_DETECTED',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT'
};

module.exports = {
  logSecurityEvent,
  getUserSecurityLogs,
  getRecentSecurityLogs,
  getFailedLoginAttempts,
  cleanOldSecurityLogs,
  SECURITY_EVENTS
};
