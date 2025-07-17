const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be between 1 and 5'],
    max: [5, 'Rating must be between 1 and 5']
  },
  review: {
    type: String,
    maxlength: [1000, 'Review cannot exceed 1000 characters'],
    trim: true
  },
  musicVibeRating: {
    type: Number,
    min: [1, 'Music vibe rating must be between 1 and 5'],
    max: [5, 'Music vibe rating must be between 1 and 5']
  },
  musicVibeComment: {
    type: String,
    maxlength: [500, 'Music vibe comment cannot exceed 500 characters'],
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  flagged: {
    type: Boolean,
    default: false
  },
  flaggedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    flaggedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound index to ensure one review per user per book
reviewSchema.index({ user: 1, book: 1 }, { unique: true });

// Index for finding reviews by book
reviewSchema.index({ book: 1, isPublic: 1, flagged: 1 });

// Index for finding user's reviews
reviewSchema.index({ user: 1, isPublic: 1 });

// Virtual for likes count (in case we want to calculate it dynamically)
reviewSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Update likes count before saving
reviewSchema.pre('save', function(next) {
  if (this.isModified('likes')) {
    this.likesCount = this.likes ? this.likes.length : 0;
  }
  next();
});

module.exports = mongoose.model('Review', reviewSchema);
