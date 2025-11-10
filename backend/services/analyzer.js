const OpenAI = require('openai');
let ProxyAgent;
let undiciFetch;

try {
  ({ ProxyAgent, fetch: undiciFetch } = require('undici'));
} catch (error) {
  console.warn('Optional dependency "undici" not found. Proxy support for OpenAI client is disabled.');
}
const { agentPrompts, buildAgentMessages, buildSummaryMessages } = require('../prompts/dimensions');
const config = require('../config/config');

const baseClientOptions = {
  apiKey: config.openaiApiKey,
  baseURL: config.openaiBaseUrl,
  timeout: 60_000,
};

if ((process.env.HTTPS_PROXY || process.env.HTTP_PROXY) && ProxyAgent && undiciFetch) {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const dispatcher = new ProxyAgent(proxyUrl);
  baseClientOptions.fetch = (url, init = {}) => undiciFetch(url, { ...init, dispatcher });
  console.log(`✓ OpenAI client using proxy ${proxyUrl}`);
} else if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  console.warn('Proxy environment variables detected but undici is unavailable. Requests will ignore proxy settings.');
}

const openai = new OpenAI(baseClientOptions);

const dimensionKeys = Object.keys(agentPrompts);

async function callChat(messages, model) {
  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.35,
    max_tokens: 700,
  });

  const choice = response.choices?.[0]?.message?.content || '';
  return {
    content: choice.trim(),
    raw: response,
  };
}

async function runAgent(agentKey, content) {
  const profile = agentPrompts[agentKey];
  const startedAt = Date.now();

  try {
    const messages = buildAgentMessages(agentKey, content);
    const model = config.agentModels?.[agentKey] || config.model;
    const { content: agentContent, raw } = await callChat(messages, model);
    const usage = raw.usage || {};

    return {
      key: agentKey,
      label: profile.label,
      codename: profile.codename,
      status: 'fulfilled',
      content: agentContent,
      model,
      targetWords: profile.targetWords,
      usage,
      startedAt,
      completedAt: Date.now(),
    };
  } catch (error) {
    return {
      key: agentKey,
      label: profile?.label || agentKey,
      codename: profile?.codename || agentKey,
      status: 'rejected',
      error: error.message || 'LLM call failed',
      model: config.agentModels?.[agentKey] || config.model,
      startedAt,
      completedAt: Date.now(),
    };
  }
}

async function buildSummary(content, agentReports) {
  const messages = buildSummaryMessages(content, agentReports);
  const { content: summaryContent, raw } = await callChat(messages, config.summaryModel);
  return {
    content: summaryContent,
    model: config.summaryModel,
    usage: raw.usage || {},
  };
}

async function runMultiAgentAnalysis(content) {
  if (!config.openaiApiKey) {
    throw new Error('Missing OPENAI_API_KEY. Please configure backend/config/config.js env vars.');
  }

  const analysisStartedAt = Date.now();

  const agentPromises = dimensionKeys.map((key) => runAgent(key, content));
  const agentResults = await Promise.all(agentPromises);

  let summary = null;
  try {
    summary = await buildSummary(content, agentResults);
  } catch (error) {
    summary = {
      error: error.message || 'Summary agent failed',
    };
  }

  const agentMap = agentResults.reduce((acc, result) => {
    acc[result.key] = result;
    return acc;
  }, {});

  const completedAt = Date.now();

  return {
    content,
    summary,
    agents: agentMap,
    completedAt,
    startedAt: analysisStartedAt,
    elapsedMs: completedAt - analysisStartedAt,
  };
}

module.exports = {
  runMultiAgentAnalysis,
};
