'use strict';
const { parse } = require('csv-parse/sync');

/**
 * Parse a CSV buffer into a list of URLs.
 * Tries common column names: url, source, link, href, URL, Source, Link
 */
function parseCSV(buffer) {
    const text = buffer.toString('utf-8');
    let records;
    try {
        records = parse(text, { columns: true, skip_empty_lines: true, trim: true });
    } catch {
        // Maybe headerless — try with raw arrays
        const raw = parse(text, { columns: false, skip_empty_lines: true, trim: true });
        return raw
            .flat()
            .filter((v) => isValidUrl(v))
            .slice(0, 200);
    }

    const urlColumns = ['url', 'URL', 'source', 'Source', 'link', 'Link', 'href', 'Href', 'uri', 'URI'];
    for (const col of urlColumns) {
        if (records[0] && records[0][col] !== undefined) {
            return records.map((r) => r[col]).filter(isValidUrl).slice(0, 200);
        }
    }

    // Try every value in every column
    const allValues = records.flatMap((r) => Object.values(r));
    return allValues.filter(isValidUrl).slice(0, 200);
}

function isValidUrl(str) {
    try {
        const u = new URL(str);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

module.exports = { parseCSV };
