const Playlist = require('../models/Playlist');
const User = require('../models/User');
const UserFollow = require('../models/UserFollow');

// Get personalized feed (playlists from followed users)
const getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Get users that current user follows
    const following = await UserFollow.find({ followerId: req.user._id });
    const followingIds = following.map(f => f.followingId);

    // Include user's own playlists
    followingIds.push(req.user._id);

    const playlists = await Playlist.find({
      userId: { $in: followingIds },
      isPublic: true
    })
    .populate('userId', 'username')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

    const total = await Playlist.countDocuments({
      userId: { $in: followingIds },
      isPublic: true
    });

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