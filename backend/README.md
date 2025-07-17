# MyBookMyVibe Backend

A secure Node.js/Express API for the MyBookMyVibe application.

## Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Secure password hashing with bcrypt
  - Session management
  - User profile management

- **Book Management**
  - Google Books API integration
  - Search and discovery
  - Trending books algorithm
  - Category-based browsing

- **Music Integration**
  - Spotify API integration
  - Music recommendations based on book mood
  - Playlist generation
  - Music search functionality

- **Review System**
  - User reviews and ratings
  - Like/unlike functionality
  - Review moderation
  - Community-driven content

- **Security Features**
  - Rate limiting
  - CORS protection
  - Input validation
  - SQL injection prevention
  - XSS protection

## Setup Instructions

### Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- Spotify Developer Account
- Google Books API Key (optional but recommended)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=3001
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/mybookmyvibe
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   
   # Session
   SESSION_SECRET=your-super-secret-session-key-change-this-in-production
   
   # API Keys
   GOOGLE_BOOKS_API_KEY=your-google-books-api-key
   SPOTIFY_CLIENT_ID=your-spotify-client-id
   SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
   
   # CORS
   CORS_ORIGINS=http://localhost:3000,https://yourdomain.netlify.app
   ```

3. **Start MongoDB:**
   - **Local MongoDB:** Ensure MongoDB is running on your system
   - **MongoDB Atlas:** Use the connection string in `MONGODB_URI`

4. **Run the application:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "string (3-30 chars, alphanumeric + underscore)",
  "email": "string (valid email)",
  "password": "string (min 6 chars, 1 upper, 1 lower, 1 number)",
  "firstName": "string (optional)",
  "lastName": "string (optional)"
}
```

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": { ... },
  "accessToken": "jwt_token"
}
```

#### GET /api/auth/profile
Get current user profile (requires authentication).

#### PUT /api/auth/profile
Update user profile (requires authentication).

### Books Endpoints

#### GET /api/books/search?q=query&page=1&limit=10
Search for books using Google Books API.

#### GET /api/books/trending?limit=20
Get trending books based on our algorithm.

#### GET /api/books/:id
Get book details by ID (MongoDB ObjectId or Google Books ID).

#### GET /api/books/category/:category?page=1&limit=10
Get books by category.

### Music Endpoints

#### GET /api/music/recommendations/:bookId?mood=calm&energy=medium
Get music recommendations for a book.

**Query Parameters:**
- `mood`: calm, focused, adventurous, romantic, mysterious, uplifting
- `energy`: low, medium, high

#### GET /api/music/search?q=query&type=track&limit=20
Search for music using Spotify API.

### Reviews Endpoints

#### POST /api/reviews
Create a new review (requires authentication).

#### GET /api/reviews/book/:bookId?page=1&limit=10&sort=newest
Get reviews for a book.

#### POST /api/reviews/:reviewId/like
Like/unlike a review (requires authentication).

## Deployment

### Render Deployment

1. **Connect your GitHub repository to Render**

2. **Set Environment Variables:**
   - All variables from `.env.example`
   - Set `NODE_ENV=production`
   - Use MongoDB Atlas connection string

3. **Build Command:** `npm install`

4. **Start Command:** `npm start`

### Vercel Deployment

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Set Environment Variables** in Vercel dashboard

### Railway Deployment

1. **Connect GitHub repository**

2. **Set environment variables**

3. **Deploy automatically on push**

## Configuration Guide

### Spotify API Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. Get your Client ID and Client Secret
4. Add them to your `.env` file

### Google Books API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Books API
3. Create credentials (API key)
4. Add it to your `.env` file

### MongoDB Setup

#### Local MongoDB
```bash
# Install MongoDB
# macOS
brew install mongodb-community

# Ubuntu
sudo apt install mongodb

# Start MongoDB
sudo systemctl start mongod
```

#### MongoDB Atlas
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string
4. Add to `.env` file

## Security Considerations

- **Environment Variables:** Never commit `.env` files
- **JWT Secret:** Use a strong, random secret in production
- **Password Policy:** Enforced strong passwords
- **Rate Limiting:** API requests are rate-limited
- **Input Validation:** All inputs are validated and sanitized
- **CORS:** Configure allowed origins properly

## Database Schema

### User Schema
- `username`: Unique username
- `email`: Unique email address
- `password`: Hashed password
- `profile`: User profile information
- `spotifyConnected`: Spotify integration status

### Book Schema
- `googleBooksId`: Unique Google Books identifier
- `title`, `authors`, `description`: Book metadata
- `categories`: Book genres
- `imageLinks`: Book cover images
- `appRating`: Our app-specific ratings
- `musicVibes`: Associated music recommendations

### Review Schema
- `user`: Reference to User
- `book`: Reference to Book
- `rating`: 1-5 star rating
- `review`: Text review
- `musicVibeRating`: Rating for music recommendations
- `likes`: Array of users who liked the review

## Monitoring and Logging

- Request logging with timestamps
- Error tracking and reporting
- Performance monitoring
- Database connection monitoring

## API Rate Limits

- **Default:** 100 requests per 15 minutes per IP
- **Authentication endpoints:** Additional restrictions
- **Search endpoints:** Cached responses when possible

## Support

For support and questions:
- Check the [Issues](https://github.com/yourusername/mybookmyvibe/issues) page
- Create a new issue for bugs or feature requests
- Email: support@mybookmyvibe.com

## License

MIT License - see LICENSE file for details.
