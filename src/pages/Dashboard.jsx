import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import SymptomChecker from '../components/SymptomChecker';
import BedTracker from '../components/BedTracker';
import SOSButton from '../components/SOSButton';
import LabReportAnalyzer from '../components/LabReportAnalyzer';
import VitalTrends from '../components/VitalTrends';
import HealthWallet from '../components/HealthWallet';
import SymptomTimeline from '../components/SymptomTimeline';
import VideoConsultation from '../components/VideoConsultation';
import { Activity, Calendar, MapPin, Video, Sparkles, ArrowUpRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchAppointments } from '../services/api';

const Dashboard = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [activeSession, setActiveSession] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const dayStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    useEffect(() => {
        const loadDashboardData = async () => {
            if (user) {
                setIsLoading(true);
                try {
                    const data = await fetchAppointments();
                    setAppointments(data.filter(app => app.status === 'Accepted' || app.status === 'Pending'));
                } catch (error) {
                    console.error('Error loading dashboard data:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        loadDashboardData();
    }, [user]);

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1425 60%, #0a1020 100%)' }}>
            <div className="container" style={{ paddingTop: '100px', paddingBottom: '4rem' }}>

                <AnimatePresence>
                    {activeSession && (
                        <VideoConsultation
                            sessionInfo={activeSession}
                            onEnd={() => setActiveSession(null)}
                        />
                    )}
                </AnimatePresence>

                {/* ─── PREMIUM WELCOME HEADER ─── */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ marginBottom: '2.5rem' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            {/* Eyebrow */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    {dayStr}
                                </span>
                            </div>
                            <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0, lineHeight: 1.1, color: '#f1f5f9' }}>
                                {greeting},{' '}
                                <span style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    {user?.name || 'Guest'}
                                </span>
                            </h1>
                            <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                                Your wellness summary is ready. All vitals are within optimal range today.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <button
                                onClick={() => navigate('/find-doctors')}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '10px', color: '#38bdf8', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.18)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(56,189,248,0.1)'}
                            >
                                <Sparkles size={14} /> Quick Consult <ArrowUpRight size={13} />
                            </button>
                            <SOSButton />
                        </div>
                    </div>
                </motion.div>

                {/* ─── VITAL TRENDS (full width) ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    style={{ marginBottom: '2rem' }}
                >
                    <VitalTrends />
                </motion.div>

                {/* ─── LOWER GRID ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                        {/* Left column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <HealthWallet />
                            <LabReportAnalyzer />
                        </div>

                        {/* Middle column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <SymptomTimeline />

                            {/* Upcoming Appointments */}
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem', color: '#f1f5f9' }}>
                                    <Calendar size={18} color="#f59e0b" /> {t('dashboard.upcomingAppointments')}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {isLoading ? (
                                        <p style={{ color: '#475569', fontSize: '0.9rem' }}>Loading appointments...</p>
                                    ) : appointments.length === 0 ? (
                                        <div style={{ padding: '1.25rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                                            <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0 }}>No upcoming appointments</p>
                                            <button
                                                onClick={() => navigate('/find-doctors')}
                                                style={{ marginTop: '0.75rem', padding: '0.4rem 0.9rem', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', color: '#38bdf8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                                            >
                                                Book a Consultation
                                            </button>
                                        </div>
                                    ) : (
                                        appointments.map((app) => (
                                            <div key={app.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#f1f5f9' }}>{app.doctorId?.name || 'Doctor'}</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{app.doctorId?.specialty || 'General Physician'}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    {app.status === 'Accepted' && (
                                                        <button
                                                            onClick={() => setActiveSession({ id: app.id, partnerName: app.doctorId?.name })}
                                                            style={{ padding: '0.4rem 0.8rem', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: '600' }}
                                                        >
                                                            <Video size={12} /> Join
                                                        </button>
                                                    )}
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ color: app.status === 'Pending' ? '#f59e0b' : '#38bdf8', fontSize: '0.82rem' }}>{app.date}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{app.time}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Nearest Centre */}
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem', color: '#f1f5f9' }}>
                                    <MapPin size={18} color="#34d399" /> Nearest Centre
                                </h3>
                                <p style={{ color: '#94a3b8', marginBottom: '0.3rem', fontWeight: '600' }}>Nagpur Rural PHC #4</p>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>2.5 km away • Open until 8 PM</div>
                                <button style={{ marginTop: '1rem', width: '100%', padding: '0.55rem', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', color: '#34d399', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,0.15)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(52,211,153,0.08)'}
                                >
                                    Get Directions →
                                </button>
                            </div>
                            <BedTracker />
                        </div>
                    </div>
                </motion.div>

                {/* ─── AI SYMPTOM CHECKER ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    style={{ marginTop: '2rem' }}
                >
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.4rem', fontWeight: '700', color: '#f1f5f9' }}>AI Symptom Checker</h2>
                    <SymptomChecker />
                </motion.div>

            </div>
        </div>
    );
};

export default Dashboard;
