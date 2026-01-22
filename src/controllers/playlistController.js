const Playlist = require('../models/Playlist');
const Song = require('../models/Song');
const PlaylistLike = require('../models/PlaylistLike');
const SavedPlaylist = require('../models/SavedPlaylist');
const User = require('../models/User');
const Joi = require('joi');

// Validation schemas
const createPlaylistSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().allow(''),
  tags: Joi.array().items(Joi.string()).max(5),
  coverGradient: Joi.string().max(100),
  isPublic: Joi.boolean()
});

const updatePlaylistSchema = Joi.object({
  title: Joi.string().min(1).max(255),
  description: Joi.string().allow(''),
  tags: Joi.array().items(Joi.string()).max(5),
  coverGradient: Joi.string().max(100),
  isPublic: Joi.boolean()
});

const addSongSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  artist: Joi.string().min(1).max(255).required(),
  url: Joi.string().uri().required(),
  platform: Joi.string().min(1).max(50).required()
});

// Get playlists with filters
const getPlaylists = async (req, res) => {
  try {
    const { page = 1, limit = 20, user, tag, sort = 'recent' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // If a specific user is requested
    if (user) {
      query.userId = user;
      // If the requesting user is the same as the user whose playlists are being fetched,
      // show all playlists (public and private). Otherwise, only show public playlists.
      if (!req.user || req.user._id.toString() !== user) {
        query.isPublic = true;
      }
    } else {
      // If no specific user, only show public playlists
      query.isPublic = true;
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'popular') {
      sortOption = { likesCount: -1, createdAt: -1 };
    }

    const playlists = await Playlist.find(query)
      .populate('userId', 'username avatarUrl')
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sortOption);

    const total = await Playlist.countDocuments(query);

    // Add song count and user interaction status to each playlist
    const playlistsWithDetails = await Promise.all(
      playlists.map(async (playlist) => {
        const songCount = await Song.countDocuments({ playlistId: playlist._id });
        
        let isLiked = false;
        let isSaved = false;
        
        if (req.user?._id) {
          // Check if user has liked this playlist
          const like = await PlaylistLike.findOne({ 
            userId: req.user._id, 
            playlistId: playlist._id 
          });
          isLiked = !!like;
          
          // Check if user has saved this playlist
          const saved = await SavedPlaylist.findOne({ 
            userId: req.user._id, 
            playlistId: playlist._id 
          });
          isSaved = !!saved;
        }
        
        return {
          ...playlist.toObject(),
          username: playlist.userId.username,
          userAvatar: playlist.userId.avatarUrl,
          songCount,
          isLiked,
          isSaved
        };
      })
    );

    res.json({
      success: true,
      data: {
        playlists: playlistsWithDetails,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({ error: 'Failed to get playlists' });
  }
};

// Create playlist
const createPlaylist = async (req, res) => {
  try {
    const { title, description, tags, coverGradient, isPublic } = req.body;
    const userId = req.user._id;

    const playlist = new Playlist({
      userId,
      title,
      description,
      tags: tags || [],
      coverGradient,
      isPublic
    });

    await playlist.save();

    // Update user's playlist count
    await User.findByIdAndUpdate(userId, { $inc: { playlistCount: 1 } });

    // Populate user info
    await playlist.populate('userId', 'username avatarUrl');

    console.log('[PLAYLIST_CREATED]', { playlistId: playlist._id, userId, timestamp: new Date() });

    res.status(201).json({
      success: true,
      data: { playlist }
    });
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
};

// Get playlist details with songs
const getPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const playlist = await Playlist.findById(id).populate('userId', 'username avatarUrl');

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Check if private and not owner
    if (!playlist.isPublic && (!req.user || req.user._id.toString() !== playlist.userId._id.toString())) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const songs = await Song.find({ playlistId: id }).sort({ position: 1 });

    // Check if user liked/saved this playlist
    let isLiked = false;
    let isSaved = false;
    if (req.user) {
      const [like, saved] = await Promise.all([
        PlaylistLike.findOne({ userId: req.user._id, playlistId: id }),
        SavedPlaylist.findOne({ userId: req.user._id, playlistId: id })
      ]);
      isLiked = !!like;
      isSaved = !!saved;
    }

    res.json({
      success: true,
      data: {
        playlist: {
          ...playlist.toObject(),
          songs,
          isLiked,
          isSaved
        }
      }
    });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({ error: 'Failed to get playlist' });
  }
};

// Update playlist
const updatePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Check ownership
    if (playlist.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Can only update your own playlists' });
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('userId', 'username avatarUrl');

    res.json({
      success: true,
      data: { playlist: updatedPlaylist }
    });
  } catch (error) {
    console.error('Update playlist error:', error);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
};

// Delete playlist
const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Check ownership
    if (playlist.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Can only delete your own playlists' });
    }

    // Delete playlist and related data
    await Promise.all([
      Playlist.findByIdAndDelete(id),
      Song.deleteMany({ playlistId: id }),
      PlaylistLike.deleteMany({ playlistId: id }),
      SavedPlaylist.deleteMany({ playlistId: id })
    ]);

    // Update user's playlist count
    await User.findByIdAndUpdate(playlist.userId, { $inc: { playlistCount: -1 } });

    res.json({
      success: true,
      message: 'Playlist deleted successfully'
    });
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
};

// Like playlist
const likePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if playlist exists
    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Check if already liked
    const existingLike = await PlaylistLike.findOne({ userId, playlistId: id });
    if (existingLike) {
      return res.status(409).json({ error: 'Already liked this playlist' });
    }

    // Create like
    const like = new PlaylistLike({ userId, playlistId: id });
    await like.save();

    // Update playlist likes count
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      id,
      { $inc: { likesCount: 1 } },
      { new: true }
    );

    console.log('[PLAYLIST_LIKED]', { playlistId: id, userId, timestamp: new Date() });

    res.json({
      success: true,
      message: 'Playlist liked successfully',
      data: {
        likesCount: updatedPlaylist.likesCount
      }
    });
  } catch (error) {
    console.error('Like playlist error:', error);
    res.status(500).json({ error: 'Failed to like playlist' });
  }
};

// Unlike playlist
const unlikePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const like = await PlaylistLike.findOneAndDelete({ userId, playlistId: id });
    if (!like) {
      return res.status(404).json({ error: 'Like not found' });
    }

    // Update playlist likes count
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      id,
      { $inc: { likesCount: -1 } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Playlist unliked successfully',
      data: {
        likesCount: updatedPlaylist.likesCount
      }
    });
  } catch (error) {
    console.error('Unlike playlist error:', error);
    res.status(500).json({ error: 'Failed to unlike playlist' });
  }
};

// Save playlist
const savePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if playlist exists
    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Check if already saved
    const existingSave = await SavedPlaylist.findOne({ userId, playlistId: id });
    if (existingSave) {
      return res.status(409).json({ error: 'Already saved this playlist' });
    }

    // Create save
    const save = new SavedPlaylist({ userId, playlistId: id });
    await save.save();

    res.json({
      success: true,
      message: 'Playlist saved successfully'
    });
  } catch (error) {
    console.error('Save playlist error:', error);
    res.status(500).json({ error: 'Failed to save playlist' });
  }
};

// Unsave playlist
const unsavePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const save = await SavedPlaylist.findOneAndDelete({ userId, playlistId: id });
    if (!save) {
      return res.status(404).json({ error: 'Save not found' });
    }

    res.json({
      success: true,
      message: 'Playlist unsaved successfully'
    });
  } catch (error) {
    console.error('Unsave playlist error:', error);
    res.status(500).json({ error: 'Failed to unsave playlist' });
  }
};

// Get user's saved playlists
const getSavedPlaylists = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const savedPlaylists = await SavedPlaylist.find({ userId: req.user._id })
      .populate({
        path: 'playlistId',
        populate: { path: 'userId', select: 'username avatarUrl' }
      })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await SavedPlaylist.countDocuments({ userId: req.user._id });

    // Filter out null playlists (in case some were deleted)
    const validPlaylists = savedPlaylists
      .filter(saved => saved.playlistId)
      .map(saved => ({
        ...saved.playlistId.toObject(),
        isSaved: true,
        isLiked: false // We'll check this if needed
      }));

    res.json({
      success: true,
      data: {
        playlists: validPlaylists,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get saved playlists error:', error);
    res.status(500).json({ error: 'Failed to get saved playlists' });
  }
};

module.exports = {
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
};