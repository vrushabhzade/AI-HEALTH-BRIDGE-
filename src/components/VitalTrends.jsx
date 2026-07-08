import React, { useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Activity, Heart, Droplets, Wind, TrendingUp, TrendingDown, Minus, Sparkles, ChevronRight, Target, Zap } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const allLabels = [
    'Jan 1','Jan 2','Jan 3','Jan 4','Jan 5','Jan 6','Jan 7',
    'Jan 8','Jan 9','Jan 10','Jan 11','Jan 12','Jan 13','Jan 14',
    'Jan 15','Jan 16','Jan 17','Jan 18','Jan 19','Jan 20'
];

const glucoseData   = [110,113,118,122,125,121,117,115,112,109,105,107,110,108,105,106,109,111,112,113];
const bpSystolicData= [120,123,126,129,130,128,126,125,124,122,121,120,122,121,122,121,120,119,118,118];
const bpDiastolicData=[80,82,83,84,85,84,83,82,81,80,79,79,80,80,79,79,78,78,78,78];
const heartRateData = [72,74,75,76,78,77,75,74,73,72,71,72,73,72,71,72,73,72,72,73];
const oxygenData    = [98,98,97,98,99,98,98,97,98,98,97,98,98,99,98,98,97,98,98,98];

const METRICS = {
    vitals: {
        label: 'Vitals Overview',
        datasets: [
            { label: 'Glucose (mg/dL)', data: glucoseData, borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.08)', fill: true, tension: 0.45, pointRadius: 3, borderWidth: 2.5 },
            { label: 'Systolic BP', data: bpSystolicData, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.06)', fill: true, tension: 0.45, pointRadius: 3, borderWidth: 2.5 },
        ]
    },
    blood: {
        label: 'BP + Glucose',
        datasets: [
            { label: 'Systolic BP', data: bpSystolicData, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', fill: true, tension: 0.45, pointRadius: 3, borderWidth: 2.5 },
            { label: 'Diastolic BP', data: bpDiastolicData, borderColor: '#fb923c', backgroundColor: 'rgba(251,146,60,0.06)', fill: true, tension: 0.45, pointRadius: 3, borderWidth: 2.5 },
            { label: 'Glucose (mg/dL)', data: glucoseData, borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.06)', fill: true, tension: 0.45, pointRadius: 3, borderWidth: 2.5 },
        ]
    },
    heart: {
        label: 'Heart Rate',
        datasets: [
            { label: 'Heart Rate (bpm)', data: heartRateData, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.08)', fill: true, tension: 0.45, pointRadius: 3, borderWidth: 2.5 },
        ]
    },
    oxygen: {
        label: 'SpO₂',
        datasets: [
            { label: 'SpO₂ (%)', data: oxygenData, borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.08)', fill: true, tension: 0.45, pointRadius: 3, borderWidth: 2.5 },
        ]
    }
};

const healthMetrics = [
    {
        icon: Droplets,
        label: 'Glucose',
        value: '113',
        unit: 'mg/dL',
        status: 'normal',
        trend: 'up',
        delta: '+3',
        range: '70–140',
        color: '#38bdf8',
        bg: 'rgba(56,189,248,0.08)',
        border: 'rgba(56,189,248,0.2)'
    },
    {
        icon: Heart,
        label: 'Blood Pressure',
        value: '118/78',
        unit: 'mmHg',
        status: 'normal',
        trend: 'down',
        delta: '−2',
        range: '90–120 sys',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.08)',
        border: 'rgba(245,158,11,0.2)'
    },
    {
        icon: Activity,
        label: 'Heart Rate',
        value: '73',
        unit: 'bpm',
        status: 'normal',
        trend: 'stable',
        delta: '±1',
        range: '60–100',
        color: '#f87171',
        bg: 'rgba(248,113,113,0.08)',
        border: 'rgba(248,113,113,0.2)'
    },
    {
        icon: Wind,
        label: 'SpO₂',
        value: '98',
        unit: '%',
        status: 'optimal',
        trend: 'stable',
        delta: '±0',
        range: '95–100',
        color: '#34d399',
        bg: 'rgba(52,211,153,0.08)',
        border: 'rgba(52,211,153,0.2)'
    },
];

const aiInsights = [
    { icon: Sparkles, title: 'Glucose Stabilizing', body: 'Your glucose levels have improved 8% over 20 days. Maintaining your current low-carb diet is recommended for the next 15 days.', color: '#38bdf8', tag: 'Metabolic' },
    { icon: Target, title: 'BP on Target', body: 'Systolic pressure reduced from 130 to 118 mmHg — excellent progress. Continue current medication and moderate aerobic activity.', color: '#f59e0b', tag: 'Cardiovascular' },
    { icon: Zap, title: 'Optimal Recovery Phase', body: 'Heart rate variability indicates good autonomic function. Sleep pattern score is 7.2/10. Aim for 7–8 hrs consistently.', color: '#a78bfa', tag: 'Wellness' },
];

const weeklyActivity = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
        label: 'Steps (thousands)',
        data: [6.2, 8.1, 5.4, 9.0, 7.3, 11.2, 4.8],
        backgroundColor: (ctx) => {
            const val = ctx.raw;
            if (val >= 10) return 'rgba(52,211,153,0.8)';
            if (val >= 7) return 'rgba(56,189,248,0.7)';
            return 'rgba(148,163,184,0.4)';
        },
        borderRadius: 6,
        borderSkipped: false,
    }]
};

const TrendIcon = ({ trend }) => {
    if (trend === 'up') return <TrendingUp size={14} color="#34d399" />;
    if (trend === 'down') return <TrendingDown size={14} color="#f87171" />;
    return <Minus size={14} color="#94a3b8" />;
};

const StatusPill = ({ status }) => {
    const map = { normal: { color: '#34d399', bg: 'rgba(52,211,153,0.15)', label: 'Normal' }, optimal: { color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', label: 'Optimal' }, high: { color: '#f87171', bg: 'rgba(248,113,113,0.15)', label: 'High' } };
    const s = map[status] || map.normal;
    return (
        <span style={{ padding: '0.15rem 0.55rem', background: s.bg, color: s.color, borderRadius: '50px', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {s.label}
        </span>
    );
};

const VitalTrends = () => {
    const [activeView, setActiveView] = useState('vitals');

    const chartData = { labels: allLabels, datasets: METRICS[activeView].datasets };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: {
                    color: '#94a3b8', font: { size: 11, family: "'Inter', sans-serif" },
                    boxWidth: 20, boxHeight: 2, padding: 16,
                    usePointStyle: true, pointStyle: 'line'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15,23,42,0.95)',
                borderColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                titleColor: '#f1f5f9',
                bodyColor: '#94a3b8',
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}`
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 10 },
                border: { display: false }
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                ticks: { color: '#64748b', font: { size: 10 }, padding: 8 },
                border: { display: false }
            }
        }
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15,23,42,0.95)',
                borderColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                titleColor: '#f1f5f9',
                bodyColor: '#94a3b8',
                padding: 10,
                cornerRadius: 8,
                callbacks: { label: (ctx) => ` ${(ctx.raw * 1000).toLocaleString()} steps` }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } }, border: { display: false } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 10 } }, border: { display: false } }
        }
    };

    const tabs = [
        { key: 'vitals', label: 'Vitals' },
        { key: 'blood', label: 'BP/Glucose' },
        { key: 'heart', label: 'Heart Rate' },
        { key: 'oxygen', label: 'SpO₂' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ─── METRIC CARDS ROW ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {healthMetrics.map((m) => {
                    const Icon = m.icon;
                    return (
                        <div key={m.label} style={{
                            padding: '1.25rem 1.25rem 1rem',
                            background: 'rgba(15,23,42,0.7)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: '16px',
                            border: `1px solid ${m.border}`,
                            boxShadow: `0 0 24px ${m.bg}`,
                            display: 'flex', flexDirection: 'column', gap: '0.75rem',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            cursor: 'default'
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${m.bg}`; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 0 24px ${m.bg}`; }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: m.bg, border: `1px solid ${m.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={18} color={m.color} />
                                </div>
                                <StatusPill status={m.status} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{m.label}</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                                    <span style={{ fontSize: '1.75rem', fontWeight: '700', color: m.color, lineHeight: 1 }}>{m.value}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.unit}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#64748b' }}>
                                    <TrendIcon trend={m.trend} />
                                    <span style={{ color: m.trend === 'up' ? '#34d399' : m.trend === 'down' ? '#f87171' : '#94a3b8' }}>{m.delta}</span>
                                    <span>this week</span>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: '#475569' }}>Range {m.range}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ─── MAIN CHART PANEL ─── */}
            <div style={{
                background: 'rgba(15,23,42,0.75)',
                backdropFilter: 'blur(16px)',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.07)',
                overflow: 'hidden'
            }}>
                {/* Chart Header */}
                <div style={{ padding: '1.5rem 1.75rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>20-Day Analysis</div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#f1f5f9' }}>Vital Trends</h3>
                    </div>
                    {/* Tab switcher */}
                    <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0,0,0,0.3)', padding: '0.3rem', borderRadius: '10px' }}>
                        {tabs.map(tab => (
                            <button key={tab.key} onClick={() => setActiveView(tab.key)} style={{
                                padding: '0.3rem 0.85rem', borderRadius: '7px', border: 'none', cursor: 'pointer',
                                fontSize: '0.78rem', fontWeight: '600', transition: 'all 0.2s',
                                background: activeView === tab.key ? 'rgba(56,189,248,0.15)' : 'transparent',
                                color: activeView === tab.key ? '#38bdf8' : '#64748b',
                                boxShadow: activeView === tab.key ? '0 0 0 1px rgba(56,189,248,0.3)' : 'none'
                            }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chart Area */}
                <div style={{ padding: '1rem 1.75rem 1.5rem' }}>
                    <div style={{ height: '240px' }}>
                        <Line data={chartData} options={chartOptions} />
                    </div>
                </div>

                {/* AI Insight Banner */}
                <div style={{ margin: '0 1.75rem 1.75rem', padding: '1rem 1.25rem', background: 'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(167,139,250,0.06) 100%)', borderRadius: '12px', border: '1px solid rgba(56,189,248,0.15)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Sparkles size={15} color="#38bdf8" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Gemini AI Insight</div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
                            Your glucose levels are <strong style={{ color: '#f1f5f9' }}>stabilizing</strong> with an 8% improvement this month. Systolic BP dropped from 130 → 118 mmHg. Maintaining your current diet and aerobic routine is recommended for the <strong style={{ color: '#f1f5f9' }}>next 15 days</strong>.
                        </p>
                    </div>
                </div>
            </div>

            {/* ─── BOTTOM ROW: AI Recommendations + Weekly Activity ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                {/* AI Health Recommendations */}
                <div style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Personalized</div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#f1f5f9' }}>AI Recommendations</h3>
                        </div>
                        <span style={{ padding: '0.25rem 0.6rem', background: 'rgba(167,139,250,0.12)', color: '#a78bfa', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', border: '1px solid rgba(167,139,250,0.2)' }}>3 New</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {aiInsights.map((ins, i) => {
                            const InsIcon = ins.icon;
                            return (
                                <div key={i} style={{ padding: '0.9rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', transition: 'background 0.2s', cursor: 'pointer' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                >
                                    <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${ins.color}18`, border: `1px solid ${ins.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <InsIcon size={15} color={ins.color} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                            <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#f1f5f9' }}>{ins.title}</span>
                                            <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: `${ins.color}18`, color: ins.color, borderRadius: '4px', flexShrink: 0 }}>{ins.tag}</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: '1.45' }}>{ins.body}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button style={{ width: '100%', padding: '0.6rem', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '10px', color: '#a78bfa', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(167,139,250,0.08)'}
                    >
                        View Full Health Report <ChevronRight size={14} />
                    </button>
                </div>

                {/* Weekly Activity + Quick Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Activity Chart */}
                    <div style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)', padding: '1.5rem', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>This Week</div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#f1f5f9' }}>Step Activity</h3>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#34d399' }}>52.0K</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>steps total</div>
                            </div>
                        </div>
                        <div style={{ height: '130px' }}>
                            <Bar data={weeklyActivity} options={barOptions} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            {[{ label: 'Daily Avg', val: '7.4K', color: '#38bdf8' }, { label: 'Best Day', val: '11.2K', color: '#34d399' }, { label: 'Goal', val: '10K', color: '#f59e0b' }].map(s => (
                                <div key={s.label} style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: s.color }}>{s.val}</div>
                                    <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.1rem' }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Health Score Card */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.1) 0%, rgba(56,189,248,0.08) 100%)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1px solid rgba(52,211,153,0.2)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        {/* Ring */}
                        <div style={{ position: 'relative', width: '70px', height: '70px', flexShrink: 0 }}>
                            <svg viewBox="0 0 70 70" style={{ width: '70px', height: '70px', transform: 'rotate(-90deg)' }}>
                                <circle cx="35" cy="35" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                                <circle cx="35" cy="35" r="30" fill="none" stroke="url(#healthGrad)" strokeWidth="7"
                                    strokeDasharray={`${2 * Math.PI * 30 * 0.82} ${2 * Math.PI * 30 * 0.18}`}
                                    strokeLinecap="round" />
                                <defs>
                                    <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#34d399" />
                                        <stop offset="100%" stopColor="#38bdf8" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                <span style={{ fontSize: '1rem', fontWeight: '800', color: '#f1f5f9', lineHeight: 1 }}>82</span>
                                <span style={{ fontSize: '0.55rem', color: '#94a3b8' }}>/ 100</span>
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Overall Health Score</div>
                            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#34d399', marginBottom: '0.35rem' }}>Very Good 🌿</div>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>Up from 76 last month. Keep your current wellness routine for continued improvement.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VitalTrends;
