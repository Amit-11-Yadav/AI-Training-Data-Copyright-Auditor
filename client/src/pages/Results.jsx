import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import axios from 'axios'

const RISK_COLORS = {
    HIGH: '#ef4444',
    MEDIUM: '#f59e0b',
    LOW: '#10b981',
    UNKNOWN: '#64748b',
}

function RiskBadge({ risk }) {
    const cls = { HIGH: 'badge-high', MEDIUM: 'badge-medium', LOW: 'badge-low', UNKNOWN: 'badge-unknown' }
    const icon = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢', UNKNOWN: '⚫' }
    return <span className={`badge ${cls[risk] || 'badge-unknown'}`}>{icon[risk]} {risk}</span>
}

function SkeletonRow() {
    return (
        <tr>
            {[180, 80, 100, 80, 80].map((w, i) => (
                <td key={i}><div className="skeleton" style={{ height: 14, width: w }} /></td>
            ))}
        </tr>
    )
}

function SourceRow({ source }) {
    const [expanded, setExpanded] = useState(false)
    return (
        <>
            <tr
                style={{ cursor: 'pointer' }}
                onClick={() => setExpanded(p => !p)}
            >
                <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{source.jurisdiction?.flag || '🌐'}</span>
                        <span style={{
                            fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)',
                            maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                            {source.url}
                        </span>
                    </div>
                </td>
                <td>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {source.license?.name || '—'}
                    </span>
                </td>
                <td>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                        {source.jurisdiction?.country || '—'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                        {source.jurisdiction?.framework?.split('/')[0]?.trim() || ''}
                    </div>
                </td>
                <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                            width: 40, height: 4, borderRadius: 2, background: 'var(--border)',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${source.fairUseProbability || 0}%`,
                                height: '100%',
                                background: (source.fairUseProbability || 0) >= 60
                                    ? '#10b981' : (source.fairUseProbability || 0) >= 35
                                        ? '#f59e0b' : '#ef4444'
                            }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                            {source.fairUseProbability ?? '?'}%
                        </span>
                    </div>
                </td>
                <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <RiskBadge risk={source.risk || 'UNKNOWN'} />
                        <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
                    </div>
                </td>
            </tr>
            {expanded && (
                <tr className="expand-row fade-in">
                    <td colSpan={5} style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12, color: 'var(--accent)' }}>
                                    🤖 AI Analysis
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                                    {source.aiSummary || 'No analysis available.'}
                                </p>
                            </div>
                            <div>
                                {source.tos?.clauses?.length > 0 && (
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12, color: 'var(--warn)' }}>
                                            ⚠️ ToS Restrictive Clauses
                                        </div>
                                        <ul style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 16 }}>
                                            {source.tos.clauses.map((c, i) => <li key={i}>"{c}"</li>)}
                                        </ul>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {source.robots?.allowed !== null && (
                                        <span style={{
                                            fontSize: 11, padding: '3px 10px', borderRadius: 999,
                                            background: source.robots.allowed ? 'var(--safe-bg)' : 'var(--danger-bg)',
                                            color: source.robots.allowed ? 'var(--safe)' : 'var(--danger)',
                                            border: `1px solid ${source.robots.allowed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                                        }}>
                                            🤖 robots.txt: {source.robots.allowed ? 'Allowed' : 'Blocked'}
                                        </span>
                                    )}
                                    {source.robots?.aiBotBlocked && (
                                        <span style={{
                                            fontSize: 11, padding: '3px 10px', borderRadius: 999,
                                            background: 'var(--danger-bg)', color: 'var(--danger)',
                                            border: '1px solid rgba(239,68,68,0.3)'
                                        }}>
                                            AI Bots Explicitly Blocked
                                        </span>
                                    )}
                                    {source.error && (
                                        <span style={{
                                            fontSize: 11, padding: '3px 10px', borderRadius: 999,
                                            background: 'rgba(100,116,139,0.1)', color: 'var(--text-faint)',
                                            border: '1px solid var(--border)'
                                        }}>
                                            ⚠️ {source.error}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

export default function Results() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [status, setStatus] = useState({ status: 'queued', progress: 0, total: 0 })
    const [audit, setAudit] = useState(null)
    const [sortBy, setSortBy] = useState('risk')
    const [filterRisk, setFilterRisk] = useState('ALL')
    const pollingRef = useRef(null)

    // Poll status
    useEffect(() => {
        const poll = async () => {
            try {
                const res = await axios.get(`/api/audit/${id}/status`)
                setStatus(res.data)
                if (res.data.status === 'complete' || res.data.status === 'error') {
                    clearInterval(pollingRef.current)
                    // Load full results
                    const fullRes = await axios.get(`/api/audit/${id}`)
                    setAudit(fullRes.data)
                }
            } catch {
                clearInterval(pollingRef.current)
            }
        }
        poll()
        pollingRef.current = setInterval(poll, 2000)
        return () => clearInterval(pollingRef.current)
    }, [id])

    const sources = audit?.sources || []
    const summary = audit?.summary || {}

    const pieData = [
        { name: 'High Risk', value: summary.high || 0, color: RISK_COLORS.HIGH },
        { name: 'Medium Risk', value: summary.medium || 0, color: RISK_COLORS.MEDIUM },
        { name: 'Low Risk / Safe', value: summary.low || 0, color: RISK_COLORS.LOW },
        { name: 'Unknown', value: summary.unknown || 0, color: RISK_COLORS.UNKNOWN },
    ].filter(d => d.value > 0)

    const RISK_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2, UNKNOWN: 3 }
    const filteredSources = sources
        .filter(s => filterRisk === 'ALL' || s.risk === filterRisk)
        .sort((a, b) => {
            if (sortBy === 'risk') return (RISK_ORDER[a.risk] ?? 3) - (RISK_ORDER[b.risk] ?? 3)
            if (sortBy === 'url') return (a.url || '').localeCompare(b.url || '')
            if (sortBy === 'fairuse') return (b.fairUseProbability || 0) - (a.fairUseProbability || 0)
            return 0
        })

    function handleExportPDF() {
        window.print()
    }

    const progress = status.total > 0 ? Math.round((status.progress / status.total) * 100) : 0
    const isComplete = status.status === 'complete' || status.status === 'error'

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-deep)' }}>
            {/* Navbar */}
            <nav className="navbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn-ghost" onClick={() => navigate('/')}>← Back</button>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>⚖️ Audit Report</span>
                </div>
                {isComplete && (
                    <button className="btn-ghost" onClick={handleExportPDF}>
                        📄 Export PDF
                    </button>
                )}
            </nav>

            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>

                {/* Progress bar (while processing) */}
                {!isComplete && (
                    <div className="glass fade-in" style={{ padding: 28, marginBottom: 28 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div>
                                <span style={{ fontSize: 18, fontWeight: 700 }}>
                                    <span className="spinner pulse">⟳</span>{' '}
                                    Auditing sources…
                                </span>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Processing {status.progress} of {status.total} URLs
                                </div>
                            </div>
                            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>
                                {progress}%
                            </span>
                        </div>
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}

                {/* Summary stats */}
                {isComplete && (
                    <div className="fade-in">
                        <div style={{ marginBottom: 28 }}>
                            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
                                📋 Audit Complete
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                                Audit ID: <code style={{ color: 'var(--accent)', fontSize: 12 }}>{id}</code>
                            </p>
                        </div>

                        {/* Stat cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
                            <div className="stat-card">
                                <span className="stat-num" style={{ color: 'var(--text-primary)' }}>{summary.total || 0}</span>
                                <div className="stat-label">Total Sources</div>
                            </div>
                            <div className="stat-card glow-danger">
                                <span className="stat-num" style={{ color: 'var(--danger)' }}>{summary.high || 0}</span>
                                <div className="stat-label">High Risk</div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-num" style={{ color: 'var(--warn)' }}>{summary.medium || 0}</span>
                                <div className="stat-label">Medium Risk</div>
                            </div>
                            <div className="stat-card glow-safe">
                                <span className="stat-num" style={{ color: 'var(--safe)' }}>{summary.low || 0}</span>
                                <div className="stat-label">Safe to Use</div>
                            </div>
                        </div>

                        {/* Chart + breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, marginBottom: 32 }}>
                            {/* Pie chart */}
                            {pieData.length > 0 && (
                                <div className="glass" style={{ padding: 24 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 16 }}>Risk Breakdown</div>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={90}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }}
                                                labelStyle={{ color: 'var(--text-primary)' }}
                                            />
                                            <Legend
                                                iconType="circle"
                                                iconSize={8}
                                                formatter={(v) => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v}</span>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Key findings */}
                            <div className="glass" style={{ padding: 24 }}>
                                <div style={{ fontWeight: 600, marginBottom: 16 }}>Key Findings</div>
                                {[
                                    {
                                        show: summary.high > 0,
                                        color: 'var(--danger)', bg: 'var(--danger-bg)',
                                        icon: '🚨',
                                        text: `${summary.high} source${summary.high === 1 ? '' : 's'} pose HIGH copyright risk and should be removed from your training data.`
                                    },
                                    {
                                        show: summary.medium > 0,
                                        color: 'var(--warn)', bg: 'var(--warn-bg)',
                                        icon: '⚠️',
                                        text: `${summary.medium} source${summary.medium === 1 ? '' : 's'} have ambiguous licensing. Legal review recommended.`
                                    },
                                    {
                                        show: summary.low > 0,
                                        color: 'var(--safe)', bg: 'var(--safe-bg)',
                                        icon: '✅',
                                        text: `${summary.low} source${summary.low === 1 ? '' : 's'} appear safe to use in AI training with current licenses.`
                                    },
                                    {
                                        show: true,
                                        color: 'var(--text-muted)', bg: 'var(--bg-elevated)',
                                        icon: '⚖️',
                                        text: 'This audit is informational. Consult a legal professional before making training data decisions.'
                                    },
                                ].filter(f => f.show).map((f, i) => (
                                    <div key={i} style={{
                                        display: 'flex', gap: 12, padding: '12px 16px',
                                        background: f.bg, borderRadius: 8, marginBottom: 10,
                                        border: `1px solid ${f.color}22`
                                    }}>
                                        <span>{f.icon}</span>
                                        <span style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Source table */}
                        <div className="glass" style={{ overflow: 'hidden' }}>
                            {/* Table controls */}
                            <div style={{
                                padding: '16px 20px', display: 'flex', gap: 12,
                                alignItems: 'center', borderBottom: '1px solid var(--border)', flexWrap: 'wrap'
                            }}>
                                <span style={{ fontWeight: 600, fontSize: 15 }}>Source Details</span>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Filter:</span>
                                    {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(r => (
                                        <button
                                            key={r}
                                            className={`chip ${filterRisk === r ? 'active' : ''}`}
                                            style={{ fontSize: 11, padding: '4px 10px' }}
                                            onClick={() => setFilterRisk(r)}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                    <span style={{ fontSize: 12, color: 'var(--text-faint)', marginLeft: 8 }}>Sort:</span>
                                    <select
                                        value={sortBy}
                                        onChange={e => setSortBy(e.target.value)}
                                        style={{
                                            background: 'var(--bg-deep)', border: '1px solid var(--border)',
                                            color: 'var(--text-muted)', borderRadius: 6, padding: '4px 10px', fontSize: 12
                                        }}
                                    >
                                        <option value="risk">Risk Level</option>
                                        <option value="url">URL</option>
                                        <option value="fairuse">Fair Use %</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table className="results-table">
                                    <thead>
                                        <tr>
                                            <th>Source URL</th>
                                            <th>License</th>
                                            <th>Jurisdiction</th>
                                            <th>Fair Use</th>
                                            <th>Risk</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSources.length > 0
                                            ? filteredSources.map((s, i) => <SourceRow key={i} source={s} />)
                                            : !isComplete
                                                ? Array(3).fill(0).map((_, i) => <SkeletonRow key={i} />)
                                                : (
                                                    <tr>
                                                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '32px' }}>
                                                            No sources match this filter.
                                                        </td>
                                                    </tr>
                                                )
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading skeleton before any results */}
                {!isComplete && sources.length === 0 && (
                    <div className="glass" style={{ overflow: 'hidden', marginTop: 24 }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                            <div className="skeleton" style={{ height: 18, width: 160 }} />
                        </div>
                        <table className="results-table">
                            <thead>
                                <tr>
                                    <th>Source URL</th><th>License</th><th>Jurisdiction</th><th>Fair Use</th><th>Risk</th>
                                </tr>
                            </thead>
                            <tbody>{Array(4).fill(0).map((_, i) => <SkeletonRow key={i} />)}</tbody>
                        </table>
                    </div>
                )}

            </div>
        </div>
    )
}
