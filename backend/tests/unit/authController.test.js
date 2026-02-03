const authController = require('../../controllers/authController');
const db = require('../../config/db');
const helpers = require('../../utils/helpers');
const email = require('../../utils/email');
const securityLogger = require('../../utils/securityLogger');

// Mock dependencies
jest.mock('../../config/db');
jest.mock('../../utils/helpers');
jest.mock('../../utils/email');
jest.mock('../../utils/securityLogger');

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('jest-test')
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('checkFirstAdmin', () => {
    it('should return true if no approved admins exist', async () => {
      // Mock db query response
      db.query.mockResolvedValue([[{ count: 0 }]]);

      await authController.checkFirstAdmin(req, res);

      expect(db.query).toHaveBeenCalledWith(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'approved'"
      );
      expect(res.json).toHaveBeenCalledWith({ isFirstAdmin: true });
    });

    it('should return false if approved admins exist', async () => {
      // Mock db query response
      db.query.mockResolvedValue([[{ count: 1 }]]);

      await authController.checkFirstAdmin(req, res);

      expect(res.json).toHaveBeenCalledWith({ isFirstAdmin: false });
    });

    it('should handle database errors', async () => {
      const error = new Error('DB Error');
      db.query.mockRejectedValue(error);

      await authController.checkFirstAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Server error' });
    });
  });

  describe('register', () => {
    beforeEach(() => {
      req.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'instructor',
        department: 'CS'
      };
      
      // Default mocks
      helpers.generateUUID.mockReturnValue('user-uuid');
      helpers.hashPassword.mockResolvedValue('hashed-password');
      helpers.generateToken.mockReturnValue('jwt-token');
      securityLogger.SECURITY_EVENTS = { ACCOUNT_CREATED: 'ACCOUNT_CREATED' };
    });

    it('should fail if required fields are missing', async () => {
      req.body.email = '';
      await authController.register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Name, email, and password are required' });
    });

    it('should fail if email already exists', async () => {
      db.query.mockResolvedValueOnce([[{ id: 'existing-id' }]]); // Check email exists

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email already registered' });
    });

    it('should register a new user successfully (pending approval)', async () => {
      db.query
        .mockResolvedValueOnce([[]]) // Check email (none)
        .mockResolvedValueOnce([[{ count: 1 }]]); // Check first admin (exists)
      
      db.query.mockResolvedValueOnce({}); // Insert query

      await authController.register(req, res);

      expect(helpers.hashPassword).toHaveBeenCalledWith('password123');
      expect(db.query).toHaveBeenCalledTimes(3);
      expect(securityLogger.logSecurityEvent).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Registration successful. Awaiting admin approval.',
        user: expect.objectContaining({ status: 'pending' })
      }));
    });

    it('should register first admin as approved', async () => {
      req.body.role = 'admin';
      
      db.query
        .mockResolvedValueOnce([[]]) // Check email (none)
        .mockResolvedValueOnce([[{ count: 0 }]]); // Check first admin (none)
      
      db.query.mockResolvedValueOnce({}); // Insert query

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Registration successful',
        user: expect.objectContaining({ status: 'approved' })
      }));
      expect(helpers.generateToken).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    beforeEach(() => {
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };
      securityLogger.SECURITY_EVENTS = { 
        LOGIN_SUCCESS: 'LOGIN_SUCCESS',
        LOGIN_FAILED: 'LOGIN_FAILED'
      };
    });

    it('should fail if user not found', async () => {
      db.query.mockResolvedValue([[]]); // No user found

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should fail if account not approved', async () => {
      db.query.mockResolvedValue([[{ 
        id: 'user-id', 
        email: 'test@example.com', 
        status: 'pending' 
      }]]);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account pending approval' });
    });

    it('should fail if password invalid', async () => {
      db.query.mockResolvedValue([[{ 
        id: 'user-id', 
        email: 'test@example.com', 
        status: 'approved',
        password_hash: 'hashed-password',
        loginAttempts: 0
      }]]);
      helpers.comparePassword.mockResolvedValue(false);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        error: expect.stringContaining('Invalid credentials') 
      }));
      // Should increment failed attempts
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET loginAttempts'),
        expect.any(Array)
      );
    });

    it('should lock the account after too many failed attempts', async () => {
      db.query.mockResolvedValue([[{
        id: 'user-id',
        email: 'test@example.com',
        status: 'approved',
        password_hash: 'hashed-password',
        loginAttempts: 5,
        lastFailedLogin: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      }]]);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(423);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Account locked'),
        lockoutRemaining: expect.any(Number)
      }));
      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'user-id',
        securityLogger.SECURITY_EVENTS.LOGIN_FAILED,
        expect.objectContaining({ reason: 'Account locked' }),
        req
      );
    });

    it('should login successfully', async () => {
      const user = { 
        id: 'user-id', 
        email: 'test@example.com', 
        name: 'Test',
        status: 'approved',
        password_hash: 'hashed-password',
        role: 'admin',
        department: 'CS',
        metadata: '{}',
        loginAttempts: 0
      };
      
      db.query.mockResolvedValue([ [user] ]);
      helpers.comparePassword.mockResolvedValue(true);
      helpers.generateToken.mockReturnValue('jwt-token');

      await authController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Login successful',
        token: 'jwt-token'
      }));
      // Should reset login attempts
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET loginAttempts = 0'),
        expect.any(Array)
      );
    });
  });
});
