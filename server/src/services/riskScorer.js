'use strict';

/**
 * Risk Scoring Engine
 * Combines signals from license, robots, ToS, jurisdiction, and fair use
 * into a final risk level: HIGH / MEDIUM / LOW
 */

function scoreRisk({ license, robots, tos, jurisdiction, fairUseProbability }) {
    let points = 0; // Higher = more risky

    // ── License signals ───────────────────────────────────────────────────────
    if (license.aiTrainingAllowed === false) points += 40;
    if (license.aiTrainingAllowed === true) points -= 30;
    if (license.spdxId === 'ARR') points += 30;
    if (license.spdxId === 'Public Domain') points -= 40;
    if (license.spdxId === 'CC0-1.0') points -= 35;
    if (license.spdxId === 'UNKNOWN') points += 10; // Ambiguous = slight risk
    if (license.spdxId === 'UNKNOWN-AI') points += 15;

    // ── robots.txt signals ────────────────────────────────────────────────────
    if (robots.allowed === false) points += 25;
    if (robots.aiBotBlocked) points += 20;
    if (robots.allowed === true && !robots.aiBotBlocked) points -= 5;

    // ── ToS signals ───────────────────────────────────────────────────────────
    if (tos.restrictive) points += 25;
    if (tos.score !== undefined) points += Math.min(tos.score * 3, 15);

    // ── Jurisdiction signals ──────────────────────────────────────────────────
    if (jurisdiction.framework.includes('All Rights Reserved')) points += 15;
    if (jurisdiction.framework.includes('EU AI Act')) points += 5; // EU stricter

    // ── Fair use probability ──────────────────────────────────────────────────
    if (fairUseProbability !== undefined) {
        // High fair use probability reduces risk
        points -= Math.round((fairUseProbability - 50) * 0.4);
    }

    // ── Determine level ───────────────────────────────────────────────────────
    let risk;
    if (points >= 40) risk = 'HIGH';
    else if (points >= 15) risk = 'MEDIUM';
    else risk = 'LOW';

    return { risk, riskScore: points };
}

module.exports = { scoreRisk };
