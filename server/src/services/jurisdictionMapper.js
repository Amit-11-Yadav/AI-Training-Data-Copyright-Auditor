'use strict';

// TLD-to-country mapping (common TLDs)
const TLD_MAP = {
    us: { country: 'United States', framework: 'DMCA / Fair Use', flag: '🇺🇸' },
    com: { country: 'United States (assumed)', framework: 'DMCA / Fair Use', flag: '🇺🇸' },
    org: { country: 'United States (assumed)', framework: 'DMCA / Fair Use', flag: '🇺🇸' },
    net: { country: 'United States (assumed)', framework: 'DMCA / Fair Use', flag: '🇺🇸' },
    edu: { country: 'United States', framework: 'DMCA / Fair Use', flag: '🇺🇸' },
    gov: { country: 'United States', framework: 'DMCA / Fair Use', flag: '🇺🇸' },
    io: { country: 'United States (tech)', framework: 'DMCA / Fair Use', flag: '🇺🇸' },
    ai: { country: 'United States (tech)', framework: 'DMCA / Fair Use', flag: '🇺🇸' },
    // EU
    eu: { country: 'European Union', framework: 'EU AI Act / DSM Directive / GDPR', flag: '🇪🇺' },
    de: { country: 'Germany', framework: 'EU AI Act / DSM Directive / GDPR', flag: '🇩🇪' },
    fr: { country: 'France', framework: 'EU AI Act / DSM Directive / GDPR', flag: '🇫🇷' },
    it: { country: 'Italy', framework: 'EU AI Act / DSM Directive / GDPR', flag: '🇮🇹' },
    es: { country: 'Spain', framework: 'EU AI Act / DSM Directive / GDPR', flag: '🇪🇸' },
    nl: { country: 'Netherlands', framework: 'EU AI Act / DSM Directive / GDPR', flag: '🇳🇱' },
    pl: { country: 'Poland', framework: 'EU AI Act / DSM Directive / GDPR', flag: '🇵🇱' },
    se: { country: 'Sweden', framework: 'EU AI Act / DSM Directive / GDPR', flag: '🇸🇪' },
    be: { country: 'Belgium', framework: 'EU AI Act / DSM Directive / GDPR', flag: '🇧🇪' },
    // India
    in: { country: 'India', framework: 'Copyright Act 1957 / IT Act 2000 / Fair Dealing §52', flag: '🇮🇳' },
    // UK
    uk: { country: 'United Kingdom', framework: 'CDPA 1988 / UK GDPR', flag: '🇬🇧' },
    co: { country: 'International', framework: 'Global / SPDX', flag: '🌐' },
    // Canada
    ca: { country: 'Canada', framework: 'Copyright Act (Canada)', flag: '🇨🇦' },
    // Australia
    au: { country: 'Australia', framework: 'Copyright Act 1968 (AU)', flag: '🇦🇺' },
    // Japan
    jp: { country: 'Japan', framework: 'Copyright Act (Japan)', flag: '🇯🇵' },
    // China
    cn: { country: 'China', framework: 'PRC Copyright Law', flag: '🇨🇳' },
};

// Known domain overrides (override TLD logic)
const DOMAIN_OVERRIDES = {
    'reddit.com': { country: 'United States', framework: 'DMCA / ToS Restrictive', flag: '🇺🇸' },
    'twitter.com': { country: 'United States', framework: 'DMCA / ToS Restrictive', flag: '🇺🇸' },
    'x.com': { country: 'United States', framework: 'DMCA / ToS Restrictive', flag: '🇺🇸' },
    'nytimes.com': { country: 'United States', framework: 'DMCA / All Rights Reserved', flag: '🇺🇸' },
    'bbc.co.uk': { country: 'United Kingdom', framework: 'CDPA 1988', flag: '🇬🇧' },
    'bbc.com': { country: 'United Kingdom', framework: 'CDPA 1988', flag: '🇬🇧' },
    'wikipedia.org': { country: 'Global', framework: 'CC BY-SA 3.0', flag: '🌐' },
    'arxiv.org': { country: 'United States', framework: 'CC BY 4.0 / arXiv ToU', flag: '🇺🇸' },
    'github.com': { country: 'United States', framework: 'DMCA / Per-repo License', flag: '🇺🇸' },
    'huggingface.co': { country: 'United States', framework: 'DMCA / Per-dataset License', flag: '🇺🇸' },
};

/**
 * Map a URL's domain to a legal jurisdiction.
 * @param {string} url
 * @returns {{ country, framework, flag }}
 */
function mapJurisdiction(url) {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.replace('www.', '');

        // Check known domain overrides
        if (DOMAIN_OVERRIDES[hostname]) return DOMAIN_OVERRIDES[hostname];

        // Extract TLD
        const parts = hostname.split('.');
        const tld = parts[parts.length - 1].toLowerCase();

        // co.xx → use second TLD
        if (tld === 'co' && parts.length >= 3) {
            const secondTld = parts[parts.length - 2].toLowerCase();
            if (TLD_MAP[secondTld]) return TLD_MAP[secondTld];
        }

        return TLD_MAP[tld] || { country: 'Global', framework: 'Global / SPDX Standards', flag: '🌐' };
    } catch {
        return { country: 'Unknown', framework: 'Unknown', flag: '❓' };
    }
}

/**
 * Calculate fair use probability (0-100) based on signals.
 * Based on the four factor test (purpose, nature, amount, market effect).
 */
function estimateFairUse(license, tos, robots, jurisdiction) {
    let score = 50; // Start neutral

    // Factor 1: purpose (educational/research boosts fair use)
    if (jurisdiction.framework.includes('Fair Use') || jurisdiction.framework.includes('Fair Dealing')) {
        score += 15;
    }

    // Factor 2: nature of the work
    if (license.spdxId && license.spdxId.startsWith('CC')) {
        score += license.aiTrainingAllowed ? 30 : -20;
    }
    if (license.spdxId === 'ARR') score -= 30;
    if (license.spdxId === 'Public Domain') score += 40;
    if (['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-2-Clause', 'BSD-3-Clause'].includes(license.spdxId)) {
        score += 25;
    }

    // Factor 3: robots.txt (accessibility signal)
    if (robots.allowed === false) score -= 20;
    if (robots.aiBotBlocked) score -= 25;

    // Factor 4: market harm / ToS
    if (tos.restrictive) score -= 30;
    if (tos.score > 5) score -= 10;

    return Math.max(0, Math.min(100, Math.round(score)));
}

module.exports = { mapJurisdiction, estimateFairUse };
