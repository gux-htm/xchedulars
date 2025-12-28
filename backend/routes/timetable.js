const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { auth, isAdmin, isInstructor } = require('../middleware/auth');

// Admin routes
router.post('/generate-requests', auth, isAdmin, timetableController.generateCourseRequests);
router.post('/generate', auth, isAdmin, timetableController.generateTimetable);
router.post('/reset', auth, isAdmin, timetableController.resetTimetable);

// Instructor routes
router.post('/select-slots', auth, isInstructor, timetableController.selectSlots);
router.post('/undo-acceptance', auth, isInstructor, timetableController.undoCourseAcceptance);
router.post('/reschedule', auth, isInstructor, timetableController.rescheduleClass);
router.post('/accept-request', auth, isInstructor, timetableController.acceptCourseRequest);

// Schedule routes (Problem 1 fix)
router.get('/instructors/:instructor_id/schedule', auth, timetableController.getInstructorSchedule);
router.get('/my-schedule', auth, isInstructor, timetableController.getInstructorSchedule);

// Available slots routes (Problem 2 fix)
router.get('/course-requests/:request_id/available-slots', auth, isInstructor, timetableController.getAvailableSlotsForRequest);

// Common routes
router.get('/requests', auth, timetableController.getCourseRequests);
router.get('/', auth, timetableController.getTimetable);
router.get('/available-slots', auth, isInstructor, timetableController.getAvailableSlots);

module.exports = router;
