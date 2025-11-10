const TEXT_BLOCK_TAGS = /<\/(p|div|section|article|h\d|li)>/gi;
const LINE_BREAK_TAGS = /<br\s*\/?/gi;
const BLOCK_ELEMENTS = /<(script|style|noscript|iframe|img|svg|video|audio)[^>]*>[\s\S]*?<\/\1>/gi;
const GENERIC_TAGS = /<[^>]+>/g;

async function extractTextFromURL(url) {
  try {
    console.log(`[Lightweight Scraper] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let html = await response.text();
    const originalLength = html.length;

    html = html.replace(BLOCK_ELEMENTS, ' ')
      .replace(LINE_BREAK_TAGS, '\n')
      .replace(TEXT_BLOCK_TAGS, '\n');

    const cleaned = html
      .replace(GENERIC_TAGS, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();

    if (!cleaned || cleaned.length < 50) {
      throw new Error('Could not extract meaningful content from the URL. The page might be empty or require JavaScript to render.');
    }

    console.log(`✓ Text extracted successfully (${cleaned.length} chars from ${(originalLength / 1024).toFixed(1)} KB HTML)`);
    return cleaned;

  } catch (error) {
    console.error('[Lightweight Scraper] Error:', error.message);
    throw new Error(error.message || 'Failed to fetch content.');
  }
}

/**
 * Check if a URL is likely to work with the lightweight scraper
 * This is a heuristic check - not 100% accurate
 */
function isLikelyStaticSite(url) {
  const staticPatterns = [
    /bbc\.com/,
    /wikipedia\.org/,
    /github\.com/,
    /medium\.com/,
    /stackoverflow\.com/,
    /reddit\.com/,
    /news\./,
    /blog\./,
  ];
  
  return staticPatterns.some(pattern => pattern.test(url));
}

module.exports = {
  extractTextFromURL,
  isLikelyStaticSite
};

