const express = require('express');
const axios = require('axios');
const { query, validationResult } = require('express-validator');
const Book = require('../models/Book');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Google Books API service
class GoogleBooksService {
  static async searchBooks(searchQuery, startIndex = 0, maxResults = 20) {
    try {
      const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
      const baseUrl = 'https://www.googleapis.com/books/v1/volumes';
      
      const params = {
        q: searchQuery,
        startIndex,
        maxResults: Math.min(maxResults, 40), // Limit to prevent abuse
        printType: 'books',
        langRestrict: 'en'
      };

      if (apiKey) {
        params.key = apiKey;
      }

      const response = await axios.get(baseUrl, { params });
      return response.data;
    } catch (error) {
      console.error('Google Books API error:', error.message);
      throw new Error('Failed to fetch books from Google Books API');
    }
  }

  static async getBookById(googleBooksId) {
    try {
      const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
      const url = `https://www.googleapis.com/books/v1/volumes/${googleBooksId}`;
      
      const params = {};
      if (apiKey) {
        params.key = apiKey;
      }

      const response = await axios.get(url, { params });
      return response.data;
    } catch (error) {
      console.error('Google Books API error:', error.message);
      throw new Error('Failed to fetch book details from Google Books API');
    }
  }

  static normalizeBookData(googleBook) {
    const volumeInfo = googleBook.volumeInfo || {};
    const imageLinks = volumeInfo.imageLinks || {};
    
    return {
      googleBooksId: googleBook.id,
      title: volumeInfo.title || 'Unknown Title',
      authors: volumeInfo.authors || ['Unknown Author'],
      description: volumeInfo.description || '',
      categories: volumeInfo.categories || [],
      publishedDate: volumeInfo.publishedDate || '',
      pageCount: volumeInfo.pageCount || 0,
      language: volumeInfo.language || 'en',
      imageLinks: {
        thumbnail: imageLinks.thumbnail?.replace('http://', 'https://') || '',
        small: imageLinks.small?.replace('http://', 'https://') || '',
        medium: imageLinks.medium?.replace('http://', 'https://') || '',
        large: imageLinks.large?.replace('http://', 'https://') || ''
      },
      isbn: {
        isbn10: volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier || '',
        isbn13: volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || ''
      },
      publisher: volumeInfo.publisher || '',
      averageRating: volumeInfo.averageRating || 0,
      ratingsCount: volumeInfo.ratingsCount || 0
    };
  }
}

// Search books
router.get('/search', [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  query('page')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page must be a number between 1 and 100'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be a number between 1 and 20')
], optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { q: searchQuery, page = 1, limit = 10 } = req.query;
    const startIndex = (page - 1) * limit;

    // Search Google Books API
    const googleBooksData = await GoogleBooksService.searchBooks(
      searchQuery,
      startIndex,
      parseInt(limit)
    );

    if (!googleBooksData.items) {
      return res.json({
        books: [],
        totalItems: 0,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    }

    // Process and normalize book data
    const books = await Promise.all(
      googleBooksData.items.map(async (googleBook) => {
        const normalizedData = GoogleBooksService.normalizeBookData(googleBook);
        
        try {
          // Try to check if book exists in our database
          let book = await Book.findOne({ googleBooksId: googleBook.id });
          
          if (!book) {
            // Create new book entry
            book = new Book(normalizedData);
            await book.save();
          } else {
            // Update existing book with latest Google Books data
            Object.assign(book, normalizedData);
            await book.save();
          }

          return book;
        } catch (dbError) {
          // Database unavailable - return normalized Google Books data directly
          console.log('Database unavailable, using Google Books data directly');
          return {
            ...normalizedData,
            _id: normalizedData.googleBooksId,
            musicVibes: [],
            reviews: [],
            displayRating: normalizedData.averageRating,
            displayRatingCount: normalizedData.ratingsCount
          };
        }
      })
    );

    res.json({
      books,
      totalItems: googleBooksData.totalItems || 0,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Books search error:', error);
    res.status(500).json({ error: 'Failed to search books' });
  }
});

// Get trending books
router.get('/trending', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be a number between 1 and 50')
], optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { limit = 20 } = req.query;

    // Get trending books based on our algorithm
    const trendingBooks = await Book.find({})
      .sort({ 'trending.score': -1, 'appRating.average': -1, ratingsCount: -1 })
      .limit(parseInt(limit))
      .lean();

    // If we don't have enough trending books, fetch popular ones from Google Books
    if (trendingBooks.length < limit) {
      const neededBooks = limit - trendingBooks.length;
      
      try {
        // Search for popular fiction books
        const googleBooksData = await GoogleBooksService.searchBooks(
          'fiction bestseller',
          0,
          neededBooks
        );

        if (googleBooksData.items) {
          const newBooks = await Promise.all(
            googleBooksData.items
              .filter(item => !trendingBooks.find(book => book.googleBooksId === item.id))
              .slice(0, neededBooks)
              .map(async (googleBook) => {
                const normalizedData = GoogleBooksService.normalizeBookData(googleBook);
                
                let book = await Book.findOne({ googleBooksId: googleBook.id });
                
                if (!book) {
                  // Set initial trending score for new books
                  normalizedData.trending = {
                    score: Math.random() * 10 + (normalizedData.ratingsCount * 0.1),
                    lastUpdated: new Date()
                  };
                  
                  book = new Book(normalizedData);
                  await book.save();
                }

                return book;
              })
          );

          trendingBooks.push(...newBooks);
        }
      } catch (apiError) {
        console.error('Error fetching trending books from API:', apiError);
        // Continue with what we have
      }
    }

    res.json({
      books: trendingBooks.slice(0, limit),
      totalItems: trendingBooks.length
    });

  } catch (error) {
    console.error('Trending books error:', error);
    res.status(500).json({ error: 'Failed to fetch trending books' });
  }
});

// Get book by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    try {
      // Try to find book in our database first
      let book = await Book.findOne({
        $or: [
          { _id: id },
          { googleBooksId: id }
        ]
      });

      // If not found in database, try to fetch from Google Books API
      if (!book && id.length > 10) { // Google Books IDs are longer
        try {
          const googleBookData = await GoogleBooksService.getBookById(id);
          const normalizedData = GoogleBooksService.normalizeBookData(googleBookData);
          
          book = new Book(normalizedData);
          await book.save();
        } catch (apiError) {
          console.error('Error fetching book from Google Books:', apiError);
        }
      }

      if (book) {
        return res.json({ book });
      }
    } catch (dbError) {
      console.log('Database unavailable, trying Google Books API directly');
    }

    // Fallback: Try Google Books API directly (without database)
    if (id.length > 10) { // Google Books ID format
      try {
        const googleBookData = await GoogleBooksService.getBookById(id);
        const normalizedData = GoogleBooksService.normalizeBookData(googleBookData);
        
        // Return book data directly without saving to database
        const book = {
          ...normalizedData,
          _id: normalizedData.googleBooksId,
          musicVibes: [],
          reviews: [],
          displayRating: normalizedData.averageRating,
          displayRatingCount: normalizedData.ratingsCount
        };
        
        return res.json({ book });
      } catch (apiError) {
        console.error('Error fetching book from Google Books:', apiError);
      }
    }

    return res.status(404).json({ error: 'Book not found' });

  } catch (error) {
    console.error('Book fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// Get books by category
router.get('/category/:category', [
  query('page')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page must be a number between 1 and 100'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be a number between 1 and 20')
], optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Search in our database first
    const books = await Book.find({
      categories: { $regex: new RegExp(category, 'i') }
    })
      .sort({ 'appRating.average': -1, ratingsCount: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalItems = await Book.countDocuments({
      categories: { $regex: new RegExp(category, 'i') }
    });

    // If we don't have enough books, search Google Books API
    if (books.length < limit && page === 1) {
      try {
        const googleBooksData = await GoogleBooksService.searchBooks(
          `subject:${category}`,
          0,
          limit - books.length
        );

        if (googleBooksData.items) {
          const newBooks = await Promise.all(
            googleBooksData.items
              .filter(item => !books.find(book => book.googleBooksId === item.id))
              .map(async (googleBook) => {
                const normalizedData = GoogleBooksService.normalizeBookData(googleBook);
                
                let book = await Book.findOne({ googleBooksId: googleBook.id });
                
                if (!book) {
                  book = new Book(normalizedData);
                  await book.save();
                }

                return book;
              })
          );

          books.push(...newBooks);
        }
      } catch (apiError) {
        console.error('Error fetching category books from API:', apiError);
      }
    }

    res.json({
      books: books.slice(0, limit),
      totalItems: Math.max(totalItems, books.length),
      page: parseInt(page),
      limit: parseInt(limit),
      category
    });

  } catch (error) {
    console.error('Category books error:', error);
    res.status(500).json({ error: 'Failed to fetch books by category' });
  }
});

module.exports = router;
