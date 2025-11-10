// ========================================
// Privacy Prism - Frontend Application
// ========================================

// API Configuration
// ========================================
const API_BASE_URL = (() => {
  const host = window.location.hostname;

  if (host === 'localhost' || host === '127.0.0.1') {
    // Local development: backend runs on port 5000
    return 'http://localhost:5000' ;
  }

  // Deployed environment (e.g. Vercel) – same domain as frontend
  return window.location.origin;
})();

// State management
const state = {
  currentPage: 'home',
  currentInput: '',
  currentType: 'text',
  analysisResults: {
    exposure: '',
    inference: '',
    audience: '',
    platforms: '',
    amplification: '',
    manipulability: '',
    summary: ''
  },
  summaryResult: '',
  isAnalyzing: false,
  analysisMeta: null,
  totalDimensions: 6
};

// DOM Elements
const elements = {
  // Navigation elements
  navLinks: document.querySelectorAll('.nav-links a'),
  pages: document.querySelectorAll('.page-section'),
  
  // Analysis page elements
  textInput: document.getElementById('textInput'),
  urlInput: document.getElementById('urlInput'),
  textArea: document.getElementById('textArea'),
  urlField: document.getElementById('urlField'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  extractedContentSection: document.getElementById('extractedContentSection'),
  contentPreview: document.getElementById('contentPreview'),
  contentLength: document.getElementById('contentLength'),
  resultsSection: document.getElementById('resultsSection'),
  downloadBtn: document.getElementById('downloadBtn'),
  summaryCard: document.getElementById('summaryCard'),
  summaryContent: document.getElementById('summaryContent'),
  summaryStatus: document.getElementById('summaryStatus'),
  summaryModel: document.getElementById('summaryModel'),
  summaryTimer: document.getElementById('summaryTimer'),
  inputTypeRadios: document.querySelectorAll('input[name="inputType"]'),
  dimensionCards: {
    exposure: document.getElementById('dimension-exposure'),
    inference: document.getElementById('dimension-inference'),
    audience: document.getElementById('dimension-audience'),
    platforms: document.getElementById('dimension-platforms'),
    amplification: document.getElementById('dimension-amplification'),
    manipulability: document.getElementById('dimension-manipulability')
  }
};

// ========================================
// Navigation Functions
// ========================================

function initializeNavigation() {
  elements.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageName = link.getAttribute('onclick').match(/showPage\('(.+)'\)/)[1];
      showPage(pageName);
    });
  });
}

function showPage(pageName) {
  elements.pages.forEach(page => {
    page.classList.remove('active');
  });
  
  const targetPage = document.getElementById(pageName + '-page');
  if (targetPage) {
    targetPage.classList.add('active');
    state.currentPage = pageName;
  }
  
  elements.navLinks.forEach(link => {
    link.style.fontWeight = 'normal';
    const linkPage = link.getAttribute('onclick').match(/showPage\('(.+)'\)/)[1];
    if (linkPage === pageName) {
      link.style.fontWeight = '600';
    }
  });
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================
// Event Listeners
// ========================================

elements.inputTypeRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    state.currentType = e.target.value;
    toggleInputType(e.target.value);
  });
});

elements.analyzeBtn.addEventListener('click', handleAnalyze);
elements.downloadBtn.addEventListener('click', handleDownload);

// ========================================
// Functions
// ========================================

function toggleInputType(type) {
  if (type === 'text') {
    elements.textInput.classList.remove('hidden');
    elements.urlInput.classList.add('hidden');
  } else {
    elements.textInput.classList.add('hidden');
    elements.urlInput.classList.remove('hidden');
  }
}

async function handleAnalyze() {
  console.log('=== ANALYSIS START ===');
  console.log('API Base URL:', API_BASE_URL);
  
  const input = state.currentType === 'text' 
    ? elements.textArea.value.trim() 
    : elements.urlField.value.trim();

  console.log('Input:', input);
  console.log('Type:', state.currentType);

  if (!input) {
    console.log('ERROR: No input provided');
    showError('Please provide input content or URL');
    return;
  }

  if (state.currentType === 'url' && !isValidURL(input)) {
    console.log('ERROR: Invalid URL');
    showError('Please enter a valid URL (must start with http:// or https://)') ;
    return;
  }

  if (state.currentType === 'text' && input.length < 10) {
    console.log('ERROR: Text too short');
    showError('Text content is too short. Please provide at least 10 characters.');
    return;
  }

  console.log('Starting parallel analysis...');
  state.currentInput = input;
  startParallelAnalysis(input, state.currentType);
}

function isValidURL(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function showError(message) {
  const existingError = document.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }

  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    background: rgba(239, 68, 68, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fff;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    animation: slideIn 0.3s ease-out;
  `;

  elements.analyzeBtn.parentNode.insertBefore(errorDiv, elements.analyzeBtn);

  setTimeout(() => {
    errorDiv.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => errorDiv.remove(), 300);
  }, 5000);
}

function showSuccess(message) {
  const existingMsg = document.querySelector('.success-message, .error-message');
  if (existingMsg) {
    existingMsg.remove();
  }

  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  successDiv.style.cssText = `
    background: rgba(34, 197, 94, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #fff;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    animation: slideIn 0.3s ease-out;
  `;

  elements.resultsSection.insertBefore(successDiv, elements.resultsSection.firstChild);

  setTimeout(() => {
    successDiv.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => successDiv.remove(), 300);
  }, 3000);
}

function showProgress(message) {
  const existingProgress = document.querySelector('.progress-message');
  if (existingProgress) {
    existingProgress.remove();
  }

  const progressDiv = document.createElement('div');
  progressDiv.className = 'progress-message';
  progressDiv.textContent = message;
  progressDiv.style.cssText = `
    background: rgba(0, 217, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 217, 255, 0.3);
    color: #fff;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    font-family: monospace;
    animation: slideIn 0.3s ease-out;
  `;

  elements.resultsSection.insertBefore(progressDiv, elements.resultsSection.firstChild);
}

function resetSummaryCard() {
  elements.summaryCard.classList.remove('hidden');
  elements.summaryStatus.textContent = 'Awaiting agents...';
  elements.summaryContent.innerHTML = '<p class="placeholder-text">The summary agent activates after all six dimensions finish.</p>';
  elements.summaryModel.textContent = '';
  elements.summaryTimer.textContent = '';
  state.summaryResult = '';
  state.analysisResults.summary = '';
}

function renderSummary(summaryPayload, meta) {
  if (!summaryPayload || !summaryPayload.content) {
    elements.summaryStatus.textContent = 'Summary unavailable';
    elements.summaryContent.innerHTML = '<p class="placeholder-text">Summary agent could not complete. Please retry.</p>';
    return;
  }

  state.summaryResult = summaryPayload.content;
  state.analysisResults.summary = summaryPayload.content;
  elements.summaryCard.classList.remove('hidden');
  elements.summaryStatus.textContent = 'Summary ready';
  elements.summaryContent.textContent = summaryPayload.content;
  elements.summaryModel.textContent = summaryPayload.model ? `Model · ${summaryPayload.model}` : '';

  if (meta?.elapsedMs) {
    const seconds = (meta.elapsedMs / 1000).toFixed(1);
    elements.summaryTimer.textContent = `Runtime · ${seconds}s`;
  } else {
    elements.summaryTimer.textContent = '';
  }
}

function updateExtractedContentView(source, analyzedContent) {
  if (source?.type === 'url') {
    elements.extractedContentSection.classList.remove('hidden');
    const preview = analyzedContent.slice(0, 1200);
    const previewParagraph = elements.contentPreview.querySelector('.preview-text');
    if (previewParagraph) {
      previewParagraph.textContent = preview + (analyzedContent.length > 1200 ? '...' : '');
    }
    elements.contentLength.textContent = `${source.length || analyzedContent.length} characters extracted`;
  } else {
    elements.extractedContentSection.classList.add('hidden');
  }
}

async function startParallelAnalysis(input, type) {
  console.log('=== MULTI-AGENT ANALYSIS START ===');
  console.log('API Base URL:', API_BASE_URL);
  console.log('Input sample:', input.slice(0, 120));
  console.log('Type:', type);

  elements.analyzeBtn.disabled = true;
  elements.analyzeBtn.innerHTML = `
    <svg class="btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
    </svg>
    <span>DISPATCHING SIX AGENTS...</span>
  `;
  state.isAnalyzing = true;

  elements.resultsSection.classList.remove('hidden');
  elements.downloadBtn.classList.add('hidden');
  resetDimensionCards();
  resetSummaryCard();
  showProgress('Sending content to six specialized LLM agents...');

  setTimeout(() => {
    elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 120);

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, type }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Multi-agent service returned an error.');
    }

    const data = await response.json();
    console.log('Multi-agent response received:', data);

    state.currentInput = data.content || input;
    state.analysisMeta = {
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      elapsedMs: data.elapsedMs,
    };

    updateExtractedContentView(data.source, state.currentInput);

    Object.keys(elements.dimensionCards).forEach((key) => {
      const agentPayload = data.agents?.[key];
      if (!agentPayload) {
        updateDimensionContent(key, 'No response from agent.', false);
        markDimensionComplete(key);
        return;
      }

      const text = agentPayload.content || `Analysis failed: ${agentPayload.error || 'Unknown error'}`;
      state.analysisResults[key] = text;
      updateDimensionContent(key, text, false);
      markDimensionComplete(key);
    });

    renderSummary(data.summary, data);
    handleAnalysisComplete();

  } catch (error) {
    console.error('Parallel analysis error:', error);
    showError(error.message || 'Failed to analyze content. Please try again.');
    resetAnalyzeButton();
  } finally {
    const progressMessages = document.querySelectorAll('.progress-message');
    progressMessages.forEach(msg => msg.remove());
  }
}

function resetDimensionCards() {
  Object.keys(elements.dimensionCards).forEach(key => {
    const card = elements.dimensionCards[key];
    const content = card.querySelector('.dimension-content');
    const spinner = card.querySelector('.loading-spinner');
    
    content.innerHTML = '<p class="placeholder-text">Waiting for analysis...</p>';
    content.classList.add('streaming');
    spinner.classList.remove('hidden');
    
    state.analysisResults[key] = '';
  });
}

function updateDimensionContent(dimension, content, append = false) {
  const card = elements.dimensionCards[dimension];
  if (!card) return;

  const contentDiv = card.querySelector('.dimension-content');
  
  if (append) {
    state.analysisResults[dimension] += content;
  } else {
    state.analysisResults[dimension] = content;
  }

  contentDiv.textContent = state.analysisResults[dimension];
  contentDiv.classList.add('streaming');
}

function markDimensionComplete(dimension) {
  const card = elements.dimensionCards[dimension];
  if (!card) return;

  const spinner = card.querySelector('.loading-spinner');
  const contentDiv = card.querySelector('.dimension-content');
  
  spinner.classList.add('hidden');
  contentDiv.classList.remove('streaming');
}

function handleAnalysisComplete() {
  const progressMessages = document.querySelectorAll('.progress-message');
  progressMessages.forEach(msg => msg.remove());

  Object.keys(elements.dimensionCards).forEach(key => {
    markDimensionComplete(key);
  });

  elements.downloadBtn.classList.remove('hidden');
  resetAnalyzeButton();
  showSuccess('Analysis completed successfully!');
  console.log('Analysis complete!');
}

function resetAnalyzeButton() {
  elements.analyzeBtn.disabled = false;
  elements.analyzeBtn.innerHTML = `
    <svg class="btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <polygon points="5,3 19,12 5,21" fill="currentColor"/>
    </svg>
    <span>INITIATE ANALYSIS</span>
    <svg class="btn-arrow" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12 L19 12 M13 6 L19 12 L13 18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  state.isAnalyzing = false;
}

async function handleDownload() {
  elements.downloadBtn.disabled = true;
  elements.downloadBtn.innerHTML = `
    <svg class="btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
    </svg>
    <span>GENERATING...</span>
  `;

  try {
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const response = await fetch(`${API_BASE_URL}/api/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: state.currentInput,
        results: state.analysisResults,
        summary: state.summaryResult,
        timestamp: timestamp,
        footerText: "This report was generated by Privacy Prism, a privacy risk analysis tool that evaluates content across six core privacy dimensions. The system reviews your text to identify potential risks related to information exposure, inference, audience impact, platform rules, amplification, and manipulability."
      })
    });

    if (!response.ok) {
      if (response.status === 501) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDF generation not available');
      }
      throw new Error('Failed to generate PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `privacy-analysis-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showSuccess('PDF report downloaded successfully!');

  } catch (error) {
    console.error('PDF generation error:', error);
    
    if (error.message && error.message.includes('browser')) {
      showError('PDF generation is not available in the deployed version. Please use your browser\'s Print function (Ctrl+P or Cmd+P) to save as PDF.');
    } else {
      showError('Failed to generate PDF. Please try again or use browser Print (Ctrl+P).');
    }
  } finally {
    elements.downloadBtn.disabled = false;
    elements.downloadBtn.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3 L12 15 M8 11 L12 15 L16 11" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 17 L3 19 C3 20.1 3.9 21 5 21 L19 21 C20.1 21 21 20.1 21 19 L21 17" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
      <span>EXPORT PDF</span>
    `;
  }
}

// ========================================
// Initialize
// ========================================

console.log('Privacy Prism initialized');
console.log('API Base URL:', API_BASE_URL);
console.log('Ready for privacy analysis');

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-10px);
    }
  }
  
  .progress-message {
    animation: slideIn 0.3s ease-out;
  }
  
  .streaming {
    opacity: 0.8;
    transition: opacity 0.3s ease;
  }
`;
document.head.appendChild(style);

// ========================================
// Global Functions
// ========================================

window.showPage = showPage;

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (elements.navLinks.length > 0) {
    initializeNavigation();
  }
  
  // === Risk Slider Navigation ===
  const riskSlider = document.querySelector('.risk-slider');
  const prevBtn = document.querySelector('.risk-slider-btn.prev');
  const nextBtn = document.querySelector('.risk-slider-btn.next');

  if (riskSlider && prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => {
      riskSlider.scrollBy({ left: -350, behavior: 'smooth' });
    });
    nextBtn.addEventListener('click', () => {
      riskSlider.scrollBy({ left: 350, behavior: 'smooth' });
    });
  }
});
