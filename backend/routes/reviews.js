const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Book = require('../models/Book');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Create a review
router.post('/', [
  authenticateToken,
  body('bookId')
    .notEmpty()
    .withMessage('Book ID is required'),
  body('rating')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('review')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Review cannot exceed 1000 characters'),
  body('musicVibeRating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Music vibe rating must be between 1 and 5'),
  body('musicVibeComment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Music vibe comment cannot exceed 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .isLength({ max: 30 })
    .withMessage('Each tag cannot exceed 30 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      bookId,
      rating,
      review,
      musicVibeRating,
      musicVibeComment,
      tags = [],
      isPublic = true
    } = req.body;

    const userId = req.user._id;

    // Check if book exists
    const book = await Book.findOne({
      $or: [
        { _id: bookId },
        { googleBooksId: bookId }
      ]
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if user has already reviewed this book
    const existingReview = await Review.findOne({
      user: userId,
      book: book._id
    });

    if (existingReview) {
      return res.status(409).json({
        error: 'You have already reviewed this book. Use PUT to update your review.'
      });
    }

    // Create new review
    const newReview = new Review({
      user: userId,
      book: book._id,
      rating,
      review: review || '',
      musicVibeRating,
      musicVibeComment: musicVibeComment || '',
      tags: tags.slice(0, 10), // Limit to 10 tags
      isPublic
    });

    await newReview.save();

    // Update book's average rating
    await updateBookRating(book._id);

    // Populate user data for response
    await newReview.populate('user', 'username profile.firstName profile.lastName');

    res.status(201).json({
      message: 'Review created successfully',
      review: newReview
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update a review
router.put('/:reviewId', [
  authenticateToken,
  body('rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('review')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Review cannot exceed 1000 characters'),
  body('musicVibeRating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Music vibe rating must be between 1 and 5'),
  body('musicVibeComment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Music vibe comment cannot exceed 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .isLength({ max: 30 })
    .withMessage('Each tag cannot exceed 30 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { reviewId } = req.params;
    const userId = req.user._id;

    // Find review
    const review = await Review.findOne({
      _id: reviewId,
      user: userId
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found or you do not have permission to edit it' });
    }

    // Update fields
    const updateFields = {};
    const allowedFields = ['rating', 'review', 'musicVibeRating', 'musicVibeComment', 'tags', 'isPublic'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    // Limit tags
    if (updateFields.tags) {
      updateFields.tags = updateFields.tags.slice(0, 10);
    }

    Object.assign(review, updateFields);
    await review.save();

    // Update book's average rating if rating was changed
    if (updateFields.rating !== undefined) {
      await updateBookRating(review.book);
    }

    // Populate user data for response
    await review.populate('user', 'username profile.firstName profile.lastName');

    res.json({
      message: 'Review updated successfully',
      review
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete a review
router.delete('/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    // Find and delete review
    const review = await Review.findOneAndDelete({
      _id: reviewId,
      user: userId
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found or you do not have permission to delete it' });
    }

    // Update book's average rating
    await updateBookRating(review.book);

    res.json({
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Get reviews for a book
router.get('/book/:bookId', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('sort')
    .optional()
    .isIn(['newest', 'oldest', 'highest', 'lowest', 'most_liked'])
    .withMessage('Sort must be newest, oldest, highest, lowest, or most_liked')
], optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { bookId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;
    const skip = (page - 1) * limit;

    // Find book
    const book = await Book.findOne({
      $or: [
        { _id: bookId },
        { googleBooksId: bookId }
      ]
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Build sort criteria
    let sortCriteria = {};
    switch (sort) {
      case 'newest':
        sortCriteria = { createdAt: -1 };
        break;
      case 'oldest':
        sortCriteria = { createdAt: 1 };
        break;
      case 'highest':
        sortCriteria = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortCriteria = { rating: 1, createdAt: -1 };
        break;
      case 'most_liked':
        sortCriteria = { likesCount: -1, createdAt: -1 };
        break;
    }

    // Get reviews
    const reviews = await Review.find({
      book: book._id,
      isPublic: true,
      flagged: false
    })
      .populate('user', 'username profile.firstName profile.lastName')
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Add user like status if authenticated
    if (req.user) {
      reviews.forEach(review => {
        review.isLikedByUser = review.likes.some(like => 
          like.toString() === req.user._id.toString()
        );
      });
    }

    const totalReviews = await Review.countDocuments({
      book: book._id,
      isPublic: true,
      flagged: false
    });

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalReviews,
        pages: Math.ceil(totalReviews / limit)
      },
      book: {
        id: book._id,
        title: book.title,
        authors: book.authors,
        averageRating: book.displayRating,
        ratingsCount: book.displayRatingCount
      }
    });

  } catch (error) {
    console.error('Get book reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get user's reviews
router.get('/user/:userId', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('include_private')
    .optional()
    .isBoolean()
    .withMessage('include_private must be a boolean')
], optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const { page = 1, limit = 10, include_private = false } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { user: userId };
    
    // Only include private reviews if it's the user's own profile
    if (!include_private || !req.user || req.user._id.toString() !== userId) {
      query.isPublic = true;
    }

    // Don't show flagged reviews
    query.flagged = false;

    // Get reviews
    const reviews = await Review.find(query)
      .populate('book', 'title authors imageLinks googleBooksId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalReviews = await Review.countDocuments(query);

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalReviews,
        pages: Math.ceil(totalReviews / limit)
      }
    });

  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch user reviews' });
  }
});

// Like/unlike a review
router.post('/:reviewId/like', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (!review.isPublic) {
      return res.status(403).json({ error: 'Cannot like private reviews' });
    }

    // Check if user already liked this review
    const likeIndex = review.likes.indexOf(userId);
    
    if (likeIndex > -1) {
      // Unlike
      review.likes.splice(likeIndex, 1);
    } else {
      // Like
      review.likes.push(userId);
    }

    await review.save();

    res.json({
      message: likeIndex > -1 ? 'Review unliked' : 'Review liked',
      likesCount: review.likesCount,
      isLiked: likeIndex === -1
    });

  } catch (error) {
    console.error('Like review error:', error);
    res.status(500).json({ error: 'Failed to like/unlike review' });
  }
});

// Flag a review
router.post('/:reviewId/flag', [
  authenticateToken,
  body('reason')
    .notEmpty()
    .withMessage('Reason for flagging is required')
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { reviewId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user already flagged this review
    const existingFlag = review.flaggedBy.find(flag => 
      flag.user.toString() === userId.toString()
    );

    if (existingFlag) {
      return res.status(409).json({ error: 'You have already flagged this review' });
    }

    // Add flag
    review.flaggedBy.push({
      user: userId,
      reason,
      flaggedAt: new Date()
    });

    // If multiple users have flagged, mark as flagged
    if (review.flaggedBy.length >= 3) {
      review.flagged = true;
    }

    await review.save();

    res.json({
      message: 'Review flagged successfully',
      flagCount: review.flaggedBy.length
    });

  } catch (error) {
    console.error('Flag review error:', error);
    res.status(500).json({ error: 'Failed to flag review' });
  }
});

// Helper function to update book rating
async function updateBookRating(bookId) {
  try {
    const reviews = await Review.find({ book: bookId, flagged: false });
    
    if (reviews.length === 0) {
      await Book.findByIdAndUpdate(bookId, {
        'appRating.average': 0,
        'appRating.count': 0
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await Book.findByIdAndUpdate(bookId, {
      'appRating.average': Math.round(averageRating * 10) / 10, // Round to 1 decimal
      'appRating.count': reviews.length
    });

    // Update trending score based on review activity
    const recentReviews = reviews.filter(review => 
      new Date() - review.createdAt < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );

    const trendingScore = averageRating * 2 + 
                         reviews.length * 0.5 + 
                         recentReviews.length * 2;

    await Book.findByIdAndUpdate(bookId, {
      'trending.score': trendingScore,
      'trending.lastUpdated': new Date()
    });

  } catch (error) {
    console.error('Error updating book rating:', error);
  }
}

module.exports = router;
