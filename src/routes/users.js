const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserByUsername,
  getUserById,
  updateUser,
  deleteUser,
  getUserPlaylists,
  getUserFollowers,
  getUserFollowing,
  followUser,
  unfollowUser
} = require('../controllers/userController');
const authenticate = require('../middleware/auth');

// Routes
router.get('/', getUsers);
router.get('/id/:id', getUserById);
router.get('/:username', getUserByUsername);
router.put('/:id', authenticate, updateUser);
router.delete('/:id', authenticate, deleteUser);
router.get('/:id/playlists', getUserPlaylists);
router.get('/:id/followers', getUserFollowers);
router.get('/:id/following', getUserFollowing);
router.post('/:id/follow', authenticate, followUser);
router.delete('/:id/follow', authenticate, unfollowUser);

module.exports = router;