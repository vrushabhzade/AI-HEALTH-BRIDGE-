import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, onSnapshot, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';
import { runAlertEngine } from '../services/alertEngine';
import { calculateDaysOfSupply, computeUnderperformanceScore } from '../services/forecast';
import { seedPHCDataClient } from '../utils/seedPHCsClient';
import { AlertTriangle, Map, MapPin, Activity, Bell, Sparkles, RefreshCw, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import sub-tracker components for drill-down
import StockMonitor from '../components/ops/StockMonitor';
import FootfallTracker from '../components/ops/FootfallTracker';
import AttendanceTracker from '../components/ops/AttendanceTracker';
import DiagnosticsAudit from '../components/ops/DiagnosticsAudit';
import PHCBedStatus from '../components/ops/PHCBedStatus';
import ForecastPanel from '../components/ops/ForecastPanel';

const DistrictAdminDashboard = () => {
    const { t, language } = useLanguage();
    const { phcId } = useParams();
    const [phcs, setPhcs] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [selectedPhcId, setSelectedPhcId] = useState(phcId || null);
    const [drillDownTab, setDrillDownTab] = useState('stock');
    const [isScanning, setIsScanning] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [stats, setStats] = useState({ totalPhcs: 0, criticalAlerts: 0, avgUnderperformance: 0 });
    const [phcScores, setPhcScores] = useState({});

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            const res = await seedPHCDataClient();
            if (res === 'success') {
                alert('Database seeded successfully with Nagpur PHC/CHC operations data! Page will reload.');
                window.location.reload();
            } else {
                alert('Database already has PHC operations data.');
            }
        } catch (err) {
            alert('Failed to seed database: ' + err.message);
        } finally {
            setIsSeeding(false);
        }
    };

    useEffect(() => {
        if (phcId) {
            setSelectedPhcId(phcId);
        }
    }, [phcId]);

    useEffect(() => {
        // 1. Subscribe to alerts (Real-time listener)
        const unsubscribeAlerts = onSnapshot(collection(db, 'alerts'), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAlerts(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        }, (err) => console.error("Error loading alerts:", err));

        // 2. Fetch PHCs & subcollections to calculate real-time health scores
        const loadPhcsAndScores = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'phcs'));
                const phcList = [];
                const scoresMap = {};

                for (const phcDoc of snapshot.docs) {
                    const pData = { id: phcDoc.id, ...phcDoc.data() };
                    phcList.push(pData);

                    // Fetch subcollections to compute score
                    const stockSnap = await getDocs(collection(db, 'phcs', pData.id, 'stock'));
                    const stockItems = stockSnap.docs.map(d => d.data());

                    const attSnap = await getDocs(collection(db, 'phcs', pData.id, 'attendance'));
                    const attendanceLogs = attSnap.docs.map(d => d.data());

                    const diagSnap = await getDocs(collection(db, 'phcs', pData.id, 'diagnostics'));
                    const diagnostics = diagSnap.docs.map(d => d.data());

                    const footSnap = await getDocs(collection(db, 'phcs', pData.id, 'footfall'));
                    const latestFootfall = footSnap.docs.map(d => d.data()).sort((a, b) => new Date(b.date) - new Date(a.date))[0] || { totalPatients: 0 };

                    const score = computeUnderperformanceScore({
                        stockItems,
                        attendanceLogs,
                        footfall: latestFootfall,
                        diagnostics,
                        capacity: pData.capacity
                    });

                    scoresMap[pData.id] = score;
                }

                setPhcs(phcList);
                setPhcScores(scoresMap);

                // Compute stats
                const total = phcList.length;
                const totalScore = Object.values(scoresMap).reduce((sum, s) => sum + s, 0);
                const avgScore = total > 0 ? Math.round(totalScore / total) : 0;
                setStats(prev => ({
                    ...prev,
                    totalPhcs: total,
                    avgUnderperformance: avgScore
                }));

            } catch (err) {
                console.error("Error calculating PHC health scores:", err);
            }
        };

        loadPhcsAndScores();

        const interval = setInterval(loadPhcsAndScores, 30000); // Reload every 30s
        return () => {
            unsubscribeAlerts();
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        // Count active critical alerts
        const activeCritical = alerts.filter(a => a.status === 'active' && a.severity === 'high').length;
        setStats(prev => ({ ...prev, criticalAlerts: activeCritical }));
    }, [alerts]);

    const handleRunScan = async () => {
        setIsScanning(true);
        try {
            await runAlertEngine(language);
        } catch (error) {
            console.error(error);
        } finally {
            setIsScanning(false);
        }
    };

    const handleResolveAlert = async (alertId) => {
        try {
            await deleteDoc(doc(db, 'alerts', alertId));
        } catch (error) {
            console.error("Error deleting alert:", error);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 50) return 'var(--color-error)';
        if (score >= 25) return 'var(--color-warning)';
        return 'var(--color-success)';
    };

    const activePHC = phcs.find(p => p.id === selectedPhcId);

    // Filter PHCs into underperforming watchlist
    const underperformingList = phcs
        .map(p => ({ ...p, score: phcScores[p.id] || 0 }))
        .filter(p => p.score > 30)
        .sort((a, b) => b.score - a.score);

    return (
        <div className="container" style={{ paddingTop: '100px', paddingBottom: '4rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Map size={32} color="var(--color-accent)" /> 
                        District Operations <span className="gradient-text">Intelligence</span>
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0' }}>
                        Live monitoring, AI resource forecasting, and underperformance escalation for Nagpur District.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={handleSeed}
                        disabled={isSeeding}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem',
                            background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--color-success)',
                            borderRadius: '8px', color: 'white', fontWeight: '600', cursor: isSeeding ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s', opacity: isSeeding ? 0.7 : 1
                        }}
                    >
                        <RefreshCw size={16} className={isSeeding ? 'spin' : ''} />
                        {isSeeding ? 'Seeding...' : 'Seed Operations Data'}
                    </button>

                    <button
                        onClick={handleRunScan}
                        disabled={isScanning}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem',
                            background: 'rgba(14, 165, 233, 0.1)', border: '1px solid var(--color-accent)',
                            borderRadius: '8px', color: 'white', fontWeight: '600', cursor: isScanning ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s', opacity: isScanning ? 0.7 : 1
                        }}
                    >
                        <RefreshCw size={16} className={isScanning ? 'spin' : ''} />
                        {isScanning ? 'Scanning...' : 'Trigger AI Alert Engine'}
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Total Monitored Facilities</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{stats.totalPhcs} PHCs/CHCs</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-error)' }}>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Critical System Alerts</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.25rem', color: 'var(--color-error)' }}>{stats.criticalAlerts} Active</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Avg District Underperformance</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{stats.avgUnderperformance} / 100</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                {/* Visual Nagpur Map Coordination SVG */}
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '380px' }}>
                    <h3 style={{ margin: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Nagpur Regional Facility Map</h3>
                    <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--color-glass-border)', position: 'relative', overflow: 'hidden' }}>
                        {/* Mock Map Shapes */}
                        <svg viewBox="0 0 400 300" style={{ width: '100%', height: '100%' }}>
                            {/* District Outline */}
                            <path d="M 50,150 Q 80,50 180,40 T 350,100 T 380,240 T 250,280 T 50,150 Z" fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                            
                            {/* Grid markers */}
                            <line x1="200" y1="0" x2="200" y2="300" stroke="rgba(255,255,255,0.03)" strokeDasharray="5,5" />
                            <line x1="0" y1="150" x2="400" y2="150" stroke="rgba(255,255,255,0.03)" strokeDasharray="5,5" />

                            {/* Nagpur City Center Marker */}
                            <circle cx="200" cy="150" r="8" fill="rgba(14, 165, 233, 0.2)" stroke="var(--color-accent)" strokeWidth="1" />
                            <text x="212" y="154" fill="var(--color-text-muted)" fontSize="10">Nagpur HQ</text>

                            {/* PHC Node Points */}
                            {phcs.map(p => {
                                const score = phcScores[p.id] || 0;
                                const color = getScoreColor(score);
                                
                                // Map Lat/Lng to SVG space
                                // Nagpur bounds: Lat 21.0 to 21.5, Lng 78.5 to 79.5
                                const x = 200 + (p.location.lng - 79.15) * 350;
                                const y = 150 - (p.location.lat - 21.25) * 350;

                                return (
                                    <g key={p.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedPhcId(p.id)}>
                                        {/* Glow pulse */}
                                        <circle cx={x} cy={y} r="12" fill={color} opacity="0.15">
                                            <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                                        </circle>
                                        <circle cx={x} cy={y} r="6" fill={color} stroke="white" strokeWidth="1.5" />
                                        <text x={x + 10} y={y + 4} fill="white" fontSize="10" fontWeight="600" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                            {p.name.split(' ')[0]}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                        <div style={{ position: 'absolute', bottom: '10px', left: '10px', display: 'flex', gap: '0.75rem', background: 'rgba(15,23,42,0.8)', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)' }}></span> Safe</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-warning)' }}></span> Warning</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-error)' }}></span> Underperforming</span>
                        </div>
                    </div>
                </div>

                {/* Underperforming Center Roster Watchlist */}
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '380px' }}>
                    <h3 style={{ margin: 0, marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={18} /> Underperforming Centres Watchlist
                    </h3>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
                        {underperformingList.map(p => (
                            <div
                                key={p.id}
                                onClick={() => setSelectedPhcId(p.id)}
                                style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                                    border: '1px solid var(--color-glass-border)', cursor: 'pointer',
                                    transition: 'all 0.2s', borderLeft: `4px solid ${getScoreColor(p.score)}`
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'white' }}>{p.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                                        Type: {p.type} • Contact: {p.contactNumber}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: getScoreColor(p.score) }}>{p.score}</div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>Health score</div>
                                    </div>
                                    <ChevronRight size={16} color="var(--color-text-secondary)" />
                                </div>
                            </div>
                        ))}
                        {underperformingList.length === 0 && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                <Check size={32} color="var(--color-success)" style={{ marginBottom: '0.5rem' }} />
                                All Nagpur district units are performing adequately.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Real-time Alert & Escalation Feed */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
                <h3 style={{ margin: 0, marginBottom: '1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bell size={20} color="var(--color-accent)" /> Operations Alert Feed
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                    {alerts.map(alert => (
                        <div key={alert.id} style={{
                            padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                            border: '1px solid var(--color-glass-border)', display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem',
                            borderLeft: `5px solid ${alert.severity === 'high' ? 'var(--color-error)' : 'var(--color-warning)'}`
                        }}>
                            <div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px',
                                        background: alert.severity === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                        color: alert.severity === 'high' ? 'var(--color-error)' : 'var(--color-warning)', fontWeight: 'bold'
                                    }}>
                                        {alert.severity.toUpperCase()}
                                    </span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>
                                        {alert.phcName}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'white', marginTop: '0.5rem' }}>
                                    {alert.message}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                                    Detected: {new Date(alert.createdAt).toLocaleString()}
                                </div>
                            </div>

                            {/* AI Recommendation Box */}
                            {alert.aiRecommendation && (
                                <div style={{
                                    padding: '0.75rem', background: 'rgba(14, 165, 233, 0.03)', borderRadius: '8px',
                                    borderLeft: '3px solid var(--color-accent)', fontSize: '0.85rem',
                                    display: 'flex', flexDirection: 'column', gap: '0.25rem'
                                }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                        <Sparkles size={12} /> GEMINI AI RECOMMENDATION
                                    </span>
                                    <span style={{ color: 'var(--color-text-secondary)', lineHeight: '1.35' }}>
                                        {alert.aiRecommendation}
                                    </span>
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => handleResolveAlert(alert.id)}
                                    style={{
                                        padding: '0.4rem 0.8rem', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid var(--color-success)',
                                        borderRadius: '6px', color: 'var(--color-success)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600'
                                    }}
                                >
                                    Dismiss Alert
                                </button>
                            </div>
                        </div>
                    ))}
                    {alerts.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                            No active operational warnings in Nagpur district.
                        </div>
                    )}
                </div>
            </div>

            {/* Drill-down / Inspection Area */}
            <AnimatePresence>
                {selectedPhcId && activePHC && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        className="glass-panel"
                        style={{ padding: '2rem' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>
                                    Inspection Console: <span className="gradient-text">{activePHC.name}</span>
                                </h2>
                                <p style={{ color: 'var(--color-text-secondary)', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
                                    Live deep-dive audit diagnostics for {activePHC.type} unit.
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedPhcId(null)}
                                style={{
                                    padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid var(--color-glass-border)',
                                    borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem'
                                }}
                            >
                                Close Inspector
                            </button>
                        </div>

                        {/* Inspector tabs */}
                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                            {[
                                { id: 'stock', name: 'Stock Inventory' },
                                { id: 'footfall', name: 'Footfall & Flow' },
                                { id: 'attendance', name: 'Doctor Roster' },
                                { id: 'diagnostics', name: 'Diagnostics' },
                                { id: 'beds', name: 'Ward Beds' },
                                { id: 'forecast', name: 'AI Forecast' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setDrillDownTab(tab.id)}
                                    style={{
                                        padding: '0.5rem 1rem', background: drillDownTab === tab.id ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                                        border: 'none', borderBottom: drillDownTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                                        color: drillDownTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                        fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap'
                                    }}
                                >
                                    {tab.name}
                                </button>
                            ))}
                        </div>

                        {/* Render tracker component */}
                        <div>
                            {drillDownTab === 'stock' && <StockMonitor phcId={selectedPhcId} />}
                            {drillDownTab === 'footfall' && <FootfallTracker phcId={selectedPhcId} capacity={activePHC.capacity} />}
                            {drillDownTab === 'attendance' && <AttendanceTracker phcId={selectedPhcId} />}
                            {drillDownTab === 'diagnostics' && <DiagnosticsAudit phcId={selectedPhcId} />}
                            {drillDownTab === 'beds' && <PHCBedStatus phcId={selectedPhcId} />}
                            {drillDownTab === 'forecast' && <ForecastPanel phcId={selectedPhcId} />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <style>{`
                .spin {
                    animation: spin-anim 1s linear infinite;
                }
                @keyframes spin-anim {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default DistrictAdminDashboard;
