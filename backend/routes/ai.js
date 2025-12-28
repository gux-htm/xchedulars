
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { auth, isAdmin } = require('../middleware/auth');

router.get('/analyze', auth, isAdmin, aiController.analyzeTimetable);

module.exports = router;
