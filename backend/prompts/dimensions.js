// All LLM prompts that drive the six privacy agents + summary agent live here.
// Keeping everything centralized makes it easier to tweak tone/word count later.

const wordRange = '100-120 words';

const agentPrompts = {
  exposure: {
    key: 'exposure',
    label: 'Exposure',
    codename: 'Exposure Sentinel',
    targetWords: wordRange,
    systemPrompt: `You are the Exposure Sentinel, a privacy analyst who spots direct identifiers, metadata breadcrumbs, and cross-post clues. Respond in polished professional English and keep the tone calm but candid.`,
    userTemplate: `You must review the submission below strictly through the EXPOSURE lens.

Submission:
"""
{{CONTENT}}
"""

Deliver ${wordRange} using the following structure:
1. Risk Verdict (High / Medium / Low + 1 short reason)
2. Signals Detected – list 3 concise bullets that cite concrete snippets
3. Mitigation – 2 sentences with specific redaction/obfuscation tips.
`,
  },
  inference: {
    key: 'inference',
    label: 'Inference',
    codename: 'Inference Profiler',
    targetWords: wordRange,
    systemPrompt: `You are the Inference Profiler, trained to deduce hidden traits (emotions, health, finances, networks) from subtle cues.`,
    userTemplate: `Analyze the submission with an INFERENCE mindset.

Submission:
"""
{{CONTENT}}
"""

Write ${wordRange} covering:
• Deduced Traits – 3 bullets, each naming the inferred trait + the clue that exposed it.
• Sensitivity Check – classify each trait (low/med/high sensitivity).
• Containment – short paragraph on how to neutralize those inference paths.
`,
  },
  audience: {
    key: 'audience',
    label: 'Audience & Consequences',
    codename: 'Audience Forecaster',
    targetWords: wordRange,
    systemPrompt: `You are the Audience Forecaster. Map how content might travel to unintended communities and what blowback follows.`,
    userTemplate: `Evaluate who might realistically encounter this submission and the downstream consequences.

Submission:
"""
{{CONTENT}}
"""

Cover ${wordRange} with:
• Audience Map – 3 audience clusters + why they gain access.
• Consequence Radar – bullet list of likely outcomes (reputation, compliance, emotional).
• Safeguard Moves – 2 tactical recommendations to keep reach aligned with intent.
`,
  },
  platforms: {
    key: 'platforms',
    label: 'Platforms & Rules',
    codename: 'Platform Arbiter',
    targetWords: wordRange,
    systemPrompt: `You are the Platform Arbiter, fluent in policy, retention, and recommender behavior across social/UGC networks.`,
    userTemplate: `Review the submission through the PLATFORMS & RULES dimension.

Submission:
"""
{{CONTENT}}
"""

In ${wordRange}, address:
1. Policy Touchpoints – cite 2-3 policy areas (ToS, privacy, moderation) at risk.
2. Data Lifecycle – how storage, replication, or third-party sharing could escalate risk.
3. Governance Advice – concrete compliance or settings tweaks to stay within rules.
`,
  },
  amplification: {
    key: 'amplification',
    label: 'Amplification',
    codename: 'Amplification Radar',
    targetWords: wordRange,
    systemPrompt: `You are the Amplification Radar. You predict virality mechanics, meme-ification, and outrage cascades.`,
    userTemplate: `Estimate how and why the submission could spread beyond its author’s expectations.

Submission:
"""
{{CONTENT}}
"""

Within ${wordRange}, include:
• Traction Triggers – 3 factors (tone, timing, novelty, community) that boost reach.
• Escalation Paths – short paragraph on share chains or algorithm hooks.
• Dampeners – actionable levers to keep circulation controlled.
`,
  },
  manipulability: {
    key: 'manipulability',
    label: 'Manipulability',
    codename: 'Manipulability Watch',
    targetWords: wordRange,
    systemPrompt: `You are Manipulability Watch, specializing in remix, deepfake, and out-of-context risks.`,
    userTemplate: `Scrutinize how the submission might be distorted, excerpted, or fused with other data.

Submission:
"""
{{CONTENT}}
"""

Respond in ${wordRange} covering:
1. Attack Surface – list 3 manipulation scenarios (quote-mining, AI remix, synthetic pairing).
2. Impact Window – explain the harm those distortions create.
3. Hardening Tips – practical defenses (watermarking, rephrasing, access limits).
`,
  },
};

const summaryPrompt = {
  systemPrompt: 'You are the Prism Conductor. Once the six agents respond, you synthesize a cross-dimensional narrative for decision-makers.',
  userTemplate: `Original Submission:
"""
{{CONTENT}}
"""

Agent Findings (verbatim excerpts provided):
{{FINDINGS}}

Produce a 180-220 word executive summary with:
• Overall Privacy Posture (High/Medium/Low + 1 line justification)
• The three most critical cross-cutting insights (reference agent names)
• Action Blueprint – 3 prioritized steps blending policy, comms, and technical mitigations.

Write in polished English suitable for a CISO briefing.`,
};

const buildAgentMessages = (agentKey, content) => {
  const agent = agentPrompts[agentKey];
  if (!agent) {
    throw new Error(`Unknown agent key: ${agentKey}`);
  }

  return [
    { role: 'system', content: agent.systemPrompt },
    { role: 'user', content: agent.userTemplate.replace('{{CONTENT}}', content) },
  ];
};

const buildSummaryMessages = (content, agentReports) => {
  const findingsBlock = agentReports
    .map((report) => `- ${report.label} (${report.codename}): ${report.content || report.error}`)
    .join('\n');

  return [
    { role: 'system', content: summaryPrompt.systemPrompt },
    {
      role: 'user',
      content: summaryPrompt.userTemplate
        .replace('{{CONTENT}}', content)
        .replace('{{FINDINGS}}', findingsBlock),
    },
  ];
};

module.exports = {
  agentPrompts,
  summaryPrompt,
  buildAgentMessages,
  buildSummaryMessages,
};
