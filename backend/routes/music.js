const express = require('express');
const axios = require('axios');
const { body, query, validationResult } = require('express-validator');
const Book = require('../models/Book');
const User = require('../models/User');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const BookAnalyzer = require('../services/BookAnalyzer');

const router = express.Router();

// Initialize the AI book analyzer
const bookAnalyzer = new BookAnalyzer();

// Spotify API service
class SpotifyService {
  static async getAccessToken() {
    try {
      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.warn('Spotify credentials not configured, using fallback');
        return null;
      }

      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
          }
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error('Spotify token error:', error.message);
      return null;
    }
  }

  static async searchTracks(query, limit = 20) {
    try {
      const accessToken = await this.getAccessToken();
      
      if (!accessToken) {
        // Return fallback recommendations
        return this.getFallbackTracks(query, limit);
      }
      
      const response = await axios.get('https://api.spotify.com/v1/search', {
        params: {
          q: query,
          type: 'track',
          limit,
          market: 'US'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data.tracks.items;
    } catch (error) {
      console.error('Spotify search error:', error.message);
      return this.getFallbackTracks(query, limit);
    }
  }

  static getFallbackTracks(query, limit = 20) {
    // Curated tracks for common book genres/themes
    const fallbackTracks = {
      'fantasy': [
        { name: 'Concerning Hobbits', artists: ['Howard Shore'], album: 'The Lord of the Rings', preview_url: 'https://example.com/preview1' },
        { name: 'The Shire', artists: ['Howard Shore'], album: 'The Fellowship of the Ring', preview_url: null },
        { name: 'Medieval Cat', artists: ['Lute Music'], album: 'Renaissance Collection', preview_url: null }
      ],
      'scifi science fiction': [
        { name: 'Blade Runner Blues', artists: ['Vangelis'], album: 'Blade Runner', preview_url: null },
        { name: 'Main Theme', artists: ['John Williams'], album: 'Star Wars', preview_url: null },
        { name: 'Space Oddity', artists: ['David Bowie'], album: 'Space Oddity', preview_url: null }
      ],
      'mystery thriller': [
        { name: 'Gymnopédie No. 1', artists: ['Erik Satie'], album: 'Gymnopédies', preview_url: null },
        { name: 'Clair de Lune', artists: ['Claude Debussy'], album: 'Suite Bergamasque', preview_url: null },
        { name: 'The Pink Panther Theme', artists: ['Henry Mancini'], album: 'The Pink Panther', preview_url: null }
      ],
      'romance': [
        { name: 'Canon in D', artists: ['Johann Pachelbel'], album: 'Classical Romance', preview_url: null },
        { name: 'Clair de Lune', artists: ['Claude Debussy'], album: 'Suite Bergamasque', preview_url: null },
        { name: 'The Way You Look Tonight', artists: ['Tony Bennett'], album: 'The Art of Romance', preview_url: null }
      ],
      'dune': [
        { name: 'Desert Planet', artists: ['Hans Zimmer'], album: 'Dune Original Soundtrack', preview_url: null },
        { name: 'Paul\'s Dream', artists: ['Hans Zimmer'], album: 'Dune Original Soundtrack', preview_url: null },
        { name: 'One Ring Day', artists: ['Hans Zimmer'], album: 'Dune Original Soundtrack', preview_url: null }
      ]
    };

    const queryLower = query.toLowerCase();
    
    // Find matching genre/theme
    for (const [key, tracks] of Object.entries(fallbackTracks)) {
      if (queryLower.includes(key)) {
        return tracks.slice(0, limit);
      }
    }
    
    // Default ambient reading tracks
    return [
      { name: 'Ambient Reading', artists: ['Reading Music'], album: 'Focus & Study', preview_url: null },
      { name: 'Peaceful Pages', artists: ['Study Sounds'], album: 'Library Ambience', preview_url: null },
      { name: 'Book Cafe', artists: ['Lofi Hip Hop'], album: 'Cozy Reads', preview_url: null },
      { name: 'Quiet Moments', artists: ['Piano Solitude'], album: 'Reading Companion', preview_url: null }
    ].slice(0, limit);
  }

  static async searchPlaylists(query, limit = 20) {
    try {
      const accessToken = await this.getAccessToken();
      
      if (!accessToken) {
        return []; // Return empty array if no Spotify access
      }
      
      const response = await axios.get('https://api.spotify.com/v1/search', {
        params: {
          q: query,
          type: 'playlist',
          limit,
          market: 'US'
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data.playlists.items;
    } catch (error) {
      console.error('Spotify playlist search error:', error.message);
      return []; // Return empty array on error
    }
  }

  static async getPlaylist(playlistId) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Spotify playlist fetch error:', error.message);
      throw new Error('Failed to fetch Spotify playlist');
    }
  }

  static generateVibeQuery(book, mood = 'calm', energy = 'medium') {
    const { title, authors, categories } = book;
    
    // Create search terms based on book metadata
    const genre = categories.length > 0 ? categories[0].toLowerCase() : '';
    const author = authors.length > 0 ? authors[0] : '';
    
    // Map book genres to music moods
    const genreMoodMap = {
      'fiction': ['indie', 'alternative', 'ambient'],
      'mystery': ['dark', 'electronic', 'cinematic'],
      'romance': ['indie pop', 'soft rock', 'acoustic'],
      'fantasy': ['epic', 'orchestral', 'cinematic'],
      'science fiction': ['electronic', 'ambient', 'synthwave'],
      'thriller': ['dark', 'intense', 'electronic'],
      'horror': ['dark ambient', 'industrial', 'gothic'],
      'biography': ['classical', 'jazz', 'acoustic'],
      'history': ['classical', 'orchestral', 'instrumental'],
      'self-help': ['motivational', 'uplifting', 'ambient']
    };

    // Energy level mapping
    const energyMap = {
      'low': ['ambient', 'chill', 'peaceful'],
      'medium': ['indie', 'acoustic', 'soft'],
      'high': ['upbeat', 'energetic', 'motivational']
    };

    // Mood mapping
    const moodMap = {
      'calm': ['peaceful', 'serene', 'meditation'],
      'focused': ['instrumental', 'concentration', 'study'],
      'adventurous': ['epic', 'cinematic', 'adventure'],
      'romantic': ['love', 'romantic', 'intimate'],
      'mysterious': ['dark', 'mysterious', 'noir'],
      'uplifting': ['happy', 'positive', 'uplifting']
    };

    // Build search query
    let searchTerms = [];
    
    // Add genre-based terms
    if (genre && genreMoodMap[genre]) {
      searchTerms.push(...genreMoodMap[genre]);
    }
    
    // Add energy-based terms
    if (energyMap[energy]) {
      searchTerms.push(...energyMap[energy]);
    }
    
    // Add mood-based terms
    if (moodMap[mood]) {
      searchTerms.push(...moodMap[mood]);
    }
    
    // Add some reading-related terms
    searchTerms.push('reading', 'study', 'focus');
    
    // Return a diverse set of search terms
    return searchTerms.slice(0, 3).join(' ');
  }
}

// Get music recommendations for a book
router.get('/recommendations/:bookId', [
  query('mood')
    .optional()
    .isIn(['calm', 'focused', 'adventurous', 'romantic', 'mysterious', 'uplifting'])
    .withMessage('Invalid mood'),
  query('energy')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid energy level'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
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
    const { mood = 'calm', energy = 'medium', limit = 20 } = req.query;

    // First, try to find the book in our database
    let book;
    try {
      book = await Book.findOne({
        $or: [
          { _id: bookId },
          { googleBooksId: bookId }
        ]
      });
    } catch (dbError) {
      console.log('Database unavailable for music search, using Google Books API directly');
    }

    // If not found in DB, try to get from Google Books API
    if (!book) {
      try {
        const googleBooksResponse = await axios.get(`https://www.googleapis.com/books/v1/volumes/${bookId}`, {
          params: {
            key: process.env.GOOGLE_BOOKS_API_KEY
          }
        });
        
        const googleBook = googleBooksResponse.data.volumeInfo;
        book = {
          googleBooksId: bookId,
          title: googleBook.title,
          authors: googleBook.authors,
          description: googleBook.description,
          categories: googleBook.categories,
          publishedDate: googleBook.publishedDate,
          averageRating: googleBook.averageRating,
          thumbnail: googleBook.imageLinks?.thumbnail
        };
      } catch (error) {
        return res.status(404).json({ error: 'Book not found' });
      }
    }

    // 🤖 AI-POWERED BOOK ANALYSIS
    console.log(`🎵 Analyzing "${book.title}" for music recommendations...`);
    const aiAnalysis = await bookAnalyzer.analyzeBookForMusic(book);
    console.log(`🎯 AI Analysis Result:`, aiAnalysis);

    // Check if we have cached music vibes for this specific analysis
    if (book._id && book.musicVibes) {
      const existingVibes = book.musicVibes.filter(vibe => 
        vibe.mood === aiAnalysis.mood && vibe.energy === aiAnalysis.energy
      );

      if (existingVibes.length > 0) {
        return res.json({
          book: {
            id: book._id || book.googleBooksId,
            title: book.title,
            authors: book.authors
          },
          aiAnalysis,
          musicVibes: existingVibes,
          cached: true
        });
      }
    }

    // Generate Spotify search terms using AI analysis
    const spotifySearchTerms = bookAnalyzer.generateSpotifySearchTerms(aiAnalysis, book);
    console.log(`🔍 Spotify Search Terms:`, spotifySearchTerms);
    
    try {
      // Search for multiple track sets using AI-generated terms
      let allTracks = [];
      let allPlaylists = [];

      for (const searchTerm of spotifySearchTerms.slice(0, 3)) {
        try {
          const tracks = await SpotifyService.searchTracks(searchTerm, 10);
          const playlists = await SpotifyService.searchPlaylists(searchTerm, 3);
          
          allTracks.push(...tracks);
          allPlaylists.push(...playlists);
        } catch (error) {
          console.log(`Search failed for term: ${searchTerm}`, error.message);
        }
      }

      // Remove duplicates and limit results
      const uniqueTracks = allTracks.filter((track, index, self) => 
        index === self.findIndex(t => t.id === track.id)
      ).slice(0, Math.min(limit, 20));

      const uniquePlaylists = allPlaylists.filter((playlist, index, self) => 
        index === self.findIndex(p => p.id === playlist.id)
      ).slice(0, 5);

      const recommendations = {
        tracks: uniqueTracks.map(track => ({
          id: track.id,
          name: track.name,
          artists: track.artists.map(artist => artist.name),
          album: track.album.name,
          preview_url: track.preview_url,
          external_urls: track.external_urls,
          duration_ms: track.duration_ms,
          popularity: track.popularity
        })),
        playlists: uniquePlaylists.map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          external_urls: playlist.external_urls,
          images: playlist.images,
          tracks: playlist.tracks.total
        }))
      };

      // Cache the recommendations in the book (if it exists in our DB)
      if (book._id) {
        const newVibe = {
          mood: aiAnalysis.mood,
          energy: aiAnalysis.energy,
          genre: book.categories?.[0] || 'general',
          spotifyPlaylistId: uniquePlaylists[0]?.id || null,
          suggestedBy: req.user?._id || null,
          votes: 0,
          aiAnalysis: aiAnalysis.reasoning
        };

        book.musicVibes.push(newVibe);
        await book.save();
      }

      res.json({
        book: {
          id: book._id || book.googleBooksId,
          title: book.title,
          authors: book.authors
        },
        aiAnalysis,
        recommendations,
        searchTermsUsed: spotifySearchTerms,
        cached: false
      });

    } catch (spotifyError) {
      console.error('Spotify API error:', spotifyError);
      res.status(503).json({ 
        error: 'Music service temporarily unavailable',
        fallback: {
          message: 'Try searching for instrumental, ambient, or classical music that matches your reading mood'
        }
      });
    }

  } catch (error) {
    console.error('Music recommendations error:', error);
    res.status(500).json({ error: 'Failed to get music recommendations' });
  }
});

// Search music
router.get('/search', [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  query('type')
    .optional()
    .isIn(['track', 'playlist', 'artist'])
    .withMessage('Type must be track, playlist, or artist'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { q: searchQuery, type = 'track', limit = 20 } = req.query;

    try {
      let results;
      
      if (type === 'track') {
        results = await SpotifyService.searchTracks(searchQuery, limit);
        results = results.map(track => ({
          id: track.id,
          type: 'track',
          name: track.name,
          artists: track.artists.map(artist => artist.name),
          album: track.album.name,
          preview_url: track.preview_url,
          external_urls: track.external_urls,
          duration_ms: track.duration_ms,
          popularity: track.popularity
        }));
      } else if (type === 'playlist') {
        results = await SpotifyService.searchPlaylists(searchQuery, limit);
        results = results.map(playlist => ({
          id: playlist.id,
          type: 'playlist',
          name: playlist.name,
          description: playlist.description,
          external_urls: playlist.external_urls,
          images: playlist.images,
          tracks: playlist.tracks.total,
          owner: playlist.owner.display_name
        }));
      }

      res.json({
        results,
        query: searchQuery,
        type,
        total: results.length
      });

    } catch (spotifyError) {
      console.error('Spotify search error:', spotifyError);
      res.status(503).json({ 
        error: 'Music service temporarily unavailable',
        message: 'Please try again later'
      });
    }

  } catch (error) {
    console.error('Music search error:', error);
    res.status(500).json({ error: 'Failed to search music' });
  }
});

// Vote on a music vibe
router.post('/vibe/:vibeId/vote', [
  authenticateToken,
  body('vote')
    .isIn(['up', 'down'])
    .withMessage('Vote must be up or down')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { vibeId } = req.params;
    const { vote } = req.body;
    const userId = req.user._id;

    // Find book with this vibe
    const book = await Book.findOne({ 'musicVibes._id': vibeId });
    
    if (!book) {
      return res.status(404).json({ error: 'Music vibe not found' });
    }

    const vibe = book.musicVibes.id(vibeId);
    
    if (!vibe) {
      return res.status(404).json({ error: 'Music vibe not found' });
    }

    // Update vote count
    if (vote === 'up') {
      vibe.votes += 1;
    } else {
      vibe.votes -= 1;
    }

    await book.save();

    res.json({
      message: 'Vote recorded',
      vibe: {
        id: vibe._id,
        votes: vibe.votes,
        mood: vibe.mood,
        energy: vibe.energy
      }
    });

  } catch (error) {
    console.error('Vibe vote error:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Get popular music vibes
router.get('/vibes/popular', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { limit = 20 } = req.query;

    // Aggregate popular vibes across all books
    const popularVibes = await Book.aggregate([
      { $unwind: '$musicVibes' },
      { $sort: { 'musicVibes.votes': -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: '$musicVibes._id',
          bookId: '$_id',
          bookTitle: '$title',
          bookAuthors: '$authors',
          mood: '$musicVibes.mood',
          energy: '$musicVibes.energy',
          genre: '$musicVibes.genre',
          votes: '$musicVibes.votes',
          spotifyPlaylistId: '$musicVibes.spotifyPlaylistId'
        }
      }
    ]);

    res.json({
      vibes: popularVibes,
      total: popularVibes.length
    });

  } catch (error) {
    console.error('Popular vibes error:', error);
    res.status(500).json({ error: 'Failed to fetch popular vibes' });
  }
});

module.exports = router;
