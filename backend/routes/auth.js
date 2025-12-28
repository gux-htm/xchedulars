
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth, isAdmin } = require('../middleware/auth');
const { validate, sanitize } = require('../middleware/validation');

router.get('/check-first-admin', authController.checkFirstAdmin);
router.post('/register', validate('register'), authController.register);
router.post('/register-student', validate('registerStudent'), authController.registerStudent);
router.post('/login', validate('login'), authController.login);
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, validate('updateProfile'), authController.updateProfile);
router.get('/pending-registrations', auth, isAdmin, authController.getPendingRegistrations);
router.post('/update-registration-status', auth, isAdmin, authController.updateRegistrationStatus);

// Password Reset
router.post('/forgot-password', validate('forgotPassword'), authController.forgotPassword);
router.post('/verify-otp', validate('verifyOtp'), authController.verifyOtp);
router.post('/reset-password', validate('resetPassword'), authController.resetPassword);

// Update Password
router.post('/update-password', auth, validate('updatePassword'), authController.updatePassword);

module.exports = router;
