const User = require('../models/User');
const Playlist = require('../models/Playlist');
const UserFollow = require('../models/UserFollow');
const PlaylistLike = require('../models/PlaylistLike');
const SavedPlaylist = require('../models/SavedPlaylist');
const Song = require('../models/Song');

// Get users with pagination
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { bio: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

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
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

// Get user by username
const getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // NOTE: Follow/following features are not needed in v1
    // Check if current user is following this user
    // let isFollowing = false;
    // if (req.user) {
    //   const follow = await UserFollow.findOne({
    //     followerId: req.user._id,
    //     followingId: user._id
    //   });
    //   isFollowing = !!follow;
    // }

    res.json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          // NOTE: Follow/following features are not needed in v1
          // isFollowing
        }
      }
    });
  } catch (error) {
    console.error('Get user by username error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // NOTE: Follow/following features are not needed in v1
    // Check if current user is following this user
    // let isFollowing = false;
    // if (req.user) {
    //   const follow = await UserFollow.findOne({
    //     followerId: req.user._id,
    //     followingId: user._id
    //   });
    //   isFollowing = !!follow;
    // }

    res.json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          // NOTE: Follow/following features are not needed in v1
          // isFollowing
        }
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// Update user profile
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { bio, avatarUrl } = req.body;

    // Check if user is updating their own profile
    if (req.user._id.toString() !== id) {
      return res.status(403).json({ error: 'Can only update your own profile' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { bio, avatarUrl },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user account
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is deleting their own account
    if (req.user._id.toString() !== id) {
      return res.status(403).json({ error: 'Can only delete your own account' });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Get user's playlists
const getUserPlaylists = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let query = { userId: id };
    
    // If not the owner, only show public playlists
    if (!req.user || req.user._id.toString() !== id) {
      query.isPublic = true;
    }

    const playlists = await Playlist.find(query)
      .populate('userId', 'username')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

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
    console.error('Get user playlists error:', error);
    res.status(500).json({ error: 'Failed to get playlists' });
  }
};

// NOTE: Follow/following features are not needed in v1
/*
const getUserFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const followers = await UserFollow.find({ followingId: id })
      .populate('followerId', '-passwordHash')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await UserFollow.countDocuments({ followingId: id });

    res.json({
      success: true,
      data: {
        followers: followers.map(f => f.followerId),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user followers error:', error);
    res.status(500).json({ error: 'Failed to get followers' });
  }
};

// Get users that user is following
const getUserFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const following = await UserFollow.find({ followerId: id })
      .populate('followingId', '-passwordHash')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await UserFollow.countDocuments({ followerId: id });

    res.json({
      success: true,
      data: {
        following: following.map(f => f.followingId),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user following error:', error);
    res.status(500).json({ error: 'Failed to get following' });
  }
};

// Follow a user
const followUser = async (req, res) => {
  try {
    const { id } = req.params;
    const followerId = req.user._id;

    if (followerId.toString() === id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const existingFollow = await UserFollow.findOne({
      followerId,
      followingId: id
    });

    if (existingFollow) {
      return res.status(409).json({ error: 'Already following this user' });
    }

    // Create follow relationship
    const follow = new UserFollow({
      followerId,
      followingId: id
    });
    await follow.save();

    // Update counts
    await User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } });
    const updatedUser = await User.findByIdAndUpdate(id, { $inc: { followersCount: 1 } }, { new: true });

    console.log('[USER_FOLLOWED]', { followerId, followingId: id, timestamp: new Date() });

    res.json({
      success: true,
      message: 'Successfully followed user',
      data: {
        followersCount: updatedUser.followersCount
      }
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
};

// Unfollow a user
const unfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const followerId = req.user._id;

    const follow = await UserFollow.findOneAndDelete({
      followerId,
      followingId: id
    });

    if (!follow) {
      return res.status(404).json({ error: 'Not following this user' });
    }

    // Update counts
    await User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } });
    const updatedUser = await User.findByIdAndUpdate(id, { $inc: { followersCount: -1 } }, { new: true });

    res.json({
      success: true,
      message: 'Successfully unfollowed user',
      data: {
        followersCount: updatedUser.followersCount
      }
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
};
*/

module.exports = {
  getUsers,
  getUserByUsername,
  getUserById,
  updateUser,
  deleteUser,
  getUserPlaylists,
  // NOTE: Follow/following features are not needed in v1
  // getUserFollowers,
  // getUserFollowing,
  // followUser,
  // unfollowUser
};