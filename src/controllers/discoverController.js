const User = require('../models/User');
const Playlist = require('../models/Playlist');
const UserFollow = require('../models/UserFollow');

// Get suggested users to follow
const getSuggestedUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Get users that current user already follows
    const following = await UserFollow.find({ followerId: req.user._id });
    const followingIds = following.map(f => f.followingId);
    followingIds.push(req.user._id); // Exclude self

    // Get users not followed, sorted by follower count
    const users = await User.find({
      _id: { $nin: followingIds }
    })
    .select('-passwordHash')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ followersCount: -1, createdAt: -1 });

    const total = await User.countDocuments({
      _id: { $nin: followingIds }
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get suggested users error:', error);
    res.status(500).json({ error: 'Failed to get suggested users' });
  }
};

// Get trending playlists
const getTrendingPlaylists = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const playlists = await Playlist.find({ isPublic: true })
      .populate('userId', 'username')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ likesCount: -1, createdAt: -1 });

    const total = await Playlist.countDocuments({ isPublic: true });

    res.json({
      success: true,
      data: {
        playlists,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get trending playlists error:', error);
    res.status(500).json({ error: 'Failed to get trending playlists' });
  }
};

// Get playlists by tag
const getPlaylistsByTag = async (req, res) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const playlists = await Playlist.find({
      isPublic: true,
      tags: { $in: [tag] }
    })
    .populate('userId', 'username')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ likesCount: -1, createdAt: -1 });

    const total = await Playlist.countDocuments({
      isPublic: true,
      tags: { $in: [tag] }
    });

    res.json({
      success: true,
      data: {
        playlists,
        tag,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get playlists by tag error:', error);
    res.status(500).json({ error: 'Failed to get playlists by tag' });
  }
};

module.exports = {
  getSuggestedUsers,
  getTrendingPlaylists,
  getPlaylistsByTag
};