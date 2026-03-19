'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const auditRoutes = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/audit', auditRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── MongoDB connection (optional, in-memory fallback if URI missing) ─────────
async function connectDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.log('[DB] No MONGODB_URI set — using in-memory store');
        return;
    }
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log('[DB] Connected to MongoDB');
    } catch (err) {
        console.warn('[DB] MongoDB connection failed, using in-memory store:', err.message);
    }
}

// ── Start ────────────────────────────────────────────────────────────────────
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`[SERVER] AI Copyright Auditor backend running on http://localhost:${PORT}`);
    });
});

module.exports = app;
