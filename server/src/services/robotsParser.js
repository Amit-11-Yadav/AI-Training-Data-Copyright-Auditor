'use strict';
const axios = require('axios');

const UA = 'AICopyrightAuditor/1.0';
const TIMEOUT = 8000;

// Patterns for disallow rules that imply AI/bot restrictions
const AI_BOT_AGENTS = ['gptbot', 'ccbot', 'anthropic-ai', 'google-extended', 'bytespider'];

/**
 * Fetch and parse robots.txt for a given domain URL.
 * Returns { allowed: bool, disallowedPaths: [], aiBotBlocked: bool, raw: string }
 */
async function parseRobots(urlStr) {
    const result = { allowed: true, disallowedPaths: [], aiBotBlocked: false, raw: null };
    try {
        const base = new URL(urlStr);
        const robotsUrl = `${base.protocol}//${base.hostname}/robots.txt`;

        const resp = await axios.get(robotsUrl, {
            headers: { 'User-Agent': UA },
            timeout: TIMEOUT,
            validateStatus: (s) => s < 500,
        });

        if (resp.status !== 200) {
            result.allowed = true; // No robots.txt = generally allowed
            return result;
        }

        const text = resp.data;
        result.raw = text.slice(0, 2000);

        // Check AI-specific bots
        const lowerText = text.toLowerCase();
        for (const bot of AI_BOT_AGENTS) {
            if (lowerText.includes(bot)) {
                // Check if it's followed by Disallow: /
                const idx = lowerText.indexOf(bot);
                const snippet = lowerText.slice(idx, idx + 200);
                if (snippet.includes('disallow: /') && !snippet.includes('disallow: \n') && !snippet.includes('disallow:\n')) {
                    result.aiBotBlocked = true;
                    break;
                }
            }
        }

        // Parse global rules (User-agent: *)
        const sections = text.split(/(?=user-agent:)/i);
        for (const section of sections) {
            const lines = section.split('\n').map((l) => l.trim());
            const agentLine = lines[0] || '';
            if (!agentLine.toLowerCase().includes('user-agent: *') && !agentLine.toLowerCase().includes('user-agent:*')) continue;

            for (const line of lines.slice(1)) {
                if (line.toLowerCase().startsWith('disallow:')) {
                    const path = line.slice('disallow:'.length).trim();
                    if (path === '/') {
                        result.allowed = false;
                    }
                    if (path) result.disallowedPaths.push(path);
                }
            }
        }
    } catch {
        // If robots.txt unreachable, assume allowed
        result.allowed = true;
    }
    return result;
}

module.exports = { parseRobots };
