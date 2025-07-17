# MyBookMyVibe Deployment Guide

## 🚀 Quick Deploy to Railway + Netlify (Free)

### Prerequisites
- GitHub account
- Railway account (free tier)
- Netlify account (free tier)
- Your API keys ready

### 1. Deploy Backend to Railway

1. **Connect Repository to Railway:**
   - Go to [Railway.app](https://railway.app)
   - Click "Deploy from GitHub repo"
   - Select your `mybookmyvibe` repository
   - Choose the backend folder (or deploy from root)

2. **Set Environment Variables in Railway:**
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=your-super-secret-jwt-key
   GOOGLE_BOOKS_API_KEY=your-google-books-api-key
   SPOTIFY_CLIENT_ID=your-spotify-client-id
   SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
   OPENAI_API_KEY=your-openai-api-key
   GEMINI_API_KEY=your-gemini-api-key
   AMAZON_ASSOCIATE_TAG=mybookmyvibe-20
   ```

3. **Railway will automatically:**
   - Detect your Node.js app
   - Use the Procfile to start the server
   - Give you a live URL like: `https://mybookmyvibe-production.up.railway.app`

### 2. Deploy Frontend to Netlify

1. **Update Frontend API URL:**
   - In `public/script.js`, change `API_BASE_URL` to your Railway URL
   
2. **Deploy to Netlify:**
   - Go to [Netlify.app](https://netlify.app)
   - Drag and drop your `public/` folder
   - Or connect your GitHub repo and set build directory to `public/`

### 3. Update CORS Settings

Once you have your Netlify URL, update the CORS settings in `backend/server.js` to allow your frontend domain.

## 🔒 Security Notes

- Never commit `.env` files
- Use Railway/Netlify environment variables for production
- The `.gitignore` file protects your secrets
- Database is optional - app works with Google Books API only

## 📊 Cost Breakdown (Free Tier)

- **Railway:** Free tier includes 500 hours/month
- **Netlify:** Free tier includes 100GB bandwidth/month
- **APIs:** Google Books (free), Spotify (free), OpenAI (pay-per-use)

## 🛠 Local Development

1. Copy `.env.example` to `.env`
2. Fill in your API keys
3. Run `npm install` in backend/
4. Run `npm start` in backend/
5. Open `public/index.html` in browser
