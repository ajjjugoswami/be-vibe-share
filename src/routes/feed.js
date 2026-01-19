const express = require('express');
const router = express.Router();
const { getFeed } = require('../controllers/feedController');
const authenticate = require('../middleware/auth');

// Routes
router.get('/', authenticate, getFeed);

module.exports = router;