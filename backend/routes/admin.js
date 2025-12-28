const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, isAdmin } = require('../middleware/auth');
const { validate, sanitize } = require('../middleware/validation');

// All routes require admin authentication
router.use(auth);
router.use(isAdmin);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Programs
router.post('/programs', adminController.createProgram);
router.get('/programs', adminController.getPrograms);

// Majors
router.post('/majors', adminController.createMajor);
router.get('/majors', adminController.getMajors);

// Courses
router.post('/courses', validate('createCourse'), adminController.createCourse);
router.get('/courses', adminController.getCourses);
router.put('/courses/:id', sanitize, adminController.updateCourse);
router.delete('/courses/:id', sanitize, adminController.deleteCourse);

// Sections
router.post('/sections', validate('createSection'), adminController.createSection);
router.get('/sections', adminController.getSections);
router.put('/sections/:id', sanitize, adminController.updateSection);
router.delete('/sections/:id', sanitize, adminController.deleteSection);
router.get('/sections/:sectionName/record', sanitize, adminController.getSectionRecord);
router.post('/sections/:id/assign-courses', sanitize, adminController.assignCoursesToSection);
router.post('/sections/:id/promote', sanitize, adminController.promoteSection);
router.post('/section-records', sanitize, adminController.createSectionRecord);
router.put('/section-records/:id', sanitize, adminController.updateSectionRecord);
router.delete('/section-records/:id', sanitize, adminController.deleteSectionRecord);

// Rooms
router.post('/rooms', validate('createRoom'), adminController.createRoom);
router.get('/rooms', adminController.getRooms);
router.put('/rooms/:id', sanitize, adminController.updateRoom);
router.delete('/rooms/:id', sanitize, adminController.deleteRoom);

// Instructors
router.get('/instructors', adminController.getInstructors);

module.exports = router;
