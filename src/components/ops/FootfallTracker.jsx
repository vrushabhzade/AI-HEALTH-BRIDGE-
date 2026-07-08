import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Line } from 'react-chartjs-2';
import { Users, TrendingUp, AlertTriangle, Plus } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const FootfallTracker = ({ phcId, capacity = 40 }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [footfallData, setFootfallData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form inputs
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [general, setGeneral] = useState('');
    const [maternal, setMaternal] = useState('');
    const [emergency, setEmergency] = useState('');
    const [pediatrics, setPediatrics] = useState('');
    const [peakHour, setPeakHour] = useState('10:00 - 12:00');
    
    const [formMessage, setFormMessage] = useState({ type: '', text: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!phcId) return;
        setIsLoading(true);

        const unsubscribe = onSnapshot(
            collection(db, 'phcs', phcId, 'footfall'),
            (snapshot) => {
                const logs = snapshot.docs.map(doc => ({
                    date: doc.id,
                    ...doc.data()
                })).sort((a, b) => new Date(a.date) - new Date(b.date));
                setFootfallData(logs);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error loading footfall:", error);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [phcId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!phcId || isSubmitting) return;

        const genVal = parseInt(general, 10) || 0;
        const matVal = parseInt(maternal, 10) || 0;
        const emVal = parseInt(emergency, 10) || 0;
        const pedVal = parseInt(pediatrics, 10) || 0;
        const total = genVal + matVal + emVal + pedVal;

        if (total <= 0) {
            setFormMessage({ type: 'error', text: 'Total patients must be greater than 0.' });
            return;
        }

        setIsSubmitting(true);
        setFormMessage({ type: '', text: '' });

        try {
            await setDoc(doc(db, 'phcs', phcId, 'footfall', date), {
                totalPatients: total,
                byDepartment: {
                    general: genVal,
                    maternal: matVal,
                    emergency: emVal,
                    pediatrics: pedVal
                },
                peakHour: peakHour,
                loggedBy: user?.name || 'Staff User'
            });

            setFormMessage({ type: 'success', text: `Footfall of ${total} patients recorded successfully.` });
            setGeneral('');
            setMaternal('');
            setEmergency('');
            setPediatrics('');
        } catch (error) {
            console.error('Error logging footfall:', error);
            setFormMessage({ type: 'error', text: 'Failed to record footfall.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Chart Configuration
    const chartLabels = footfallData.map(log => {
        const d = new Date(log.date);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });

    const patientCounts = footfallData.map(log => log.totalPatients);
    const capacityLine = footfallData.map(() => capacity);

    const chartData = {
        labels: chartLabels,
        datasets: [
            {
                label: 'Total Patients',
                data: patientCounts,
                borderColor: 'var(--color-accent)',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: 'var(--color-accent)'
            },
            {
                label: 'Facility Capacity Limit',
                data: capacityLine,
                borderColor: '#ef4444',
                borderWidth: 1.5,
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                labels: { color: 'white', boxWidth: 12, font: { size: 11 } }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#fff',
                bodyColor: '#cbd5e1',
                padding: 12,
                borderRadius: 8
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#94a3b8' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        }
    };

    const latestLog = footfallData[footfallData.length - 1];
    const isOverloaded = latestLog && latestLog.totalPatients > capacity;
    const overloadPercent = latestLog && capacity > 0 ? Math.round(((latestLog.totalPatients - capacity) / capacity) * 100) : 0;

    if (isLoading) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>Loading footfall trends...</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Left: Footfall Trend Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={20} color="var(--color-accent)" /> {t('ops.footfall.title')}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        Capacity: <strong>{capacity}</strong> patients
                    </div>
                </div>

                {isOverloaded && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.2)',
                        marginBottom: '1rem', fontSize: '0.85rem'
                    }}>
                        <AlertTriangle size={18} />
                        <div>
                            <strong>{t('ops.footfall.overloadWarning', { percent: overloadPercent })}</strong>: 
                            Latest footfall ({latestLog.totalPatients}) exceeded center limit ({capacity}).
                        </div>
                    </div>
                )}

                <div style={{ height: '300px', flex: 1, minHeight: '250px' }}>
                    <Line data={chartData} options={chartOptions} />
                </div>
            </div>

            {/* Right: Log Entry Form */}
            <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
                <h3 style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={20} color="var(--color-accent)" /> {t('ops.footfall.logEntry')}
                </h3>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {formMessage.text && (
                        <div style={{
                            padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center',
                            background: formMessage.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            color: formMessage.type === 'error' ? 'var(--color-error)' : 'var(--color-success)',
                            border: `1px solid ${formMessage.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
                        }}>
                            {formMessage.text}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-glass-border)',
                                    borderRadius: '6px', color: 'white', fontSize: '0.85rem'
                                }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Peak Hours</label>
                            <select
                                value={peakHour}
                                onChange={(e) => setPeakHour(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.5rem', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid var(--color-glass-border)',
                                    borderRadius: '6px', color: 'white', fontSize: '0.85rem', cursor: 'pointer'
                                }}
                            >
                                <option value="08:00 - 10:00" style={{ color: 'black' }}>8 AM - 10 AM</option>
                                <option value="10:00 - 12:00" style={{ color: 'black' }}>10 AM - 12 PM</option>
                                <option value="12:00 - 02:00" style={{ color: 'black' }}>12 PM - 2 PM</option>
                                <option value="02:00 - 04:00" style={{ color: 'black' }}>2 PM - 4 PM</option>
                                <option value="04:00 - 06:00" style={{ color: 'black' }}>4 PM - 6 PM</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                        <div style={{ fontWeight: '500', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                            Patients By Department
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>General OPD</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={general}
                                    onChange={(e) => setGeneral(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-glass-border)',
                                        borderRadius: '6px', color: 'white', fontSize: '0.85rem'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Maternal</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={maternal}
                                    onChange={(e) => setMaternal(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-glass-border)',
                                        borderRadius: '6px', color: 'white', fontSize: '0.85rem'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Emergency</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={emergency}
                                    onChange={(e) => setEmergency(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-glass-border)',
                                        borderRadius: '6px', color: 'white', fontSize: '0.85rem'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Pediatrics</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={pediatrics}
                                    onChange={(e) => setPediatrics(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-glass-border)',
                                        borderRadius: '6px', color: 'white', fontSize: '0.85rem'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: '100%', padding: '0.75rem', background: 'rgba(14, 165, 233, 0.15)',
                            border: '1px solid var(--color-accent)', borderRadius: '8px', color: 'white',
                            fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            marginTop: '0.5rem', transition: 'all 0.2s', opacity: isSubmitting ? 0.7 : 1
                        }}
                    >
                        {isSubmitting ? 'Submitting...' : 'Save Footfall Record'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default FootfallTracker;
