import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';
import { calculateDaysOfSupply, findRedistributionCandidates, computeUnderperformanceScore } from '../../services/forecast';
import { Sparkles, BarChart2, ShieldAlert, CheckCircle, ArrowRightLeft, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

const ForecastPanel = ({ phcId }) => {
    const { t, language } = useLanguage();
    const [phc, setPhc] = useState(null);
    const [stockItems, setStockItems] = useState([]);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [diagnostics, setDiagnostics] = useState([]);
    const [bedStatus, setBedStatus] = useState(null);
    const [footfallLogs, setFootfallLogs] = useState([]);
    const [allDistrictStock, setAllDistrictStock] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [redistributions, setRedistributions] = useState([]);
    const [underperformanceScore, setUnderperformanceScore] = useState(0);

    useEffect(() => {
        if (!phcId) return;
        setIsLoading(true);

        const loadPhcData = async () => {
            try {
                // 1. Fetch PHC details
                const phcDoc = await getDoc(doc(db, 'phcs', phcId));
                if (!phcDoc.exists()) return;
                const phcData = { id: phcDoc.id, ...phcDoc.data() };
                setPhc(phcData);

                // 2. Subscribe to subcollections
                const unsubStock = onSnapshot(collection(db, 'phcs', phcId, 'stock'), (snapshot) => {
                    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setStockItems(list);
                });

                const unsubAttendance = onSnapshot(collection(db, 'phcs', phcId, 'attendance'), (snapshot) => {
                    const list = snapshot.docs.map(doc => doc.data());
                    setAttendanceLogs(list);
                });

                const unsubDiagnostics = onSnapshot(collection(db, 'phcs', phcId, 'diagnostics'), (snapshot) => {
                    const list = snapshot.docs.map(doc => doc.data());
                    setDiagnostics(list);
                });

                const unsubBeds = onSnapshot(doc(db, 'phcs', phcId, 'beds', 'current'), (docSnap) => {
                    if (docSnap.exists()) setBedStatus(docSnap.data());
                });

                const unsubFootfall = onSnapshot(collection(db, 'phcs', phcId, 'footfall'), (snapshot) => {
                    const list = snapshot.docs.map(doc => doc.data());
                    setFootfallLogs(list);
                });

                // 3. Fetch all other stock items in the district for redistribution pairing
                const stockSnapshot = await getDocs(collection(db, 'phcs'));
                const allStock = [];
                for (const d of stockSnapshot.docs) {
                    if (d.id !== phcId && d.data().districtId === phcData.districtId) {
                        const subStock = await getDocs(collection(db, 'phcs', d.id, 'stock'));
                        subStock.forEach(sDoc => {
                            allStock.push({
                                phcId: d.id,
                                phcName: d.data().name,
                                districtId: d.data().districtId,
                                itemId: sDoc.id,
                                ...sDoc.data()
                            });
                        });
                    }
                }
                setAllDistrictStock(allStock);
                setIsLoading(false);

                return () => {
                    unsubStock();
                    unsubAttendance();
                    unsubDiagnostics();
                    unsubBeds();
                    unsubFootfall();
                };
            } catch (err) {
                console.error("Error fetching forecasting panel data:", err);
                setIsLoading(false);
            }
        };

        loadPhcData();
    }, [phcId]);

    // Recalculate metrics when dependencies update
    useEffect(() => {
        if (!phc || stockItems.length === 0) return;

        // A. Underperformance Score calculation
        const latestFootfall = footfallLogs.sort((a, b) => new Date(b.date) - new Date(a.date))[0] || { totalPatients: 0 };
        const score = computeUnderperformanceScore({
            stockItems,
            attendanceLogs,
            footfall: latestFootfall,
            diagnostics,
            capacity: phc.capacity
        });
        setUnderperformanceScore(score);

        // B. Redistribution Analysis
        const recommendations = [];
        stockItems.forEach(item => {
            const daysOfSupply = calculateDaysOfSupply(item.currentQty, item.avgDailyConsumption);
            if (daysOfSupply < 7) {
                // Compile item stock entries across Nagpur
                const itemDistrictStocks = [
                    {
                        phcId: phc.id,
                        phcName: phc.name,
                        districtId: phc.districtId,
                        itemId: item.id,
                        itemName: item.itemName,
                        currentQty: item.currentQty,
                        avgDailyConsumption: item.avgDailyConsumption
                    },
                    ...allDistrictStock.filter(s => s.itemId === item.id)
                ];

                const candidates = findRedistributionCandidates(itemDistrictStocks, item.id);
                const selfRec = candidates.find(c => c.toPhcId === phcId);
                if (selfRec) {
                    recommendations.push(selfRec);
                }
            }
        });
        setRedistributions(recommendations);
    }, [phc, stockItems, attendanceLogs, diagnostics, bedStatus, footfallLogs, allDistrictStock]);

    if (isLoading) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>Calculating AI forecasts and analytics...</p>
            </div>
        );
    }

    const getScoreSeverity = (score) => {
        if (score >= 60) return { label: 'Action Required: High Risk', color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.15)' };
        if (score >= 30) return { label: 'Monitor Closely: Medium Risk', color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.15)' };
        return { label: 'Optimal: Low Risk', color: 'var(--color-success)', bg: 'rgba(34, 197, 94, 0.15)' };
    };

    const severity = getScoreSeverity(underperformanceScore);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Health / Underperformance Card */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart2 size={20} color="var(--color-accent)" /> {t('ops.forecast.title')}
                </h3>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '1rem 0' }}>
                    {/* Ring score */}
                    <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg style={{ transform: 'rotate(-90deg)', width: '120px', height: '120px' }}>
                            <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                            <motion.circle
                                cx="60" cy="60" r="50" fill="transparent"
                                stroke={severity.color} strokeWidth="8"
                                strokeDasharray={2 * Math.PI * 50}
                                initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - underperformanceScore / 100) }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                        </svg>
                        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white' }}>{underperformanceScore}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Index Score</span>
                        </div>
                    </div>

                    <div style={{
                        marginTop: '1.25rem', padding: '0.3rem 0.75rem', borderRadius: '50px',
                        background: severity.bg, color: severity.color, fontSize: '0.8rem', fontWeight: 'bold'
                    }}>
                        {severity.label}
                    </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                    The PHC Underperformance Index combines stock status, roster gaps, diagnostics availability, and patient overload into a single weighted score.
                </div>
            </div>

            {/* AI Redistribution Plan */}
            <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
                <h3 style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={20} color="var(--color-accent)" /> {t('ops.forecast.redistributionCard')}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {redistributions.map((r, idx) => (
                        <div key={idx} style={{
                            padding: '1.25rem', background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(255,255,255,0.01) 100%)',
                            borderRadius: '12px', border: '1px solid rgba(14, 165, 233, 0.2)', display: 'flex',
                            flexDirection: 'column', gap: '0.75rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem',
                                    background: 'rgba(14, 165, 233, 0.15)', color: 'var(--color-accent)', borderRadius: '4px',
                                    fontSize: '0.75rem', fontWeight: 'bold'
                                }}>
                                    <ArrowRightLeft size={12} /> Stock Redistribution Plan
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <TrendingDown size={12} color="var(--color-error)" /> {r.daysOfSupplyToBefore} days remaining
                                </span>
                            </div>

                            <div style={{ fontSize: '0.95rem', fontWeight: '500', color: 'white' }}>
                                Transfer <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{r.suggestedQty} units</span> of {r.itemName} from <span style={{ color: 'var(--color-success)' }}>{r.fromPhcName}</span>.
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                                <div>
                                    <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Source (Surplus Hub)</div>
                                    <div style={{ fontWeight: '500' }}>{r.fromPhcName}</div>
                                    <div style={{ color: 'var(--color-success)', marginTop: '0.1rem' }}>
                                        {r.daysOfSupplyFromBefore} days ➔ {r.daysOfSupplyFromAfter} days supply
                                    </div>
                                </div>
                                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '1rem' }}>
                                    <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Target (Deficit Unit)</div>
                                    <div style={{ fontWeight: '500' }}>{r.toPhcName}</div>
                                    <div style={{ color: 'var(--color-accent)', marginTop: '0.1rem' }}>
                                        {r.daysOfSupplyToBefore} days ➔ {r.daysOfSupplyToAfter} days supply
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                padding: '0.5rem 0.75rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px',
                                borderLeft: '3px solid var(--color-accent)', fontSize: '0.8rem', color: 'var(--color-text-secondary)',
                                display: 'flex', flexDirection: 'column', gap: '0.25rem'
                            }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {t('ops.alerts.recommendation')}
                                </span>
                                <span>
                                    {language === 'hi' 
                                        ? `अग्रिम जेमिनी एआई ने ${r.itemName} के वितरण के लिए ${r.fromPhcName} के अतिरेक भंडार से ${r.suggestedQty} इकाइयां लाने की शिफारिश की है जिससे ${r.toPhcName} का आपातकालीन संकट टल सके।`
                                        : language === 'mr'
                                        ? `जेमिनी एआय सल्ला: ${r.toPhcName} मधील तुटवडा दूर करण्यासाठी ${r.fromPhcName} कडील अतिरिक्त स्टॉक मधून ${r.suggestedQty} युनिट्स तात्काळ ट्रान्सफर करण्याची शिफारस करण्यात आली आहे.`
                                        : `Gemini AI suggests leveraging the surplus stock at ${r.fromPhcName} to restock ${r.toPhcName} with ${r.suggestedQty} units. This will securely bridge the supply gap and prevent service disruption.`
                                    }
                                </span>
                            </div>
                        </div>
                    ))}

                    {redistributions.length === 0 && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '3rem', border: '1px dashed var(--color-glass-border)', borderRadius: '12px',
                            textAlign: 'center', color: 'var(--color-text-muted)'
                        }}>
                            <CheckCircle size={36} color="var(--color-success)" style={{ marginBottom: '0.75rem' }} />
                            <div style={{ fontWeight: '600', color: 'white', marginBottom: '0.25rem' }}>Inventory Secure</div>
                            <div style={{ fontSize: '0.85rem' }}>All essential stock items are currently above the critical reorder thresholds. No redistribution transfer campaigns needed.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForecastPanel;
