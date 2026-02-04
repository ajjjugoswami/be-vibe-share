const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');

// All routes require authentication
router.use(authenticate);

// Get notifications
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark all as read
router.post('/mark-all-read', markAllAsRead);

// Mark specific notification as read
router.post('/:notificationId/read', markAsRead);

// Delete notification
router.delete('/:notificationId', deleteNotification);

module.exports = router;
