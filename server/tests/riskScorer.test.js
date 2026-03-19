'use strict';
const { scoreRisk } = require('../src/services/riskScorer');

describe('Risk Scorer Engine', () => {
    const OPEN_LICENSE = {
        spdxId: 'CC-BY-4.0',
        name: 'CC Attribution 4.0',
        aiTrainingAllowed: true,
        confidence: 0.95,
    };

    const CLOSED_LICENSE = {
        spdxId: 'ARR',
        name: 'All Rights Reserved',
        aiTrainingAllowed: false,
        confidence: 0.9,
    };

    const UNKNOWN_LICENSE = {
        spdxId: 'UNKNOWN',
        name: 'Unknown / Not Detected',
        aiTrainingAllowed: null,
        confidence: 0.1,
    };

    const ROBOTS_ALLOWED = { allowed: true, aiBotBlocked: false, disallowedPaths: [] };
    const ROBOTS_BLOCKED = { allowed: false, aiBotBlocked: true, disallowedPaths: ['/'] };

    const TOS_CLEAN = { restrictive: false, clauses: [], confidence: 0.3, score: 0 };
    const TOS_RESTRICTIVE = { restrictive: true, clauses: ['prohibits AI training'], confidence: 0.85, score: 6 };

    const JURISDICTION_US = { country: 'United States', framework: 'DMCA / Fair Use', flag: '🇺🇸' };
    const JURISDICTION_EU = { country: 'EU', framework: 'EU AI Act / DSM Directive / GDPR', flag: '🇪🇺' };

    test('LOW risk — CC BY 4.0 license + robots allowed + clean ToS', () => {
        const { risk, riskScore } = scoreRisk({
            license: OPEN_LICENSE,
            robots: ROBOTS_ALLOWED,
            tos: TOS_CLEAN,
            jurisdiction: JURISDICTION_US,
            fairUseProbability: 80,
        });
        expect(risk).toBe('LOW');
        expect(riskScore).toBeLessThan(15);
    });

    test('HIGH risk — All Rights Reserved + robots blocked + restrictive ToS', () => {
        const { risk, riskScore } = scoreRisk({
            license: CLOSED_LICENSE,
            robots: ROBOTS_BLOCKED,
            tos: TOS_RESTRICTIVE,
            jurisdiction: JURISDICTION_EU,
            fairUseProbability: 15,
        });
        expect(risk).toBe('HIGH');
        expect(riskScore).toBeGreaterThanOrEqual(40);
    });

    test('MEDIUM risk — Unknown license + robots allowed + clean ToS', () => {
        const { risk } = scoreRisk({
            license: UNKNOWN_LICENSE,
            robots: ROBOTS_ALLOWED,
            tos: TOS_CLEAN,
            jurisdiction: JURISDICTION_US,
            fairUseProbability: 50,
        });
        // Unknown license with no other signals = low-medium
        expect(['LOW', 'MEDIUM']).toContain(risk);
    });

    test('HIGH risk — CC BY-NC (non-commercial) + restrictive ToS', () => {
        const ncLicense = {
            spdxId: 'CC-BY-NC-4.0',
            name: 'CC Attribution NonCommercial 4.0',
            aiTrainingAllowed: false,
            confidence: 0.9,
        };
        const { risk } = scoreRisk({
            license: ncLicense,
            robots: ROBOTS_ALLOWED,
            tos: TOS_RESTRICTIVE,
            jurisdiction: JURISDICTION_US,
            fairUseProbability: 20,
        });
        expect(risk).toBe('HIGH');
    });

    test('LOW risk — Public Domain', () => {
        const pdLicense = {
            spdxId: 'Public Domain',
            name: 'Public Domain',
            aiTrainingAllowed: true,
            confidence: 0.99,
        };
        const { risk } = scoreRisk({
            license: pdLicense,
            robots: ROBOTS_ALLOWED,
            tos: TOS_CLEAN,
            jurisdiction: JURISDICTION_US,
            fairUseProbability: 95,
        });
        expect(risk).toBe('LOW');
    });
});
