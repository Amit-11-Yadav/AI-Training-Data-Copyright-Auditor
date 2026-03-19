'use strict';
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { AuditModel } = require('../models/Audit');
const { parseCSV } = require('../services/csvParser');
const { runAudit } = require('../services/auditPipeline');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Known dataset presets (name → representative URLs)
const DATASET_PRESETS = {
    'common-crawl': [
        'https://commoncrawl.org',
        'https://commoncrawl.org/terms-of-use',
    ],
    'wikipedia': [
        'https://en.wikipedia.org/wiki/Main_Page',
        'https://en.wikipedia.org/wiki/Wikipedia:Text_of_Creative_Commons_Attribution-ShareAlike_4.0_International_License',
    ],
    'reddit': [
        'https://www.reddit.com',
        'https://www.reddit.com/wiki/useragreement',
    ],
    'github': [
        'https://github.com',
        'https://docs.github.com/en/site-policy/github-terms/github-terms-of-service',
    ],
    'arxiv': [
        'https://arxiv.org',
        'https://arxiv.org/help/license',
    ],
    'shutterstock': [
        'https://www.shutterstock.com',
        'https://www.shutterstock.com/license',
    ],
};

function normalizeUrls(rawList) {
    return rawList
        .map((u) => u.trim())
        .filter((u) => {
            try { new URL(u); return true; } catch { return false; }
        })
        .slice(0, 100);
}

// POST /api/audit  — start new audit
router.post('/', upload.single('csv'), async (req, res) => {
    try {
        let urls = [];
        let inputMode = 'urls';
        let datasetName = null;

        if (req.file) {
            // CSV upload
            inputMode = 'csv';
            urls = parseCSV(req.file.buffer);
            if (urls.length === 0) return res.status(400).json({ error: 'No valid URLs found in CSV.' });
        } else if (req.body.dataset) {
            // Named dataset
            inputMode = 'dataset';
            datasetName = req.body.dataset.toLowerCase().trim();
            urls = DATASET_PRESETS[datasetName] || [];
            if (urls.length === 0) return res.status(400).json({ error: `Unknown dataset: ${req.body.dataset}` });
        } else {
            // URL list from body
            const raw = req.body.urls;
            if (!raw) return res.status(400).json({ error: 'Provide urls[], csv file, or dataset name.' });
            const list = Array.isArray(raw) ? raw : raw.split('\n');
            urls = normalizeUrls(list);
            if (urls.length === 0) return res.status(400).json({ error: 'No valid URLs provided.' });
        }

        const auditId = uuidv4();
        await AuditModel.create({ auditId, status: 'queued', inputMode, datasetName, total: urls.length });

        // Run audit asynchronously (don't await)
        setImmediate(() => {
            runAudit(auditId, urls).catch((err) => {
                console.error('[AUDIT] Pipeline error:', err.message);
                AuditModel.update(auditId, { status: 'error' });
            });
        });

        res.status(202).json({ auditId, total: urls.length, status: 'queued' });
    } catch (err) {
        console.error('[AUDIT] POST error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// GET /api/audit/:id/status — polling endpoint
router.get('/:id/status', async (req, res) => {
    try {
        const audit = await AuditModel.findById(req.params.id);
        if (!audit) return res.status(404).json({ error: 'Audit not found.' });
        res.json({
            auditId: audit.auditId,
            status: audit.status,
            progress: audit.progress || 0,
            total: audit.total || 0,
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// GET /api/audit/:id — full results
router.get('/:id', async (req, res) => {
    try {
        const audit = await AuditModel.findById(req.params.id);
        if (!audit) return res.status(404).json({ error: 'Audit not found.' });
        res.json(audit);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// GET /api/audit/presets/list — list available dataset presets
router.get('/presets/list', (_req, res) => {
    res.json({ presets: Object.keys(DATASET_PRESETS) });
});

module.exports = router;
