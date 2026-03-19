'use strict';
const { scrapeUrl } = require('./scraper');
const { parseRobots } = require('./robotsParser');
const { classifyLicense } = require('./licenseClassifier');
const { scanToS } = require('./tosScanner');
const { mapJurisdiction, estimateFairUse } = require('./jurisdictionMapper');
const { scoreRisk } = require('./riskScorer');
const { analyzeWithClaude } = require('./claudeAnalyzer');
const { AuditModel } = require('../models/Audit');

/**
 * Process a single URL through the full audit pipeline.
 * @param {string} url
 * @returns {object} result - the source audit record
 */
async function auditSingleUrl(url) {
    const result = {
        url,
        domain: '',
        title: '',
        license: {},
        robots: {},
        tos: {},
        jurisdiction: {},
        fairUseProbability: null,
        aiSummary: null,
        risk: 'UNKNOWN',
        riskScore: 0,
        error: null,
    };

    try {
        const parsed = new URL(url);
        result.domain = parsed.hostname.replace('www.', '');
    } catch {
        result.error = 'Invalid URL';
        result.risk = 'UNKNOWN';
        return result;
    }

    // 1. Scrape
    const scraped = await scrapeUrl(url);
    result.title = scraped.title;
    if (scraped.error && !scraped.fullText) {
        result.error = scraped.error;
    }

    // 2. robots.txt
    result.robots = await parseRobots(url);

    // 3. License classification
    result.license = classifyLicense(scraped);

    // 4. ToS scanning
    result.tos = scanToS(scraped.fullText);

    // 5. Jurisdiction
    result.jurisdiction = mapJurisdiction(url);

    // 6. Fair use probability (rule-based)
    const fairUseProbability = estimateFairUse(result.license, result.tos, result.robots, result.jurisdiction);
    result.fairUseProbability = fairUseProbability;

    // 7. Claude analysis (if key available & text is meaningful)
    const textForClaude = (scraped.fullText || '') + ' ' + (scraped.footerText || '');
    if (textForClaude.length > 100) {
        const claudeResult = await analyzeWithClaude(textForClaude, url);
        if (claudeResult.summary) {
            result.aiSummary = claudeResult.summary;
            // Override fair use probability if Claude provides one
            if (claudeResult.fairUseProbability !== null) {
                result.fairUseProbability = Math.round((fairUseProbability + claudeResult.fairUseProbability) / 2);
            }
            // Adjust license if Claude has higher confidence
            if (claudeResult.aiTrainingAllowed !== null && result.license.confidence < 0.7) {
                result.license.aiTrainingAllowed = claudeResult.aiTrainingAllowed;
            }
        }
    }

    // 8. Risk scoring
    const { risk, riskScore } = scoreRisk({
        license: result.license,
        robots: result.robots,
        tos: result.tos,
        jurisdiction: result.jurisdiction,
        fairUseProbability: result.fairUseProbability,
    });
    result.risk = risk;
    result.riskScore = riskScore;

    // 9. Generate fallback rule-based summary if no Claude summary
    if (!result.aiSummary) {
        result.aiSummary = generateRuleSummary(result);
    }

    return result;
}

function generateRuleSummary(result) {
    const { license, robots, tos, risk, jurisdiction } = result;
    const parts = [];

    if (license.name && license.name !== 'Unknown / Not Detected') {
        parts.push(`License detected: ${license.name}.`);
    }
    if (robots.allowed === false) {
        parts.push('robots.txt disallows all crawling.');
    } else if (robots.aiBotBlocked) {
        parts.push('robots.txt explicitly blocks AI bots.');
    }
    if (tos.restrictive && tos.clauses.length > 0) {
        parts.push(`Terms of Service contains restrictive language: "${tos.clauses[0]}".`);
    }
    parts.push(
        risk === 'HIGH'
            ? `Under ${jurisdiction.framework}, this source poses HIGH copyright risk for AI training.`
            : risk === 'LOW'
                ? `This source appears safe to use under ${jurisdiction.framework}.`
                : `Copyright status is ambiguous under ${jurisdiction.framework}.`
    );

    return parts.join(' ');
}

/**
 * Run the full audit for a list of URLs, updating the audit session in the store.
 */
async function runAudit(auditId, urls) {
    await AuditModel.update(auditId, { status: 'processing', total: urls.length, progress: 0 });

    const CONCURRENCY = 3;

    async function processChunk(chunk) {
        return Promise.all(chunk.map((url) => auditSingleUrl(url)));
    }

    for (let i = 0; i < urls.length; i += CONCURRENCY) {
        const chunk = urls.slice(i, i + CONCURRENCY);
        const results = await processChunk(chunk);
        for (const r of results) {
            await AuditModel.pushSource(auditId, r);
        }
    }

    // Build and store summary
    const audit = await AuditModel.findById(auditId);
    const sources = audit?.sources || [];
    const summary = {
        total: sources.length,
        high: sources.filter((s) => s.risk === 'HIGH').length,
        medium: sources.filter((s) => s.risk === 'MEDIUM').length,
        low: sources.filter((s) => s.risk === 'LOW').length,
        unknown: sources.filter((s) => s.risk === 'UNKNOWN').length,
    };

    await AuditModel.update(auditId, {
        status: 'complete',
        completedAt: new Date(),
        summary,
        progress: sources.length,
    });
}

module.exports = { auditSingleUrl, runAudit };
