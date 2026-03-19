'use strict';

// SPDX license identifiers and their AI training implications
const SPDX_LICENSES = [
    { id: 'CC0-1.0', name: 'Creative Commons Zero', aiTrainingAllowed: true },
    { id: 'CC-BY-4.0', name: 'CC Attribution 4.0', aiTrainingAllowed: true },
    { id: 'CC-BY-3.0', name: 'CC Attribution 3.0', aiTrainingAllowed: true },
    { id: 'CC-BY-SA-4.0', name: 'CC Attribution ShareAlike 4.0', aiTrainingAllowed: true },
    { id: 'CC-BY-SA-3.0', name: 'CC Attribution ShareAlike 3.0', aiTrainingAllowed: true },
    { id: 'CC-BY-NC-4.0', name: 'CC Attribution NonCommercial 4.0', aiTrainingAllowed: false },
    { id: 'CC-BY-NC-SA-4.0', name: 'CC Attribution NonCommercial ShareAlike 4.0', aiTrainingAllowed: false },
    { id: 'CC-BY-ND-4.0', name: 'CC Attribution NoDerivs 4.0', aiTrainingAllowed: false },
    { id: 'MIT', name: 'MIT License', aiTrainingAllowed: true },
    { id: 'Apache-2.0', name: 'Apache 2.0', aiTrainingAllowed: true },
    { id: 'GPL-3.0', name: 'GNU GPL v3', aiTrainingAllowed: true },
    { id: 'GPL-2.0', name: 'GNU GPL v2', aiTrainingAllowed: true },
    { id: 'LGPL-2.1', name: 'GNU LGPL 2.1', aiTrainingAllowed: true },
    { id: 'BSD-2-Clause', name: 'BSD 2-Clause', aiTrainingAllowed: true },
    { id: 'BSD-3-Clause', name: 'BSD 3-Clause', aiTrainingAllowed: true },
    { id: 'ISC', name: 'ISC License', aiTrainingAllowed: true },
    { id: 'Public Domain', name: 'Public Domain', aiTrainingAllowed: true },
];

const CC_URL_MAP = {
    'creativecommons.org/licenses/by/': 'CC-BY-4.0',
    'creativecommons.org/licenses/by-sa/': 'CC-BY-SA-4.0',
    'creativecommons.org/licenses/by-nc/': 'CC-BY-NC-4.0',
    'creativecommons.org/licenses/by-nc-sa/': 'CC-BY-NC-SA-4.0',
    'creativecommons.org/licenses/by-nd/': 'CC-BY-ND-4.0',
    'creativecommons.org/publicdomain/zero/': 'CC0-1.0',
    'creativecommons.org/publicdomain/mark/': 'Public Domain',
};

/**
 * Classify the license from scraped signals.
 * @param {object} scraped - result from scraper.js
 * @returns {{ spdxId, name, aiTrainingAllowed, confidence, raw }}
 */
function classifyLicense(scraped) {
    const { metaLicense, relLicense, headerLicense, footerText, fullText } = scraped;

    // 1. Check rel="license" URL (highest confidence)
    if (relLicense) {
        const lowerRel = relLicense.toLowerCase();
        for (const [pattern, spdxId] of Object.entries(CC_URL_MAP)) {
            if (lowerRel.includes(pattern)) {
                const lic = SPDX_LICENSES.find((l) => l.id === spdxId);
                if (lic) return { ...lic, confidence: 0.95, raw: relLicense };
            }
        }
    }

    // 2. Check meta license tag
    const metaText = (metaLicense || '').toLowerCase();
    for (const lic of SPDX_LICENSES) {
        if (metaText.includes(lic.id.toLowerCase()) || metaText.includes(lic.name.toLowerCase())) {
            return { ...lic, confidence: 0.9, raw: metaLicense };
        }
    }
    // CC URL in meta
    for (const [pattern, spdxId] of Object.entries(CC_URL_MAP)) {
        if (metaText.includes(pattern)) {
            const lic = SPDX_LICENSES.find((l) => l.id === spdxId);
            if (lic) return { ...lic, confidence: 0.88, raw: metaLicense };
        }
    }

    // 3. Search page text for SPDX identifiers
    const combined = ((footerText || '') + ' ' + (fullText || '')).toLowerCase();

    for (const lic of SPDX_LICENSES) {
        if (combined.includes(lic.id.toLowerCase())) {
            return { ...lic, confidence: 0.7, raw: lic.id };
        }
        if (lic.id.startsWith('CC-') && combined.includes(lic.name.toLowerCase().slice(0, 12))) {
            return { ...lic, confidence: 0.65, raw: lic.name };
        }
    }

    // 4. Detect "All Rights Reserved"
    if (
        combined.includes('all rights reserved') ||
        combined.includes('© ') ||
        combined.includes('copyright ©') ||
        combined.includes('copyrighted material')
    ) {
        return {
            spdxId: 'ARR',
            name: 'All Rights Reserved',
            aiTrainingAllowed: false,
            confidence: 0.8,
            raw: 'detected "All Rights Reserved" or © in page text',
        };
    }

    // 5. "No AI training" explicit clause
    if (
        combined.includes('ai training') ||
        combined.includes('machine learning training') ||
        combined.includes('training data')
    ) {
        // Ambiguous but noteworthy
        return {
            spdxId: 'UNKNOWN-AI',
            name: 'AI Training Clause Detected',
            aiTrainingAllowed: null,
            confidence: 0.5,
            raw: 'AI training keywords found in text',
        };
    }

    return {
        spdxId: 'UNKNOWN',
        name: 'Unknown / Not Detected',
        aiTrainingAllowed: null,
        confidence: 0.1,
        raw: null,
    };
}

module.exports = { classifyLicense, SPDX_LICENSES };
