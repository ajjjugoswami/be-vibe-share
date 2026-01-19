const express = require('express');
const router = express.Router();
const {
  getPlaylists,
  createPlaylist,
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
  likePlaylist,
  unlikePlaylist,
  savePlaylist,
  unsavePlaylist,
  getSavedPlaylists,
  createPlaylistSchema,
  updatePlaylistSchema,
  addSongSchema
} = require('../controllers/playlistController');
const {
  getPlaylistSongs,
  addSong,
  updateSong,
  deleteSong,
  reorderSongs,
  updateSongSchema,
  reorderSongsSchema
} = require('../controllers/songController');
const validate = require('../middleware/validation');
const authenticate = require('../middleware/auth');
const { optionalAuthenticate } = require('../middleware/auth');

// Playlist routes
router.get('/', optionalAuthenticate, getPlaylists);
router.post('/', authenticate, validate(createPlaylistSchema), createPlaylist);

// Get user's saved playlists (must come before /:id route)
router.get('/saved', authenticate, getSavedPlaylists);

router.get('/:id', getPlaylist);
router.put('/:id', authenticate, validate(updatePlaylistSchema), updatePlaylist);
router.delete('/:id', authenticate, deletePlaylist);
router.post('/:id/like', authenticate, likePlaylist);
router.delete('/:id/like', authenticate, unlikePlaylist);
router.post('/:id/save', authenticate, savePlaylist);
router.delete('/:id/save', authenticate, unsavePlaylist);

// Song routes
router.get('/:id/songs', getPlaylistSongs);
router.post('/:id/songs', authenticate, validate(addSongSchema), addSong);
router.put('/songs/:id', authenticate, validate(updateSongSchema), updateSong);
router.delete('/songs/:id', authenticate, deleteSong);
router.put('/:id/songs/reorder', authenticate, validate(reorderSongsSchema), reorderSongs);

module.exports = router;