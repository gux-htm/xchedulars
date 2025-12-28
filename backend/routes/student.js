const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { auth, isAdmin } = require('../middleware/auth');

// Public routes for registration (no auth required)
router.post('/register', studentController.registerStudent);
router.get('/programs', studentController.getPrograms);
router.get('/majors', studentController.getMajors);
router.get('/sections', studentController.getSections);

// Public route - Get student info by roll number (for timetable access)
router.get('/roll/:roll_number', studentController.getStudentByRollNumber);

// Public route - Get student timetable by roll number
router.get('/roll/:roll_number/timetable', studentController.getStudentTimetable);

// Protected routes - Admin only
router.get('/list', auth, isAdmin, studentController.getAllStudents);
router.get('/section/:section_id', auth, isAdmin, studentController.getStudentsBySection);
router.patch('/:id/status', auth, isAdmin, studentController.updateStudentStatus);

module.exports = router;
