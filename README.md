# MyBookMyVibe - Book Vibe Discovery App

A modern web application that finds the perfect music vibe for your reading experience using Spotify integration and Google Books API.

![MyBookMyVibe](https://via.placeholder.com/800x400/6366f1/ffffff?text=MyBookMyVibe)

## ✨ Features

- 🎵 **Spotify Music Discovery** - Get personalized playlists for any book
- 📚 **Trending Books** - Discover what everyone's reading from Google Books API
- ⭐ **User Reviews & Ratings** - Share your thoughts and discover new perspectives
- 🔐 **Secure Authentication** - JWT-based user accounts with profile management
- 💾 **Persistent Data** - Full backend API with MongoDB storage
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- 🎨 **Modern UI** - Beautiful, accessible interface with dark mode support

## 🚀 Quick Start

### Frontend Deployment (Netlify)

1. **Deploy the `public/` folder to Netlify:**
   ```bash
   # Option 1: Drag and drop the public folder to Netlify
   # Option 2: Connect your GitHub repository
   ```

2. **Update API configuration:**
   - Edit `public/script.js`
   - Change `CONFIG.API_BASE_URL` to your deployed backend URL

### Backend Deployment (Render/Railway/Vercel)

1. **Deploy the `backend/` folder:**
   ```bash
   cd backend
   npm install
   ```

2. **Set Environment Variables:**
   ```env
   NODE_ENV=production
   PORT=3001
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_jwt_secret
   SESSION_SECRET=your_session_secret
   GOOGLE_BOOKS_API_KEY=your_google_books_api_key
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   CORS_ORIGINS=https://yourdomain.netlify.app
   ```

3. **Update frontend API URL:**
   - Update `CONFIG.API_BASE_URL` in `public/script.js`

## 🏗️ Local Development

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Spotify Developer Account
- Google Books API Key (optional)

### Setup

1. **Clone and install backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

2. **Serve frontend:**
   ```bash
   cd public
   # Use any static server, e.g.:
   npx serve .
   # Or use VS Code Live Server extension
   ```

3. **Configure API Keys:**

   **Spotify API:**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create new application
   - Add Client ID and Secret to `.env`

   **Google Books API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Enable Books API
   - Create API key and add to `.env`

## 📁 Project Structure

```
mybookmyvibe/
├── backend/                 # Node.js Express API
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API endpoints
│   ├── middleware/         # Authentication & validation
│   ├── server.js           # Main server file
│   ├── package.json        # Backend dependencies
│   └── README.md           # Backend documentation
├── public/                 # Frontend static files
│   ├── index.html          # Main HTML file
│   ├── styles.css          # CSS styling
│   ├── script.js           # JavaScript functionality
│   └── manifest.json       # PWA manifest
├── assets/                 # Images and static assets
└── README.md              # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Books
- `GET /api/books/search` - Search books
- `GET /api/books/trending` - Get trending books
- `GET /api/books/:id` - Get book details
- `GET /api/books/category/:category` - Browse by genre

### Music
- `GET /api/music/recommendations/:bookId` - Get music for book
- `GET /api/music/search` - Search Spotify tracks/playlists
- `POST /api/music/vibe/:vibeId/vote` - Vote on music vibes

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/book/:bookId` - Get book reviews
- `POST /api/reviews/:reviewId/like` - Like/unlike review

## 🛡️ Security Features

- **Authentication:** JWT tokens with secure session management
- **Password Security:** bcrypt hashing with salt
- **Input Validation:** Comprehensive validation and sanitization
- **Rate Limiting:** API request throttling
- **CORS Protection:** Configured allowed origins
- **XSS Prevention:** Content sanitization
- **SQL Injection Prevention:** MongoDB ODM with validation

## 🎨 Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with custom properties
- **Vanilla JavaScript** - No framework dependencies
- **Font Awesome** - Icon library
- **Google Fonts** - Typography

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Axios** - HTTP client for external APIs

### External APIs
- **Spotify Web API** - Music recommendations and search
- **Google Books API** - Book data and search
- **MongoDB Atlas** - Cloud database hosting

## 🚢 Deployment Options

### Frontend
- **Netlify** ⭐ (Recommended)
- **Vercel**
- **GitHub Pages**
- **Firebase Hosting**

### Backend
- **Render** ⭐ (Recommended for free tier)
- **Railway** 
- **Vercel**
- **Heroku**
- **DigitalOcean App Platform**

### Database
- **MongoDB Atlas** ⭐ (Recommended)
- **Self-hosted MongoDB**

## 🔄 Environment Variables

Create `.env` in the backend directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/mybookmyvibe

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Session Management
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# External APIs
GOOGLE_BOOKS_API_KEY=your-google-books-api-key
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://yourdomain.netlify.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📱 Progressive Web App

MyBookMyVibe is a PWA with:
- **Offline Support** - Basic functionality without internet
- **App-like Experience** - Install on mobile devices
- **Responsive Design** - Works on all screen sizes
- **Fast Loading** - Optimized assets and caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Books API** for providing comprehensive book data
- **Spotify Web API** for music recommendations
- **Font Awesome** for beautiful icons
- **Google Fonts** for typography
- **MongoDB** for reliable data storage

## 📞 Support

- 📧 Email: support@mybookmyvibe.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/mybookmyvibe/issues)
- 📖 Documentation: [Full API Docs](./backend/README.md)

---

Made with ❤️ for book and music lovers everywhere
