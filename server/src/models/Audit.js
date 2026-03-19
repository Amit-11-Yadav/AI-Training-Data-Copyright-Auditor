'use strict';
const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema({
    url: { type: String, required: true },
    domain: String,
    title: String,
    license: {
        spdxId: String,
        name: String,
        aiTrainingAllowed: { type: Boolean, default: null },
        confidence: Number,
        raw: String,
    },
    robots: {
        allowed: { type: Boolean, default: null },
        disallowedPaths: [String],
    },
    tos: {
        restrictive: { type: Boolean, default: null },
        clauses: [String],
        confidence: Number,
    },
    jurisdiction: {
        country: String,
        framework: String,
        flag: String,
    },
    fairUseProbability: Number,
    aiSummary: String,
    risk: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'], default: 'UNKNOWN' },
    riskScore: Number,
    error: String,
});

const auditSchema = new mongoose.Schema({
    auditId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['queued', 'processing', 'complete', 'error'], default: 'queued' },
    inputMode: { type: String, enum: ['urls', 'csv', 'dataset'] },
    datasetName: String,
    progress: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    sources: [sourceSchema],
    summary: {
        total: Number,
        high: Number,
        medium: Number,
        low: Number,
        unknown: Number,
    },
    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
});

// In-memory store when MongoDB is not connected
const inMemoryStore = new Map();

class AuditModel {
    static async create(data) {
        if (mongoose.connection.readyState === 1) {
            return new Audit(data).save();
        }
        const record = { ...data, sources: [], summary: null };
        inMemoryStore.set(data.auditId, record);
        return record;
    }

    static async findById(auditId) {
        if (mongoose.connection.readyState === 1) {
            return Audit.findOne({ auditId });
        }
        return inMemoryStore.get(auditId) || null;
    }

    static async update(auditId, updates) {
        if (mongoose.connection.readyState === 1) {
            return Audit.findOneAndUpdate({ auditId }, updates, { new: true });
        }
        const record = inMemoryStore.get(auditId);
        if (!record) return null;
        Object.assign(record, updates);
        inMemoryStore.set(auditId, record);
        return record;
    }

    static async pushSource(auditId, source) {
        if (mongoose.connection.readyState === 1) {
            return Audit.findOneAndUpdate(
                { auditId },
                { $push: { sources: source }, $inc: { progress: 1 } },
                { new: true }
            );
        }
        const record = inMemoryStore.get(auditId);
        if (!record) return null;
        if (!record.sources) record.sources = [];
        record.sources.push(source);
        record.progress = (record.progress || 0) + 1;
        inMemoryStore.set(auditId, record);
        return record;
    }
}

const Audit = mongoose.model('Audit', auditSchema);

module.exports = { AuditModel, Audit };
