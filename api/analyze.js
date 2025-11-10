// Vercel Serverless Function for content analysis
const { analyzeContent } = require('../backend/services/analyzer');
const { extractTextFromURL } = require('../backend/services/scraper');

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { input, type } = req.body;

    // Validate input
    if (!input || !type) {
      return res.status(400).json({ 
        error: 'Missing required fields: input and type' 
      });
    }

    if (!['text', 'url'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid type. Must be "text" or "url"' 
      });
    }

    let contentToAnalyze = input;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // If type is URL, scrape the content first
    if (type === 'url') {
      console.log(`[Vercel] Scraping URL: ${input}`);
      
      try {
        contentToAnalyze = await extractTextFromURL(input);
        console.log(`[Vercel] Successfully scraped ${contentToAnalyze.length} characters`);
        
        // Send extracted content to frontend
        res.write(`data: ${JSON.stringify({
          type: 'extracted_content',
          content: contentToAnalyze
        })}\n\n`);
        
      } catch (scrapeError) {
        console.error('[Vercel] Scraping error:', scrapeError);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: scrapeError.message
        })}\n\n`);
        res.end();
        return;
      }
    }

    // Validate content length
    if (contentToAnalyze.length < 10) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: 'Content too short. Please provide at least 10 characters.'
      })}\n\n`);
      res.end();
      return;
    }

    if (contentToAnalyze.length > 50000) {
      contentToAnalyze = contentToAnalyze.substring(0, 50000);
      console.log('[Vercel] Content truncated to 50000 characters');
    }

    console.log(`[Vercel] Starting analysis with model ${process.env.MODEL || 'gpt-4o'}`);
    
    // Stream analysis results (headers already set)
    await analyzeContent(contentToAnalyze, res, true);

  } catch (error) {
    console.error('[Vercel] Analysis error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message || 'Internal server error' 
      });
    } else {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error.message || 'Analysis failed'
      })}\n\n`);
      res.end();
    }
  }
};

