const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    maxlength: 255
  },
  username: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50
  },
  passwordHash: {
    type: String,
    required: true,
    maxlength: 255
  },
  bio: {
    type: String
  },
  avatarUrl: {
    type: String
  },
  // NOTE: Follow/following features are not needed in v1
  // followersCount: {
  //   type: Number,
  //   default: 0
  // },
  // followingCount: {
  //   type: Number,
  //   default: 0
  // },
  playlistCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes are automatically created by unique: true
// userSchema.index({ email: 1 });
// userSchema.index({ username: 1 });

module.exports = mongoose.model('User', userSchema);