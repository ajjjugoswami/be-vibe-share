const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  refresh,
  logout,
  googleAuth,
  googleAuthCallback,
  registerSchema,
  loginSchema
} = require('../controllers/authController');
const validate = require('../middleware/validation');
const authenticate = require('../middleware/auth');

// Routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);

module.exports = router;