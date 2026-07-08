import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, Clock, AlertOctagon, Check, LogIn, LogOut, AlertCircle } from 'lucide-react';

const AttendanceTracker = ({ phcId }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [attendanceList, setAttendanceList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [absenceReasons, setAbsenceReasons] = useState({});
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (!phcId) return;
        setIsLoading(true);

        const unsubscribe = onSnapshot(
            collection(db, 'phcs', phcId, 'attendance'),
            (snapshot) => {
                const logs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAttendanceList(logs);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error loading attendance:", error);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [phcId]);

    // Derived unique doctors list and their attendance history
    const doctorsMap = {};
    attendanceList.forEach(log => {
        if (!doctorsMap[log.doctorId]) {
            doctorsMap[log.doctorId] = {
                id: log.doctorId,
                name: log.doctorName,
                history: [],
                todayLog: null
            };
        }
        
        doctorsMap[log.doctorId].history.push(log);
        if (log.date === todayStr) {
            doctorsMap[log.doctorId].todayLog = log;
        }
    });

    const doctors = Object.values(doctorsMap);

    const handleCheckIn = async (docId, docName) => {
        if (!phcId) return;
        
        const now = new Date();
        const checkInTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isLate = now.getHours() >= 9 && now.getMinutes() > 15; // Shift starts at 9:00 AM

        try {
            await setDoc(doc(db, 'phcs', phcId, 'attendance', `${todayStr}_${docId}`), {
                doctorId: docId,
                doctorName: docName,
                date: todayStr,
                scheduledShift: '09:00 AM - 05:00 PM',
                checkInTime,
                checkOutTime: '',
                status: isLate ? 'late' : 'present',
                reasonIfAbsent: '',
                loggedBy: user?.name || 'Staff User'
            });
        } catch (error) {
            console.error('Error logging check-in:', error);
        }
    };

    const handleCheckOut = async (docId, docName, existingLog) => {
        if (!phcId || !existingLog) return;

        const checkOutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        try {
            await setDoc(doc(db, 'phcs', phcId, 'attendance', `${todayStr}_${docId}`), {
                ...existingLog,
                checkOutTime
            });
        } catch (error) {
            console.error('Error logging check-out:', error);
        }
    };

    const openAbsentModal = (docId) => {
        setSelectedDocId(docId);
        setModalOpen(true);
    };

    const handleMarkAbsent = async () => {
        if (!phcId || !selectedDocId) return;

        const docName = doctorsMap[selectedDocId].name;
        const reason = absenceReasons[selectedDocId] || 'Not specified';

        try {
            await setDoc(doc(db, 'phcs', phcId, 'attendance', `${todayStr}_${selectedDocId}`), {
                doctorId: selectedDocId,
                doctorName: docName,
                date: todayStr,
                scheduledShift: '09:00 AM - 05:00 PM',
                checkInTime: '',
                checkOutTime: '',
                status: 'absent',
                reasonIfAbsent: reason,
                loggedBy: user?.name || 'Staff User'
            });
            setModalOpen(false);
            // Clear reason
            setAbsenceReasons(prev => ({ ...prev, [selectedDocId]: '' }));
        } catch (error) {
            console.error('Error marking absent:', error);
        }
    };

    const computeMetrics = (history) => {
        const total = history.length;
        const absent = history.filter(h => h.status === 'absent').length;
        const late = history.filter(h => h.status === 'late').length;
        const rate = total > 0 ? (absent / total) * 100 : 0;
        return { total, absent, late, rate: Math.round(rate) };
    };

    if (isLoading) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>Loading doctor logs...</p>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={20} color="var(--color-accent)" /> {t('ops.attendance.title')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {doctors.map(doc => {
                    const metrics = computeMetrics(doc.history);
                    const isTodayLogged = !!doc.todayLog;
                    const status = doc.todayLog?.status || 'Not Checked In';
                    const checkIn = doc.todayLog?.checkInTime;
                    const checkOut = doc.todayLog?.checkOutTime;

                    return (
                        <div key={doc.id} style={{
                            background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px',
                            border: '1px solid var(--color-glass-border)', display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center'
                        }}>
                            {/* Doc details & stats */}
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '1rem', color: 'white' }}>{doc.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                    Shift: 09:00 AM - 05:00 PM
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                        {t('ops.attendance.absenceRate')}: <strong>{metrics.rate}%</strong>
                                    </span>
                                    {metrics.rate > 15 && (
                                        <span title={t('ops.attendance.thresholdWarning')} style={{ display: 'inline-flex', color: 'var(--color-error)' }}>
                                            <AlertOctagon size={14} />
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Attendance Heat-grid history */}
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                                    Shift History (Last 5 days)
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    {doc.history.slice(-5).map((h, idx) => {
                                        let bg = 'rgba(255,255,255,0.1)';
                                        let title = `${h.date}: Not Logged`;
                                        if (h.status === 'present') { bg = 'var(--color-success)'; title = `${h.date}: Present`; }
                                        if (h.status === 'late') { bg = 'var(--color-warning)'; title = `${h.date}: Late (${h.checkInTime})`; }
                                        if (h.status === 'absent') { bg = 'var(--color-error)'; title = `${h.date}: Absent (${h.reasonIfAbsent})`; }
                                        return (
                                            <div
                                                key={idx}
                                                title={title}
                                                style={{
                                                    width: '24px', height: '24px', borderRadius: '4px', background: bg,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold'
                                                }}
                                            >
                                                {h.status === 'present' && <Check size={12} color="black" />}
                                                {h.status === 'late' && <Clock size={12} color="black" />}
                                                {h.status === 'absent' && <span style={{ color: 'white' }}>A</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Today Roster Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Status today:</span>
                                    <span style={{
                                        fontWeight: 'bold',
                                        color: status === 'present' ? 'var(--color-success)' : status === 'late' ? 'var(--color-warning)' : status === 'absent' ? 'var(--color-error)' : 'white',
                                        textTransform: 'capitalize'
                                    }}>
                                        {status}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    {!isTodayLogged ? (
                                        <>
                                            <button
                                                onClick={() => handleCheckIn(doc.id, doc.name)}
                                                style={{
                                                    flex: 1, padding: '0.4rem', background: 'var(--color-accent)', color: 'white',
                                                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem'
                                                }}
                                            >
                                                <LogIn size={12} /> {t('ops.attendance.checkIn')}
                                            </button>
                                            <button
                                                onClick={() => openAbsentModal(doc.id)}
                                                style={{
                                                    padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
                                                }}
                                            >
                                                Absent
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {status !== 'absent' && !checkOut && (
                                                <button
                                                    onClick={() => handleCheckOut(doc.id, doc.name, doc.todayLog)}
                                                    style={{
                                                        flex: 1, padding: '0.4rem', background: 'var(--color-success)', color: 'white',
                                                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem'
                                                    }}
                                                >
                                                    <LogOut size={12} /> {t('ops.attendance.checkOut')}
                                                </button>
                                            )}
                                            {status !== 'absent' && checkIn && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textAlign: 'right', width: '100%' }}>
                                                    In: {checkIn} {checkOut ? `• Out: ${checkOut}` : ''}
                                                </div>
                                            )}
                                            {status === 'absent' && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textAlign: 'right', width: '100%', fontStyle: 'italic' }}>
                                                    Reason: {doc.todayLog.reasonIfAbsent}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal for marking absent */}
            {modalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 2000, padding: '1rem'
                }}>
                    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '100%', background: '#1e293b' }}>
                        <h4 style={{ margin: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle size={20} color="var(--color-error)" /> Mark Doctor Absent
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                            Specify the reason for the shift absence of <strong>{doctorsMap[selectedDocId]?.name}</strong> today:
                        </p>
                        <input
                            type="text"
                            placeholder="Sick leave, Personal emergency, etc..."
                            value={absenceReasons[selectedDocId] || ''}
                            onChange={(e) => setAbsenceReasons({ ...absenceReasons, [selectedDocId]: e.target.value })}
                            style={{
                                width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-glass-border)',
                                borderRadius: '8px', color: 'white', marginBottom: '1.5rem', outline: 'none'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setModalOpen(false)}
                                style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--color-glass-border)', color: 'white', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMarkAbsent}
                                style={{ padding: '0.5rem 1rem', background: 'var(--color-error)', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                            >
                                Confirm Absent
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceTracker;
