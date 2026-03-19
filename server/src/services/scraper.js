'use strict';
const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (compatible; AICopyrightAuditor/1.0; +https://github.com/audit)';
const TIMEOUT = 12000;

/**
 * Scrape a URL for copyright-related signals.
 * Returns:
 *   { title, metaLicense, metaCopyright, relLicense, headerLicense,
 *     footerText, robotsHeader, fullText, statusCode, finalUrl }
 */
async function scrapeUrl(url) {
    const result = {
        title: '',
        metaLicense: null,
        metaCopyright: null,
        relLicense: null,
        headerLicense: null,
        footerText: '',
        robotsHeader: null,
        fullText: '',
        statusCode: null,
        finalUrl: url,
        error: null,
    };

    try {
        const resp = await axios.get(url, {
            headers: {
                'User-Agent': UA,
                Accept: 'text/html,application/xhtml+xml',
            },
            timeout: TIMEOUT,
            maxRedirects: 5,
            validateStatus: (s) => s < 500,
        });

        result.statusCode = resp.status;
        result.finalUrl = resp.request?.res?.responseUrl || url;

        // HTTP response headers
        const linkHeader = resp.headers['link'] || '';
        if (linkHeader.includes('license')) result.headerLicense = linkHeader;
        result.robotsHeader = resp.headers['x-robots-tag'] || null;

        if (resp.status === 200 && resp.data) {
            const $ = cheerio.load(resp.data);

            // Title
            result.title = $('title').first().text().trim() || '';

            // Meta tags
            result.metaLicense =
                $('meta[name="license"]').attr('content') ||
                $('meta[property="og:license"]').attr('content') ||
                $('meta[name="dc.rights"]').attr('content') ||
                $('meta[name="rights"]').attr('content') || null;

            result.metaCopyright =
                $('meta[name="copyright"]').attr('content') ||
                $('meta[name="dc.creator"]').attr('content') || null;

            // <link rel="license">
            result.relLicense = $('link[rel="license"]').attr('href') || null;

            // Footer text (common copyright location)
            const footerEl = $('footer').first();
            if (footerEl.length) {
                result.footerText = footerEl.text().replace(/\s+/g, ' ').trim().slice(0, 500);
            }

            // Grab visible text for NLP (limit to 3000 chars)
            $('script, style, nav, noscript').remove();
            result.fullText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000);
        }
    } catch (err) {
        result.error = err.message;
        result.statusCode = err.response?.status || null;
    }

    return result;
}

module.exports = { scrapeUrl };
