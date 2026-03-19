'use strict';

// Phrases that strongly indicate AI/scraping restrictions
const RESTRICTIVE_PATTERNS = [
    { pattern: /prohibit[s]?\s+(scraping|crawling|harvesting|automated)/i, weight: 3 },
    { pattern: /no\s+(scraping|crawling|automated\s+access|data\s+mining)/i, weight: 3 },
    { pattern: /machine\s+learning.*\bprohibit/i, weight: 4 },
    { pattern: /AI\s+training.*\bprohibit/i, weight: 4 },
    { pattern: /prohibit.*\bAI\s+training/i, weight: 4 },
    { pattern: /not\s+use.*\btraining\s+(data|dataset)/i, weight: 3 },
    { pattern: /may\s+not\s+use.*\bautomated/i, weight: 2 },
    { pattern: /\bscraping\s+is\s+(not\s+)?allowed/i, weight: 2 },
    { pattern: /commercial\s+use.*\bprohibited/i, weight: 2 },
    { pattern: /reproduce.*\bwithout.*\bpermission/i, weight: 2 },
    { pattern: /intellectual\s+property.*\breserved/i, weight: 1 },
    { pattern: /opt.out.*\bAI/i, weight: 2 },
    { pattern: /generative\s+AI.*\bprohibit/i, weight: 4 },
];

const PERMISSIVE_PATTERNS = [
    { pattern: /open\s+access/i, weight: -2 },
    { pattern: /creative\s+commons/i, weight: -3 },
    { pattern: /public\s+domain/i, weight: -3 },
    { pattern: /free\s+to\s+(use|reuse|share)/i, weight: -2 },
    { pattern: /research\s+(use|purposes).*\bpermitted/i, weight: -2 },
];

/**
 * Scan text for Terms-of-Service restrictive clauses.
 * @param {string} text - raw page text (fullText from scraper)
 * @returns {{ restrictive: bool, clauses: string[], confidence: number, score: number }}
 */
function scanToS(text) {
    if (!text || text.length < 20) {
        return { restrictive: false, clauses: [], confidence: 0.1, score: 0 };
    }

    let score = 0;
    const clauses = [];

    for (const { pattern, weight } of RESTRICTIVE_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            score += weight;
            clauses.push(match[0].slice(0, 100).trim());
        }
    }

    for (const { pattern, weight } of PERMISSIVE_PATTERNS) {
        if (pattern.test(text)) score += weight;
    }

    const confidence = Math.min(0.9, 0.3 + (Math.abs(score) * 0.1));
    const restrictive = score >= 2;

    return { restrictive, clauses: [...new Set(clauses)].slice(0, 5), confidence, score };
}

module.exports = { scanToS };
