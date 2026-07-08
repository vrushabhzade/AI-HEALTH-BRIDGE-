import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import StockMonitor from '../components/ops/StockMonitor';
import FootfallTracker from '../components/ops/FootfallTracker';
import AttendanceTracker from '../components/ops/AttendanceTracker';
import DiagnosticsAudit from '../components/ops/DiagnosticsAudit';
import PHCBedStatus from '../components/ops/PHCBedStatus';
import ForecastPanel from '../components/ops/ForecastPanel';
import { LayoutDashboard, Package, Users, UserCheck, Activity, BedDouble, Sparkles, Building } from 'lucide-react';

const PHCStaffDashboard = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [phcs, setPhcs] = useState([]);
    const [selectedPhcId, setSelectedPhcId] = useState(user?.phcId || '');
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('stock');

    useEffect(() => {
        const fetchPHCs = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'phcs'));
                const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPhcs(list);
                if (list.length > 0 && !selectedPhcId) {
                    setSelectedPhcId(list[0].id);
                }
            } catch (err) {
                console.error("Error fetching PHCs for selector:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPHCs();
    }, [selectedPhcId]);

    const activePHC = phcs.find(p => p.id === selectedPhcId);

    const tabs = [
        { id: 'stock', name: t('ops.stockMonitor.title') || 'Stock', icon: Package },
        { id: 'footfall', name: t('ops.footfall.title') || 'Footfall', icon: Users },
        { id: 'attendance', name: t('ops.attendance.title') || 'Attendance', icon: UserCheck },
        { id: 'diagnostics', name: t('ops.diagnostics.title') || 'Diagnostics', icon: Activity },
        { id: 'beds', name: t('ops.beds.title') || 'Beds', icon: BedDouble },
        { id: 'forecast', name: 'AI Forecast', icon: Sparkles }
    ];

    if (isLoading) {
        return (
            <div className="container" style={{ paddingTop: '100px', textAlign: 'center', color: 'white' }}>
                <p>Loading PHC Console...</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '100px', paddingBottom: '4rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LayoutDashboard size={32} className="gradient-text" /> 
                        PHC Staff <span className="gradient-text">Console</span>
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0' }}>
                        Real-time operations management for local medical centres.
                    </p>
                </div>

                {/* Facility Selector (for demo/staff role) */}
                {(!user?.phcId || user.role === 'district_admin' || user.isGuest) && phcs.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building size={16} color="var(--color-accent)" />
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Facility:</span>
                        <select
                            value={selectedPhcId}
                            onChange={(e) => setSelectedPhcId(e.target.value)}
                            style={{
                                padding: '0.5rem 1rem', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid var(--color-glass-border)',
                                borderRadius: '8px', color: 'white', fontWeight: '500', cursor: 'pointer', outline: 'none'
                            }}
                        >
                            {phcs.map(p => (
                                <option key={p.id} value={p.id} style={{ color: 'black' }}>
                                    {p.name} ({p.type})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {activePHC && (
                <div style={{
                    padding: '0.75rem 1.25rem', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.2)',
                    borderRadius: '8px', color: 'white', marginBottom: '2rem', fontSize: '0.9rem', display: 'inline-block'
                }}>
                    Active Facility: <strong>{activePHC.name}</strong> • Capacity: {activePHC.capacity} • Contact: {activePHC.contactNumber}
                </div>
            )}

            {/* Tab navigation */}
            <div style={{
                display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem',
                scrollbarWidth: 'none', msOverflowStyle: 'none'
            }}>
                {tabs.map(tab => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem',
                                background: isActive ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                                border: isActive ? '1px solid var(--color-accent)' : '1px solid transparent',
                                borderRadius: '8px', color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                fontWeight: isActive ? '600' : '500', cursor: 'pointer', whiteSpace: 'nowrap',
                                transition: 'all 0.2s'
                            }}
                        >
                            <TabIcon size={16} /> {tab.name}
                        </button>
                    );
                })}
            </div>

            {/* Tab Contents */}
            {selectedPhcId && (
                <div>
                    {activeTab === 'stock' && <StockMonitor phcId={selectedPhcId} />}
                    {activeTab === 'footfall' && <FootfallTracker phcId={selectedPhcId} capacity={activePHC?.capacity} />}
                    {activeTab === 'attendance' && <AttendanceTracker phcId={selectedPhcId} />}
                    {activeTab === 'diagnostics' && <DiagnosticsAudit phcId={selectedPhcId} />}
                    {activeTab === 'beds' && <PHCBedStatus phcId={selectedPhcId} />}
                    {activeTab === 'forecast' && <ForecastPanel phcId={selectedPhcId} />}
                </div>
            )}
        </div>
    );
};

export default PHCStaffDashboard;
