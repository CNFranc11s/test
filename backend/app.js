require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const { runMultiAgentAnalysis } = require('./services/analyzer');
const { extractTextFromURL } = require('./services/scraper');
const { generatePDF } = require('./services/pdfGenerator');

const app = express();

const allowedOrigins = (process.env.CORS_ALLOWLIST || 'https://privacy-prism-1.vercel.app,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    model: config.model,
    summaryModel: config.summaryModel,
    baseUrlConfigured: Boolean(config.openaiBaseUrl),
    apiKeyConfigured: Boolean(config.openaiApiKey),
  });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { input, type } = req.body || {};

    if (!input) {
      return res.status(400).json({ error: 'Missing input field.' });
    }

    const sourceType = type === 'url' ? 'url' : 'text';
    let normalizedContent = input.trim();
    let extractedPreview = null;

    if (sourceType === 'url') {
      try {
        normalizedContent = await extractTextFromURL(input);
        extractedPreview = normalizedContent.substring(0, 260);
      } catch (error) {
        return res.status(400).json({ error: error.message || 'Failed to fetch URL.' });
      }
    }

    if (normalizedContent.length < 10) {
      return res.status(400).json({ error: 'Content too short. Provide at least 10 characters.' });
    }

    if (normalizedContent.length > 20000) {
      normalizedContent = normalizedContent.substring(0, 20000);
    }

    const analysis = await runMultiAgentAnalysis(normalizedContent);

    res.json({
      ...analysis,
      source: {
        type: sourceType,
        provided: input,
        extractedPreview,
        length: normalizedContent.length,
      },
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze content.' });
  }
});

app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { content, results, timestamp, summary } = req.body || {};

    if (!content || !results) {
      return res.status(400).json({ error: 'Missing content/results payload.' });
    }

    const pdfBuffer = await generatePDF({ content, results, summary, timestamp });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="privacy-analysis.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate PDF.' });
  }
});

module.exports = app;
