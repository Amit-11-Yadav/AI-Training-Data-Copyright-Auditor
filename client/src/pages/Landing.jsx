import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'

const DATASETS = [
    { id: 'common-crawl', label: 'Common Crawl', emoji: '🌐' },
    { id: 'wikipedia', label: 'Wikipedia', emoji: '📖' },
    { id: 'reddit', label: 'Reddit', emoji: '🤖' },
    { id: 'github', label: 'GitHub', emoji: '💻' },
    { id: 'arxiv', label: 'arXiv', emoji: '📄' },
    { id: 'shutterstock', label: 'Shutterstock', emoji: '🖼️' },
]

export default function Landing() {
    const navigate = useNavigate()
    const [tab, setTab] = useState('urls')
    const [urlText, setUrlText] = useState('')
    const [file, setFile] = useState(null)
    const [dataset, setDataset] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const onDrop = useCallback((accepted) => {
        if (accepted[0]) setFile(accepted[0])
    }, [])
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'] },
        maxFiles: 1,
    })

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            let res
            if (tab === 'urls') {
                const urls = urlText.split('\n').map(u => u.trim()).filter(u => u)
                if (!urls.length) { setError('Please enter at least one URL.'); setLoading(false); return }
                res = await axios.post('/api/audit', { urls })
            } else if (tab === 'csv') {
                if (!file) { setError('Please upload a CSV file.'); setLoading(false); return }
                const form = new FormData()
                form.append('csv', file)
                res = await axios.post('/api/audit', form)
            } else {
                if (!dataset) { setError('Please select a dataset.'); setLoading(false); return }
                res = await axios.post('/api/audit', { dataset })
            }
            navigate(`/audit/${res.data.auditId}`)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to start audit. Is the backend running?')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-deep)' }}>
            {/* Navbar */}
            <nav className="navbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>⚖️</span>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>CopyrightAuditor</span>
                    <span style={{
                        background: 'var(--accent-glow)',
                        color: 'var(--accent)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 999,
                        fontSize: 10,
                        padding: '2px 8px',
                        fontWeight: 700,
                        letterSpacing: 1,
                        textTransform: 'uppercase'
                    }}>AI</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>
                    React · Node.js · Claude API
                </div>
            </nav>

            {/* Hero */}
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px 0' }}>
                <div style={{ textAlign: 'center', marginBottom: 48 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'var(--accent-glow)', border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 999, padding: '6px 16px', marginBottom: 24, fontSize: 13, color: 'var(--accent)'
                    }}>
                        <span>⚡</span> AI-Powered Copyright Risk Analysis
                    </div>
                    <h1 style={{ fontSize: 'clamp(36px,6vw,62px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, letterSpacing: -2 }}>
                        Audit Your{' '}
                        <span className="gradient-text">AI Training Data</span>
                        <br />for Copyright Risk
                    </h1>
                    <p style={{ fontSize: 18, color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
                        Detect license violations, ToS breaches, and legal exposure before your
                        training run begins. Covers US, EU, India, and Global jurisdictions.
                    </p>
                </div>

                {/* Stat pills */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
                    {[
                        { icon: '🌍', label: '4 Jurisdictions' },
                        { icon: '📋', label: 'SPDX + CC Licenses' },
                        { icon: '🤖', label: 'Claude AI Analysis' },
                        { icon: '⚡', label: 'Real-time Scoring' },
                    ].map(({ icon, label }) => (
                        <div key={label} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 999, padding: '6px 14px', fontSize: 13, color: 'var(--text-muted)'
                        }}>
                            <span>{icon}</span>{label}
                        </div>
                    ))}
                </div>

                {/* Audit Form Card */}
                <div className="glass" style={{ padding: 32 }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
                        {[
                            { id: 'urls', label: '🔗 Paste URLs' },
                            { id: 'csv', label: '📁 Upload CSV' },
                            { id: 'dataset', label: '🗄️ Known Dataset' },
                        ].map(({ id, label }) => (
                            <button key={id} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
                                {label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit}>
                        {tab === 'urls' && (
                            <div>
                                <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                                    Enter URLs to audit (one per line, up to 100):
                                </label>
                                <textarea
                                    className="text-input"
                                    rows={8}
                                    placeholder={'https://arxiv.org/abs/2301.07041\nhttps://www.reddit.com/r/MachineLearning\nhttps://en.wikipedia.org/wiki/Deep_learning\nhttps://www.nytimes.com/2024/03/15/technology/'}
                                    value={urlText}
                                    onChange={e => setUrlText(e.target.value)}
                                />
                            </div>
                        )}

                        {tab === 'csv' && (
                            <div>
                                <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                                    Upload a CSV file with a <code style={{ color: 'var(--accent)' }}>url</code> column:
                                </label>
                                <div className={`dropzone ${isDragActive ? 'active' : ''}`} {...getRootProps()}>
                                    <input {...getInputProps()} />
                                    {file ? (
                                        <div>
                                            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                                            <div style={{ fontWeight: 600 }}>{file.name}</div>
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                                {(file.size / 1024).toFixed(1)} KB — Click or drag to replace
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                                            <div style={{ fontWeight: 600 }}>Drop your CSV here</div>
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                                or click to browse — .csv or .txt with URL column
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {tab === 'dataset' && (
                            <div>
                                <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 16 }}>
                                    Select a known dataset to audit:
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                    {DATASETS.map(({ id, label, emoji }) => (
                                        <button
                                            key={id}
                                            type="button"
                                            className={`chip ${dataset === id ? 'active' : ''}`}
                                            onClick={() => setDataset(id)}
                                        >
                                            {emoji} {label}
                                        </button>
                                    ))}
                                </div>
                                {dataset && (
                                    <div style={{
                                        marginTop: 16, padding: '12px 16px',
                                        background: 'var(--bg-deep)', borderRadius: 8,
                                        fontSize: 13, color: 'var(--text-muted)'
                                    }}>
                                        Will audit representative URLs from <strong style={{ color: 'var(--text-primary)' }}>
                                            {DATASETS.find(d => d.id === dataset)?.label}
                                        </strong>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <div style={{
                                marginTop: 16, padding: '12px 16px',
                                background: 'var(--danger-bg)', borderRadius: 8,
                                color: 'var(--danger)', fontSize: 14, border: '1px solid rgba(239,68,68,0.2)'
                            }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? (
                                    <><span className="spinner">⟳</span> Starting Audit…</>
                                ) : (
                                    <><span>🔍</span> Start Copyright Audit</>
                                )}
                            </button>
                            <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>
                                Free · No signup required
                            </span>
                        </div>
                    </form>
                </div>

                {/* Feature strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 32, marginBottom: 80 }}>
                    {[
                        { icon: '🔍', title: 'Deep Scraping', desc: 'Extracts copyright notices, meta tags, license headers, and robots.txt rules.' },
                        { icon: '🧠', title: 'AI Analysis', desc: 'Claude reads ambiguous Terms of Service and gives plain-English verdicts.' },
                        { icon: '📊', title: 'Jurisdiction Map', desc: 'Applies DMCA, EU AI Act, India Copyright Act, or SPDX based on source domain.' },
                    ].map(({ icon, title, desc }) => (
                        <div key={title} className="glass-elevated" style={{ padding: 20 }}>
                            <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
