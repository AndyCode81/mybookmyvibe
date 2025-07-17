const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class BookAnalyzer {
  constructor() {
    // Initialize AI clients
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
    
    this.gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
  }

  /**
   * Analyze a book and generate music vibe recommendations
   * @param {Object} book - Book object with title, description, genre, etc.
   * @returns {Object} Music recommendations with mood, energy, and search terms
   */
  async analyzeBookForMusic(book) {
    try {
      const bookContext = this.prepareBookContext(book);
      
      // Try OpenAI first, fallback to Gemini, then fallback to rule-based
      if (this.openai) {
        return await this.analyzeWithOpenAI(bookContext);
      } else if (this.gemini) {
        return await this.analyzeWithGemini(bookContext);
      } else {
        return this.analyzeWithRules(book);
      }
    } catch (error) {
      console.error('AI analysis failed, using fallback:', error.message);
      return this.analyzeWithRules(book);
    }
  }

  prepareBookContext(book) {
    return {
      title: book.title || 'Unknown Title',
      authors: book.authors?.join(', ') || 'Unknown Author',
      description: book.description || 'No description available',
      categories: book.categories?.join(', ') || 'General',
      publishedDate: book.publishedDate || 'Unknown',
      averageRating: book.averageRating || 0
    };
  }

  async analyzeWithOpenAI(bookContext) {
    const prompt = `
Analyze this book and recommend music that would create the perfect reading atmosphere:

Book: "${bookContext.title}" by ${bookContext.authors}
Genre: ${bookContext.categories}
Description: ${bookContext.description}

Please provide music recommendations in this exact JSON format:
{
  "mood": "one of: calm, focused, adventurous, romantic, mysterious, uplifting, melancholy, intense",
  "energy": "one of: low, medium, high",
  "tempo": "one of: slow, moderate, fast",
  "instrumentation": ["piano", "strings", "ambient", "jazz", "classical", "electronic", etc.],
  "spotifySearchTerms": ["search term 1", "search term 2", "search term 3"],
  "reasoning": "Brief explanation of why this music fits the book",
  "specificRecommendations": ["Artist - Song Title", "Artist - Song Title", "Artist - Song Title"]
}

Focus on music that enhances the reading experience and matches the book's emotional tone, setting, and themes.
`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7
    });

    const responseText = completion.choices[0].message.content;
    return this.parseAIResponse(responseText);
  }

  async analyzeWithGemini(bookContext) {
    const model = this.gemini.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
Analyze this book and recommend music for reading atmosphere:

Book: "${bookContext.title}" by ${bookContext.authors}
Genre: ${bookContext.categories}
Description: ${bookContext.description}

Return JSON with: mood, energy, tempo, instrumentation array, spotifySearchTerms array, reasoning, specificRecommendations array.
Moods: calm, focused, adventurous, romantic, mysterious, uplifting, melancholy, intense
Energy: low, medium, high
Tempo: slow, moderate, fast
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return this.parseAIResponse(responseText);
  }

  parseAIResponse(responseText) {
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate and normalize the response
        return {
          mood: this.validateMood(parsed.mood),
          energy: this.validateEnergy(parsed.energy),
          tempo: parsed.tempo || 'moderate',
          instrumentation: Array.isArray(parsed.instrumentation) ? parsed.instrumentation : [],
          spotifySearchTerms: Array.isArray(parsed.spotifySearchTerms) ? parsed.spotifySearchTerms : [],
          reasoning: parsed.reasoning || 'AI-generated recommendation',
          specificRecommendations: Array.isArray(parsed.specificRecommendations) ? parsed.specificRecommendations : []
        };
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }
    
    // Fallback if parsing fails
    return this.getDefaultRecommendation();
  }

  validateMood(mood) {
    const validMoods = ['calm', 'focused', 'adventurous', 'romantic', 'mysterious', 'uplifting', 'melancholy', 'intense'];
    return validMoods.includes(mood) ? mood : 'calm';
  }

  validateEnergy(energy) {
    const validEnergies = ['low', 'medium', 'high'];
    return validEnergies.includes(energy) ? energy : 'medium';
  }

  analyzeWithRules(book) {
    // Enhanced rule-based analysis for when AI isn't available
    const title = (book.title || '').toLowerCase();
    const description = (book.description || '').toLowerCase();
    const categories = (book.categories?.join(' ') || '').toLowerCase();
    const fullText = `${title} ${description} ${categories}`;

    // Analyze for keywords and themes
    const analysis = {
      mood: 'calm',
      energy: 'medium',
      tempo: 'moderate',
      instrumentation: ['ambient', 'piano'],
      spotifySearchTerms: [],
      reasoning: 'Rule-based analysis',
      specificRecommendations: []
    };

    // Mystery/Thriller detection
    if (fullText.match(/mystery|thriller|detective|crime|murder|suspense/)) {
      analysis.mood = 'mysterious';
      analysis.energy = 'medium';
      analysis.instrumentation = ['dark ambient', 'strings', 'piano'];
      analysis.spotifySearchTerms = ['dark ambient', 'mystery music', 'noir jazz'];
    }
    
    // Romance detection
    else if (fullText.match(/romance|love|heart|passion|relationship/)) {
      analysis.mood = 'romantic';
      analysis.energy = 'low';
      analysis.instrumentation = ['piano', 'strings', 'acoustic'];
      analysis.spotifySearchTerms = ['romantic piano', 'love songs instrumental', 'acoustic romance'];
    }
    
    // Fantasy/Adventure detection
    else if (fullText.match(/fantasy|magic|dragon|adventure|quest|epic|medieval/)) {
      analysis.mood = 'adventurous';
      analysis.energy = 'high';
      analysis.instrumentation = ['orchestral', 'epic', 'celtic'];
      analysis.spotifySearchTerms = ['epic fantasy music', 'medieval ambient', 'adventure soundtrack'];
    }
    
    // Sci-Fi detection
    else if (fullText.match(/science fiction|sci-fi|space|future|technology|cyberpunk/)) {
      analysis.mood = 'focused';
      analysis.energy = 'medium';
      analysis.instrumentation = ['electronic', 'ambient', 'synthwave'];
      analysis.spotifySearchTerms = ['cyberpunk ambient', 'space music', 'futuristic sounds'];
    }
    
    // Horror detection
    else if (fullText.match(/horror|scary|ghost|haunted|supernatural|fear/)) {
      analysis.mood = 'intense';
      analysis.energy = 'low';
      analysis.instrumentation = ['dark ambient', 'strings', 'atmospheric'];
      analysis.spotifySearchTerms = ['horror ambient', 'dark atmospheric', 'haunting music'];
    }
    
    // Drama/Literary fiction
    else if (fullText.match(/drama|literary|contemporary|family|life|society/)) {
      analysis.mood = 'melancholy';
      analysis.energy = 'low';
      analysis.instrumentation = ['piano', 'strings', 'indie'];
      analysis.spotifySearchTerms = ['contemplative piano', 'indie folk', 'melancholy instrumental'];
    }

    return analysis;
  }

  getDefaultRecommendation() {
    return {
      mood: 'calm',
      energy: 'medium',
      tempo: 'moderate',
      instrumentation: ['ambient', 'piano'],
      spotifySearchTerms: ['reading music', 'study ambient', 'focus piano'],
      reasoning: 'Default recommendation for reading',
      specificRecommendations: []
    };
  }

  // Generate search terms for Spotify based on analysis
  generateSpotifySearchTerms(analysis, book) {
    const terms = [...analysis.spotifySearchTerms];
    
    // Add instrumentation-based terms
    terms.push(...analysis.instrumentation.map(inst => `${inst} instrumental`));
    
    // Add mood-based terms
    terms.push(`${analysis.mood} music`, `${analysis.energy} energy music`);
    
    // Add reading context
    terms.push('reading music', 'study music', 'focus music');
    
    // Return unique terms, limited to 5 for better results
    return [...new Set(terms)].slice(0, 5);
  }
}

module.exports = BookAnalyzer;
