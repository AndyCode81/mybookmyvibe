// ===== CONFIGURATION =====
const CONFIG = {
  API_BASE_URL: 'https://mybookmyvibe-production.up.railway.app/api', // Production Railway backend
  ITEMS_PER_PAGE: 12,
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 4000
};

// ===== STATE MANAGEMENT =====
const state = {
  currentUser: null,
  accessToken: localStorage.getItem('accessToken'),
  currentPage: 1,
  currentSearchQuery: '',
  currentCategory: '',
  loading: false,
  searchResults: [],
  trendingBooks: [],
  currentBook: null
};

// ===== UTILITY FUNCTIONS =====
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
};

const sanitizeHtml = (str) => {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
};

// ===== API FUNCTIONS =====
const api = {
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (state.accessToken) {
      config.headers.Authorization = `Bearer ${state.accessToken}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      
      // Handle token expiration
      if (error.message.includes('expired') || error.message.includes('invalid token')) {
        logout();
        showToast('Your session has expired. Please login again.', 'warning');
      }
      
      throw error;
    }
  },

  // Authentication
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    return response;
  },

  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return response;
  },

  async getProfile() {
    const response = await this.request('/auth/profile');
    return response;
  },

  async updateProfile(profileData) {
    const response = await this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ profile: profileData })
    });
    return response;
  },

  // Books
  async searchBooks(query, page = 1, limit = CONFIG.ITEMS_PER_PAGE) {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await this.request(`/books/search?${params}`);
    return response;
  },

  async getTrendingBooks(limit = 20) {
    const params = new URLSearchParams({ limit: limit.toString() });
    const response = await this.request(`/books/trending?${params}`);
    return response;
  },

  async getBookById(bookId) {
    const response = await this.request(`/books/${bookId}`);
    return response;
  },

  async getBooksByCategory(category, page = 1, limit = CONFIG.ITEMS_PER_PAGE) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await this.request(`/books/category/${category}?${params}`);
    return response;
  },

  // Music
  async getMusicRecommendations(bookId, mood = 'calm', energy = 'medium') {
    const params = new URLSearchParams({ mood, energy });
    const response = await this.request(`/music/recommendations/${bookId}?${params}`);
    return response;
  },

  async searchMusic(query, type = 'track', limit = 20) {
    const params = new URLSearchParams({
      q: query,
      type,
      limit: limit.toString()
    });
    const response = await this.request(`/music/search?${params}`);
    return response;
  },

  // Reviews
  async createReview(reviewData) {
    const response = await this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
    return response;
  },

  async getBookReviews(bookId, page = 1, limit = 10, sort = 'newest') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort
    });
    const response = await this.request(`/reviews/book/${bookId}?${params}`);
    return response;
  },

  async likeReview(reviewId) {
    const response = await this.request(`/reviews/${reviewId}/like`, {
      method: 'POST'
    });
    return response;
  }
};

// ===== UI FUNCTIONS =====
const ui = {
  showLoading() {
    state.loading = true;
    document.getElementById('loading-spinner').style.display = 'flex';
  },

  hideLoading() {
    state.loading = false;
    document.getElementById('loading-spinner').style.display = 'none';
  },

  renderBookCard(book) {
    const imageUrl = book.imageLinks?.thumbnail || book.imageLinks?.small || '';
    const displayRating = book.displayRating || book.averageRating || 0;
    const displayRatingCount = book.displayRatingCount || book.ratingsCount || 0;
    const genre = book.categories && book.categories[0] ? book.categories[0] : 'General';

    return `
      <div class="book-card" onclick="showBookDetails('${book._id || book.googleBooksId}')">
        <div class="book-cover">
          ${imageUrl ? 
            `<img src="${imageUrl}" alt="${sanitizeHtml(book.title)}" loading="lazy">` :
            `<div class="placeholder">📚</div>`
          }
          ${displayRating > 0 ? 
            `<div class="book-rating">
              <i class="fas fa-star"></i> ${displayRating.toFixed(1)}
            </div>` : ''
          }
        </div>
        <div class="book-info">
          <h3 class="book-title">${sanitizeHtml(book.title)}</h3>
          <p class="book-author">${sanitizeHtml(book.authors?.join(', ') || 'Unknown Author')}</p>
          <span class="book-genre">${sanitizeHtml(genre)}</span>
          <div class="book-actions">
            <button class="btn btn-primary btn-small" onclick="event.stopPropagation(); showBookDetails('${book._id || book.googleBooksId}')">
              <i class="fas fa-eye"></i> View Details
            </button>
            <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); getMusicForBook('${book._id || book.googleBooksId}')">
              <i class="fas fa-music"></i> Get Music
            </button>
            <a href="${generateAmazonAffiliate(book.title, book.authors?.[0])}" target="_blank" class="btn btn-amazon btn-small" onclick="event.stopPropagation();">
              <i class="fab fa-amazon"></i> Buy
            </a>
          </div>
        </div>
      </div>
    `;
  },

  renderBookGrid(books, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (books.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <i class="fas fa-book-open"></i>
          <h3>No books found</h3>
          <p>Try searching with different keywords or browse our trending books.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = books.map(book => this.renderBookCard(book)).join('');
  },

  renderPagination(currentPage, totalPages, onPageChange) {
    if (totalPages <= 1) return '';

    const pagination = document.getElementById('search-pagination');
    if (!pagination) return;

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
      <button ${currentPage === 1 ? 'disabled' : ''} onclick="${onPageChange}(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i> Previous
      </button>
    `;

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <button class="${i === currentPage ? 'active' : ''}" onclick="${onPageChange}(${i})">
          ${i}
        </button>
      `;
    }

    // Next button
    paginationHTML += `
      <button ${currentPage === totalPages ? 'disabled' : ''} onclick="${onPageChange}(${currentPage + 1})">
        Next <i class="fas fa-chevron-right"></i>
      </button>
    `;

    pagination.innerHTML = paginationHTML;
  }
};

// ===== AUTHENTICATION =====
function updateAuthUI() {
  const authButtons = document.getElementById('auth-buttons');
  const userMenu = document.getElementById('user-menu');
  const userName = document.getElementById('user-name');

  if (state.currentUser) {
    authButtons.style.display = 'none';
    userMenu.style.display = 'block';
    userName.textContent = state.currentUser.username || state.currentUser.profile?.firstName || 'User';
  } else {
    authButtons.style.display = 'flex';
    userMenu.style.display = 'none';
  }
}

async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    ui.showLoading();
    const response = await api.login(email, password);
    
    state.accessToken = response.accessToken;
    state.currentUser = response.user;
    
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    
    updateAuthUI();
    closeModal('login-modal');
    showToast('Welcome back!', 'success');
    
    // Reset form
    document.getElementById('login-form').reset();
    
  } catch (error) {
    showToast(error.message || 'Login failed', 'error');
  } finally {
    ui.hideLoading();
  }
}

async function handleRegister(event) {
  event.preventDefault();
  
  const userData = {
    username: document.getElementById('register-username').value,
    email: document.getElementById('register-email').value,
    password: document.getElementById('register-password').value,
    firstName: document.getElementById('register-firstname').value,
    lastName: document.getElementById('register-lastname').value
  };

  try {
    ui.showLoading();
    const response = await api.register(userData);
    
    state.accessToken = response.accessToken;
    state.currentUser = response.user;
    
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    
    updateAuthUI();
    closeModal('register-modal');
    showToast('Account created successfully!', 'success');
    
    // Reset form
    document.getElementById('register-form').reset();
    
  } catch (error) {
    showToast(error.message || 'Registration failed', 'error');
  } finally {
    ui.hideLoading();
  }
}

function logout() {
  state.currentUser = null;
  state.accessToken = null;
  
  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentUser');
  
  updateAuthUI();
  showToast('You have been logged out', 'info');
}

// ===== SEARCH FUNCTIONALITY =====
const debouncedSearch = debounce(async (query) => {
  if (!query.trim()) {
    document.getElementById('search-results').style.display = 'none';
    return;
  }

  try {
    ui.showLoading();
    state.currentSearchQuery = query;
    state.currentPage = 1;
    
    const response = await api.searchBooks(query, 1);
    state.searchResults = response.books;
    
    document.getElementById('search-results').style.display = 'block';
    ui.renderBookGrid(response.books, 'search-results-grid');
    
    const totalPages = Math.ceil(response.totalItems / CONFIG.ITEMS_PER_PAGE);
    ui.renderPagination(1, totalPages, 'changePage');
    
    // Scroll to results
    document.getElementById('search-results').scrollIntoView({ behavior: 'smooth' });
    
  } catch (error) {
    showToast('Search failed. Please try again.', 'error');
  } finally {
    ui.hideLoading();
  }
}, CONFIG.DEBOUNCE_DELAY);

async function searchBooks(query = null) {
  const searchInput = document.getElementById('hero-search');
  const searchQuery = query || searchInput.value.trim();
  
  if (!searchQuery) {
    showToast('Please enter a search term', 'warning');
    return;
  }
  
  debouncedSearch(searchQuery);
}

async function searchByCategory(category) {
  try {
    ui.showLoading();
    state.currentCategory = category;
    state.currentPage = 1;
    
    const response = await api.getBooksByCategory(category, 1);
    
    document.getElementById('search-results').style.display = 'block';
    ui.renderBookGrid(response.books, 'search-results-grid');
    
    // Update section header
    const sectionHeader = document.querySelector('#search-results .section-header h2');
    if (sectionHeader) {
      sectionHeader.textContent = `${category.charAt(0).toUpperCase() + category.slice(1)} Books`;
    }
    
    const totalPages = Math.ceil(response.totalItems / CONFIG.ITEMS_PER_PAGE);
    ui.renderPagination(1, totalPages, 'changePage');
    
    // Scroll to results
    document.getElementById('search-results').scrollIntoView({ behavior: 'smooth' });
    
  } catch (error) {
    showToast('Failed to load category books', 'error');
  } finally {
    ui.hideLoading();
  }
}

async function changePage(page) {
  try {
    ui.showLoading();
    state.currentPage = page;
    
    let response;
    if (state.currentCategory) {
      response = await api.getBooksByCategory(state.currentCategory, page);
    } else if (state.currentSearchQuery) {
      response = await api.searchBooks(state.currentSearchQuery, page);
    } else {
      return;
    }
    
    ui.renderBookGrid(response.books, 'search-results-grid');
    
    const totalPages = Math.ceil(response.totalItems / CONFIG.ITEMS_PER_PAGE);
    ui.renderPagination(page, totalPages, 'changePage');
    
    // Scroll to top of results
    document.getElementById('search-results').scrollIntoView({ behavior: 'smooth' });
    
  } catch (error) {
    showToast('Failed to load page', 'error');
  } finally {
    ui.hideLoading();
  }
}

// ===== BOOK DETAILS =====
async function showBookDetails(bookId) {
  try {
    ui.showLoading();
    const response = await api.getBookById(bookId);
    const book = response.book;
    state.currentBook = book;
    
    const modalContent = document.getElementById('book-modal-content');
    modalContent.innerHTML = renderBookDetailsModal(book);
    
    showModal('book-modal');
    
    // Load reviews
    loadBookReviews(book._id || book.googleBooksId);
    
  } catch (error) {
    showToast('Failed to load book details', 'error');
  } finally {
    ui.hideLoading();
  }
}

function renderBookDetailsModal(book) {
  const imageUrl = book.imageLinks?.thumbnail || book.imageLinks?.medium || '';
  const displayRating = book.displayRating || book.averageRating || 0;
  const displayRatingCount = book.displayRatingCount || book.ratingsCount || 0;
  
  return `
    <div class="book-details">
      <div class="book-details-header">
        <div class="book-cover-large">
          ${imageUrl ? 
            `<img src="${imageUrl}" alt="${sanitizeHtml(book.title)}">` :
            `<div class="placeholder">📚</div>`
          }
        </div>
        <div class="book-info-detailed">
          <h1>${sanitizeHtml(book.title)}</h1>
          <p class="authors">by ${sanitizeHtml(book.authors?.join(', ') || 'Unknown Author')}</p>
          
          ${displayRating > 0 ? `
            <div class="rating">
              <div class="stars">
                ${renderStars(displayRating)}
              </div>
              <span>${displayRating.toFixed(1)} (${displayRatingCount} reviews)</span>
            </div>
          ` : ''}
          
          <div class="book-meta">
            ${book.publishedDate ? `<p><strong>Published:</strong> ${book.publishedDate}</p>` : ''}
            ${book.publisher ? `<p><strong>Publisher:</strong> ${sanitizeHtml(book.publisher)}</p>` : ''}
            ${book.pageCount ? `<p><strong>Pages:</strong> ${book.pageCount}</p>` : ''}
            ${book.categories?.length ? `<p><strong>Genre:</strong> ${sanitizeHtml(book.categories.join(', '))}</p>` : ''}
          </div>
          
          <div class="book-actions-detailed">
            <button class="btn btn-primary" onclick="getMusicForBook('${book._id || book.googleBooksId}')">
              <i class="fas fa-music"></i> Get Music Recommendations
            </button>
            <a href="${generateAmazonAffiliate(book.title, book.authors?.[0])}" target="_blank" class="btn btn-amazon">
              <i class="fab fa-amazon"></i> Buy on Amazon
            </a>
            ${state.currentUser ? `
              <button class="btn btn-secondary" onclick="showReviewForm()">
                <i class="fas fa-star"></i> Write Review
              </button>
            ` : ''}
          </div>
        </div>
      </div>
      
      ${book.description ? `
        <div class="book-description">
          <h3>Description</h3>
          <p>${sanitizeHtml(book.description)}</p>
        </div>
      ` : ''}
      
      <div class="book-reviews-section">
        <h3>Reviews</h3>
        <div id="book-reviews">
          <div class="loading-reviews">Loading reviews...</div>
        </div>
      </div>
    </div>
  `;
}

function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let starsHTML = '';
  
  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fas fa-star"></i>';
  }
  
  if (hasHalfStar) {
    starsHTML += '<i class="fas fa-star-half-alt"></i>';
  }
  
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="far fa-star"></i>';
  }
  
  return starsHTML;
}

async function loadBookReviews(bookId) {
  try {
    const response = await api.getBookReviews(bookId);
    const reviewsContainer = document.getElementById('book-reviews');
    
    if (response.reviews.length === 0) {
      reviewsContainer.innerHTML = `
        <div class="no-reviews">
          <p>No reviews yet. Be the first to review this book!</p>
        </div>
      `;
      return;
    }
    
    reviewsContainer.innerHTML = response.reviews.map(review => renderReview(review)).join('');
    
  } catch (error) {
    console.error('Failed to load reviews:', error);
    document.getElementById('book-reviews').innerHTML = `
      <div class="error-message">
        <p>Failed to load reviews. Please try again later.</p>
      </div>
    `;
  }
}

function renderReview(review) {
  return `
    <div class="review-card">
      <div class="review-header">
        <div class="reviewer-info">
          <strong>${sanitizeHtml(review.user.username)}</strong>
          <div class="review-rating">
            ${renderStars(review.rating)}
          </div>
        </div>
        <div class="review-date">
          ${formatDate(review.createdAt)}
        </div>
      </div>
      
      ${review.review ? `
        <div class="review-content">
          <p>${sanitizeHtml(review.review)}</p>
        </div>
      ` : ''}
      
      <div class="review-actions">
        ${state.currentUser ? `
          <button class="btn btn-small ${review.isLikedByUser ? 'btn-primary' : 'btn-secondary'}" 
                  onclick="toggleReviewLike('${review._id}')">
            <i class="fas fa-heart"></i> ${review.likesCount || 0}
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// ===== MUSIC RECOMMENDATIONS =====
async function getMusicForBook(bookId) {
  try {
    ui.showLoading();
    
    // Get book details first to create better music search
    const book = await api.getBookById(bookId);
    const bookTitle = book.title || 'Unknown';
    const bookGenre = book.categories?.[0] || 'general';
    
    // Generate instant music recommendations as fallback
    const instantMusic = generateInstantMusic(bookTitle, bookGenre);
    
    // Try to get AI-enhanced recommendations from backend
    try {
      const response = await api.getMusicRecommendations(bookId);
      
      if (response && response.aiAnalysis) {
        // We have AI analysis! Use Spotify tracks if available, otherwise use instant music
        const tracks = response.recommendations?.tracks?.length > 0 
          ? response.recommendations.tracks.map(track => ({
              name: track.name,
              artist: track.artists?.join(', ') || 'Unknown Artist',
              youtube: `https://www.youtube.com/embed/search?q=${encodeURIComponent(track.name + ' ' + track.artists?.join(' '))}`,
              type: 'spotify',
              preview_url: track.preview_url,
              external_url: track.external_urls?.spotify
            }))
          : instantMusic;
          
        showMusicPlayer(book, tracks, response.aiAnalysis);
        showToast(`🤖 AI found perfect music for "${book.title}"!`, 'success');
        return;
      }
    } catch (error) {
      console.log('AI music API not available, using instant recommendations:', error.message);
    }
    
    // Fallback to instant music
    showMusicPlayer(book, instantMusic);
    showToast(`🎵 Found curated music for "${bookGenre}" books!`, 'success');
    
  } catch (error) {
    showToast('Unable to load music recommendations', 'error');
  } finally {
    ui.hideLoading();
  }
}

function generateInstantMusic(bookTitle, genre) {
  // Genre-based music recommendations that work instantly
  const musicMap = {
    'Fiction': [
      { name: 'Reading Music', artist: 'Various Artists', youtube: 'https://www.youtube.com/embed/5qap5aO4i9A', type: 'ambient' },
      { name: 'Study & Focus', artist: 'Lofi Hip Hop', youtube: 'https://www.youtube.com/embed/jfKfPfyJRdk', type: 'lofi' },
      { name: 'Classical Reading', artist: 'Classical Mix', youtube: 'https://www.youtube.com/embed/6p0DAz_30qQ', type: 'classical' }
    ],
    'Mystery': [
      { name: 'Dark Academia', artist: 'Study Music', youtube: 'https://www.youtube.com/embed/J1Kx4L4MfnE', type: 'dark' },
      { name: 'Mystery Ambience', artist: 'Ambient Music', youtube: 'https://www.youtube.com/embed/hE5npnaIgc0', type: 'mystery' },
      { name: 'Noir Jazz', artist: 'Jazz Collection', youtube: 'https://www.youtube.com/embed/JF-6Jl6v-NE', type: 'jazz' }
    ],
    'Romance': [
      { name: 'Romantic Piano', artist: 'Piano Love Songs', youtube: 'https://www.youtube.com/embed/dUc0Y_a1hBE', type: 'romantic' },
      { name: 'Coffee Shop Romance', artist: 'Acoustic Mix', youtube: 'https://www.youtube.com/embed/yJY2dCZZGK4', type: 'acoustic' },
      { name: 'Love Ballads', artist: 'Instrumental', youtube: 'https://www.youtube.com/embed/2ji30RcHjyE', type: 'ballad' }
    ],
    'Fantasy': [
      { name: 'Fantasy Realm', artist: 'Epic Music', youtube: 'https://www.youtube.com/embed/Tz-YD4-0DLs', type: 'epic' },
      { name: 'Medieval Tavern', artist: 'Celtic Music', youtube: 'https://www.youtube.com/embed/Vq0CNGxdkmQ', type: 'medieval' },
      { name: 'Mystical Ambience', artist: 'Ambient Fantasy', youtube: 'https://www.youtube.com/embed/Q2evIg-aYw8', type: 'mystical' }
    ],
    'Science Fiction': [
      { name: 'Cyberpunk Study', artist: 'Synthwave', youtube: 'https://www.youtube.com/embed/cJ4_NaHo0Po', type: 'cyberpunk' },
      { name: 'Space Ambient', artist: 'Cosmic Sounds', youtube: 'https://www.youtube.com/embed/iJSGPJlg7bg', type: 'space' },
      { name: 'Futuristic Beats', artist: 'Electronic Mix', youtube: 'https://www.youtube.com/embed/JwBZfZBsEWo', type: 'electronic' }
    ]
  };

  // Default to Fiction if genre not found
  const selectedGenre = musicMap[genre] || musicMap['Fiction'];
  return selectedGenre;
}

function showMusicPlayer(book, tracks, aiAnalysis = null) {
  const modal = document.getElementById('music-modal');
  const content = document.getElementById('music-modal-content');
  
  const amazonUrl = generateAmazonAffiliate(book.title, book.authors?.[0]);
  
  // AI Analysis section (if available)
  const aiSection = aiAnalysis ? `
    <div class="ai-analysis">
      <h5><i class="fas fa-robot"></i> AI Music Analysis</h5>
      <div class="analysis-details">
        <div class="analysis-row">
          <span class="analysis-label">Mood:</span>
          <span class="analysis-value mood-${aiAnalysis.mood}">${aiAnalysis.mood}</span>
        </div>
        <div class="analysis-row">
          <span class="analysis-label">Energy:</span>
          <span class="analysis-value energy-${aiAnalysis.energy}">${aiAnalysis.energy}</span>
        </div>
        <div class="analysis-row">
          <span class="analysis-label">Reasoning:</span>
          <span class="analysis-reasoning">${aiAnalysis.reasoning}</span>
        </div>
      </div>
    </div>
  ` : '';
  
  content.innerHTML = `
    <div class="music-header">
      <div class="book-info">
        <img src="${book.thumbnail || 'https://via.placeholder.com/100x150?text=No+Cover'}" alt="Book Cover" class="book-cover-small">
        <div>
          <h4>${book.title}</h4>
          <p>by ${book.authors?.join(', ') || 'Unknown Author'}</p>
          <div class="music-actions">
            <a href="${amazonUrl}" target="_blank" class="btn btn-amazon">
              <i class="fab fa-amazon"></i> Buy on Amazon
            </a>
          </div>
        </div>
      </div>
    </div>

    ${aiSection}

    <div class="music-controls">
      <h5><i class="fas fa-headphones"></i> Perfect Reading Vibes</h5>
      <p>AI-curated music that matches your book's atmosphere!</p>
    </div>

    <div class="music-tracks">
      ${tracks.map((track, index) => `
        <div class="track-item" onclick="playTrack(${index})">
          <div class="track-info">
            <div class="track-icon">
              <i class="fas fa-play" id="play-icon-${index}"></i>
            </div>
            <div class="track-details">
              <h6>${track.name}</h6>
              <p>${track.artist} • ${track.type || 'curated'}</p>
            </div>
          </div>
          <div class="track-actions">
            <button class="btn-icon" onclick="event.stopPropagation(); openYouTube('${track.youtube}')">
              <i class="fab fa-youtube"></i>
            </button>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="youtube-player">
      <div id="youtube-embed" style="display: none;">
        <!-- YouTube embed will be loaded here -->
      </div>
    </div>

    <div class="music-footer">
      <p><i class="fas fa-robot"></i> Music selected by AI analysis of your book's themes and mood!</p>
    </div>
  `;

  // Store tracks globally for playback
  window.currentTracks = tracks;
  window.currentlyPlaying = null;

  modal.style.display = 'block';
}

function playTrack(index) {
  const track = window.currentTracks[index];
  const embedContainer = document.getElementById('youtube-embed');
  
  // Stop current playing track
  if (window.currentlyPlaying !== null) {
    const oldIcon = document.getElementById(`play-icon-${window.currentlyPlaying}`);
    if (oldIcon) {
      oldIcon.className = 'fas fa-play';
    }
  }

  // Update play icon
  const playIcon = document.getElementById(`play-icon-${index}`);
  playIcon.className = 'fas fa-pause';
  
  // Extract video ID from YouTube URL
  const videoId = track.youtube.split('/embed/')[1];
  
  // Load YouTube player
  embedContainer.innerHTML = `
    <iframe 
      width="100%" 
      height="315" 
      src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" 
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowfullscreen>
    </iframe>
  `;
  
  embedContainer.style.display = 'block';
  window.currentlyPlaying = index;
  
  showToast(`Now playing: ${track.name}`, 'success');
}

function openYouTube(url) {
  window.open(url.replace('/embed/', '/watch?v='), '_blank');
}

function generateAmazonAffiliate(title, author) {
  // Your Amazon Associates tracking ID
  const affiliateId = 'mybookmyvibe-20'; // Replace with your actual ID when approved
  const searchQuery = encodeURIComponent(`${title} ${author || ''}`);
  return `https://www.amazon.com/s?k=${searchQuery}&tag=${affiliateId}`;
}

function updateMusicPlayer(spotifyTracks) {
  // This function can enhance the player with Spotify data if available
  console.log('Enhanced with Spotify tracks:', spotifyTracks);
}

// ===== TRENDING BOOKS =====
async function loadTrendingBooks() {
  try {
    const response = await api.getTrendingBooks();
    state.trendingBooks = response.books;
    ui.renderBookGrid(response.books, 'trending-books');
  } catch (error) {
    console.error('Failed to load trending books:', error);
    // Show fallback content or error message
    document.getElementById('trending-books').innerHTML = `
      <div class="error-message">
        <p>Failed to load trending books. Please refresh the page to try again.</p>
      </div>
    `;
  }
}

// ===== MODAL FUNCTIONS =====
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }, 300);
  }
}

function showLoginModal() {
  showModal('login-modal');
}

function showRegisterModal() {
  showModal('register-modal');
}

// ===== MOBILE MENU =====
function toggleMobileMenu() {
  const navMenu = document.getElementById('nav-menu');
  navMenu.classList.toggle('show');
}

function toggleUserDropdown() {
  const dropdown = document.getElementById('user-dropdown');
  dropdown.classList.toggle('show');
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
  const toast = document.getElementById('notification-toast');
  const icon = toast.querySelector('.toast-icon');
  const messageElement = toast.querySelector('.toast-message');
  
  // Set icon based on type
  const iconClasses = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  
  icon.className = `toast-icon ${type} ${iconClasses[type] || iconClasses.info}`;
  messageElement.textContent = message;
  
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, CONFIG.TOAST_DURATION);
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', function() {
  // Initialize app
  ui.hideLoading();
  
  // Check for stored authentication
  const storedToken = localStorage.getItem('accessToken');
  const storedUser = localStorage.getItem('currentUser');
  
  if (storedToken && storedUser) {
    state.accessToken = storedToken;
    state.currentUser = JSON.parse(storedUser);
    updateAuthUI();
  }
  
  // Load initial content
  loadTrendingBooks();
  
  // Search input event listener
  const heroSearch = document.getElementById('hero-search');
  if (heroSearch) {
    heroSearch.addEventListener('input', (e) => {
      if (e.target.value.trim()) {
        debouncedSearch(e.target.value.trim());
      } else {
        document.getElementById('search-results').style.display = 'none';
      }
    });
    
    heroSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchBooks();
      }
    });
  }
  
  // Close modals when clicking outside
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeModal(e.target.id);
    }
    
    // Close user dropdown when clicking outside
    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown && !e.target.closest('.user-menu')) {
      userDropdown.classList.remove('show');
    }
  });
  
  // Smooth scrolling for navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // Handle navbar scroll effect
  let lastScrollTop = 0;
  const navbar = document.querySelector('.navbar');
  
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > lastScrollTop && scrollTop > 100) {
      // Scrolling down
      navbar.style.transform = 'translateY(-100%)';
    } else {
      // Scrolling up
      navbar.style.transform = 'translateY(0)';
    }
    
    lastScrollTop = scrollTop;
  });
});

// ===== PLACEHOLDER FUNCTIONS =====
// These functions are referenced in the HTML but can be implemented later
function showProfile() {
  showToast('Profile feature coming soon!', 'info');
}

function showMyReviews() {
  showToast('My Reviews feature coming soon!', 'info');
}

function showSettings() {
  showToast('Settings feature coming soon!', 'info');
}

function showReviewForm() {
  showToast('Review form coming soon!', 'info');
}

function toggleReviewLike(reviewId) {
  if (!state.currentUser) {
    showToast('Please login to like reviews', 'warning');
    return;
  }
  // Implement like functionality
  showToast('Like feature coming soon!', 'info');
}

function applySortFilter() {
  // Implement sorting functionality
  showToast('Sort feature coming soon!', 'info');
}

// ===== EXPORT FOR TESTING =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    api,
    ui,
    state,
    CONFIG
  };
}

// ===== MUSIC PLAYER & SOCIAL FEATURES =====

let isPlaying = false;
let currentTrackIndex = 0;
let listenerCount = 1247;

const sampleTracks = [
  { title: "Atmospheric Reading Mix", artist: "Curated for \"Dune\" readers", book: "Dune" },
  { title: "Jazz & Literature", artist: "Perfect for \"The Great Gatsby\"", book: "The Great Gatsby" },
  { title: "Mystery Noir Sounds", artist: "Ideal for thriller novels", book: "Gone Girl" },
  { title: "Fantasy Orchestral", artist: "Epic soundscapes", book: "Lord of the Rings" }
];

function togglePlay() {
  const playBtn = document.querySelector('.play-btn i');
  isPlaying = !isPlaying;
  
  if (isPlaying) {
    playBtn.className = 'fas fa-pause';
    updateListenerCount(1);
    animatePlayback();
  } else {
    playBtn.className = 'fas fa-play';
    updateListenerCount(-1);
  }
}

function nextTrack() {
  currentTrackIndex = (currentTrackIndex + 1) % sampleTracks.length;
  updateTrackDisplay();
}

function previousTrack() {
  currentTrackIndex = currentTrackIndex === 0 ? sampleTracks.length - 1 : currentTrackIndex - 1;
  updateTrackDisplay();
}

function updateTrackDisplay() {
  const track = sampleTracks[currentTrackIndex];
  document.querySelector('.track-title').textContent = track.title;
  document.querySelector('.track-artist').textContent = track.artist;
  
  // Reset play button if switching tracks
  const playBtn = document.querySelector('.play-btn i');
  playBtn.className = 'fas fa-play';
  isPlaying = false;
}

function updateListenerCount(change) {
  listenerCount += change;
  document.getElementById('listener-count').textContent = listenerCount.toLocaleString();
}

function animatePlayback() {
  // Add subtle animations when playing
  const trackArt = document.querySelector('.track-art');
  trackArt.style.animation = isPlaying ? 'spin 3s linear infinite' : 'none';
}

// Add spin animation to CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Simulate real-time activity updates
function updateCommunityActivity() {
  const activities = [
    { user: "Sarah M.", action: "created a playlist for", book: "The Seven Husbands of Evelyn Hugo", time: "2 minutes ago" },
    { user: "Mike R.", action: "is listening to atmospheric sounds while reading", book: "Dune", time: "5 minutes ago" },
    { user: "Emma L.", action: "shared her jazz playlist for", book: "The Great Gatsby", time: "12 minutes ago" },
    { user: "Jake P.", action: "discovered the perfect soundtrack for", book: "1984", time: "18 minutes ago" },
    { user: "Lisa K.", action: "is currently reading", book: "Pride and Prejudice", time: "25 minutes ago" }
  ];
  
  const activityFeed = document.querySelector('.activity-feed');
  if (activityFeed) {
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    const activityHTML = `
      <div class="activity-item" style="animation: slideIn 0.5s ease-out;">
        <div class="user-avatar">${randomActivity.user.charAt(0)}</div>
        <div class="activity-content">
          <strong>${randomActivity.user}</strong> ${randomActivity.action} <em>"${randomActivity.book}"</em>
          <span class="activity-time">${randomActivity.time}</span>
        </div>
      </div>
    `;
    
    // Remove last activity and add new one at top
    const items = activityFeed.querySelectorAll('.activity-item');
    if (items.length >= 5) {
      items[items.length - 1].remove();
    }
    activityFeed.insertAdjacentHTML('afterbegin', activityHTML);
  }
}

// Update community activity every 30 seconds
setInterval(updateCommunityActivity, 30000);

// Animate listener count occasionally
setInterval(() => {
  if (Math.random() > 0.7) {
    const change = Math.random() > 0.5 ? 1 : -1;
    updateListenerCount(change);
  }
}, 10000);
