const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const musicRoutes = require('./routes/music');
const reviewsRoutes = require('./routes/reviews');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://api.spotify.com", "https://www.googleapis.com"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

app.use(limiter);

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-this',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/mybookmyvibe'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Database connection
let isMongoDBConnected = false;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mybookmyvibe')
  .then(() => {
    console.log('Connected to MongoDB');
    isMongoDBConnected = true;
  })
  .catch(err => {
    console.warn('MongoDB connection failed:', err.message);
    console.warn('Running in development mode without database');
    console.warn('Some features will be limited. Install MongoDB or use MongoDB Atlas for full functionality.');
    isMongoDBConnected = false;
  });

// Middleware to check MongoDB connection for database operations
const requireDatabase = (req, res, next) => {
  if (!isMongoDBConnected) {
    return res.status(503).json({
      error: 'Database not available',
      message: 'This feature requires a database connection. Please set up MongoDB or use MongoDB Atlas.',
      documentation: 'See README.md for setup instructions'
    });
  }
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: isMongoDBConnected ? 'connected' : 'disconnected',
    features: {
      'book_search': true, // Works with Google Books API
      'user_auth': isMongoDBConnected,
      'reviews': isMongoDBConnected,
      'music_recommendations': true // Works with Spotify API
    }
  });
});

// API routes
app.use('/api/auth', requireDatabase, authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/reviews', requireDatabase, reviewsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format'
    });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
