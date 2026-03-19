'use strict';
const axios = require('axios');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Analyze text via Claude API to determine if AI training is permitted.
 * Returns null for all fields if no API key is configured.
 *
 * @param {string} sourceText - ToS or license text to analyze
 * @param {string} url - Source URL (for context)
 * @returns {{ aiTrainingAllowed: bool|null, summary: string, fairUseProbability: number|null }}
 */
async function analyzeWithClaude(sourceText, url) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
        return { aiTrainingAllowed: null, summary: null, fairUseProbability: null };
    }

    const prompt = `You are a copyright law expert specializing in AI training data rights.

I will give you text from a website's Terms of Service or copyright notice.
Source URL: ${url}

Text to analyze:
"""
${sourceText.slice(0, 2000)}
"""

Please respond in JSON format ONLY with this exact structure:
{
  "aiTrainingAllowed": true|false|null,
  "summary": "2-sentence plain English explanation of the copyright status and whether this source can be used to train AI models",
  "fairUseProbability": <integer 0-100>,
  "keyRisks": ["risk1", "risk2"]
}

Where:
- aiTrainingAllowed: true if clearly permitted, false if clearly prohibited, null if ambiguous
- summary: Clear explanation for a non-lawyer
- fairUseProbability: 0=definitely cannot use, 100=definitely can use
- keyRisks: up to 3 specific legal risks (empty array if safe)`;

    try {
        const resp = await axios.post(
            ANTHROPIC_API_URL,
            {
                model: 'claude-3-haiku-20240307',
                max_tokens: 400,
                messages: [{ role: 'user', content: prompt }],
            },
            {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                timeout: 20000,
            }
        );

        const content = resp.data.content?.[0]?.text || '';
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in Claude response');

        const parsed = JSON.parse(jsonMatch[0]);
        return {
            aiTrainingAllowed: parsed.aiTrainingAllowed ?? null,
            summary: parsed.summary || null,
            fairUseProbability: typeof parsed.fairUseProbability === 'number' ? parsed.fairUseProbability : null,
            keyRisks: parsed.keyRisks || [],
        };
    } catch (err) {
        console.warn('[Claude] Analysis failed:', err.message);
        return { aiTrainingAllowed: null, summary: null, fairUseProbability: null, keyRisks: [] };
    }
}

module.exports = { analyzeWithClaude };
