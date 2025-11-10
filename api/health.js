// Vercel Serverless Function for health check
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.status(200).json({
    status: 'ok',
    platform: 'vercel',
    model: process.env.MODEL || 'gpt-4o',
    mode: process.env.ANALYSIS_MODE || 'A',
    timestamp: new Date().toISOString()
  });
};

