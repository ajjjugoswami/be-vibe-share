const Playlist = require('../models/Playlist');
const User = require('../models/User');
const UserFollow = require('../models/UserFollow');

// Get feed (personalized if authenticated, public trending if not)
const getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let playlists, total;

    if (req.user) {
      // Authenticated: Get personalized feed
      const following = await UserFollow.find({ followerId: req.user._id });
      const followingIds = following.map(f => f.followingId);
      followingIds.push(req.user._id);

      playlists = await Playlist.find({
        userId: { $in: followingIds },
        isPublic: true
      })
      .populate('userId', 'username')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

      total = await Playlist.countDocuments({
        userId: { $in: followingIds },
        isPublic: true
      });
    } else {
      // Not authenticated: Get public trending playlists
      playlists = await Playlist.find({ isPublic: true })
        .populate('userId', 'username')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ likesCount: -1, createdAt: -1 });

      total = await Playlist.countDocuments({ isPublic: true });
    }

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
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Failed to get feed' });
  }
};

module.exports = {
  getFeed
};