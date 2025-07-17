const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  googleBooksId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  authors: [{
    type: String,
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  }],
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  categories: [{
    type: String,
    trim: true
  }],
  publishedDate: {
    type: String
  },
  pageCount: {
    type: Number,
    min: [1, 'Page count must be at least 1']
  },
  language: {
    type: String,
    default: 'en'
  },
  imageLinks: {
    thumbnail: String,
    small: String,
    medium: String,
    large: String
  },
  isbn: {
    isbn10: String,
    isbn13: String
  },
  publisher: {
    type: String,
    maxlength: [200, 'Publisher name cannot exceed 200 characters']
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  ratingsCount: {
    type: Number,
    default: 0
  },
  // Our app-specific data
  appRating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  musicVibes: [{
    genre: String,
    mood: String,
    energy: String,
    spotifyPlaylistId: String,
    youtubeMusicPlaylistId: String,
    suggestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    votes: {
      type: Number,
      default: 0
    }
  }],
  trending: {
    score: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bookSchema.index({ title: 'text', 'authors': 'text', description: 'text' });
bookSchema.index({ categories: 1 });
bookSchema.index({ 'trending.score': -1 });
bookSchema.index({ 'appRating.average': -1 });

// Virtual for display rating (prefer app rating over Google Books rating)
bookSchema.virtual('displayRating').get(function() {
  return this.appRating.count > 0 ? this.appRating.average : this.averageRating;
});

// Virtual for display rating count
bookSchema.virtual('displayRatingCount').get(function() {
  return this.appRating.count > 0 ? this.appRating.count : this.ratingsCount;
});

module.exports = mongoose.model('Book', bookSchema);
