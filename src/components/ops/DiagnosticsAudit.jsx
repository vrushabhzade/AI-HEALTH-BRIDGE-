import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Activity, ClipboardCheck, CheckCircle2, AlertTriangle, AlertCircle, Calendar } from 'lucide-react';

const DiagnosticsAudit = ({ phcId }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [tests, setTests] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form inputs
    const [selectedTestId, setSelectedTestId] = useState('');
    const [status, setStatus] = useState('functional');
    const [comments, setComments] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formMessage, setFormMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (!phcId) return;
        setIsLoading(true);

        // Subscribe to diagnostics items
        const unsubTests = onSnapshot(
            collection(db, 'phcs', phcId, 'diagnostics'),
            (snapshot) => {
                const list = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setTests(list);
                if (list.length > 0 && !selectedTestId) {
                    setSelectedTestId(list[0].id);
                }
            },
            (error) => console.error("Error loading diagnostics tests:", error)
        );

        // Subscribe to diagnostics audit history logs
        const unsubLogs = onSnapshot(
            collection(db, 'phcs', phcId, 'diagnosticsLogs'),
            (snapshot) => {
                const list = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setAuditLogs(list);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error loading diagnostics logs:", error);
                setIsLoading(false);
            }
        );

        return () => {
            unsubTestProps();
            unsubLogs();
        };

        // Fix name mapping
        function unsubTestProps() {
            unsubTest();
        }
        function unsubTest() {
            unsubTests();
        }
    }, [phcId]);

    const handleAuditSubmit = async (e) => {
        e.preventDefault();
        if (!phcId || !selectedTestId || isSubmitting) return;

        setIsSubmitting(true);
        setFormMessage({ type: '', text: '' });

        try {
            const testRef = doc(db, 'phcs', phcId, 'diagnostics', selectedTestId);
            const targetTest = tests.find(t => t.id === selectedTestId);

            if (!targetTest) throw new Error('Test equipment not found');

            const timestamp = new Date().toISOString();

            // 1. Update Diagnostics item status
            await updateDoc(testRef, {
                status,
                lastAuditDate: timestamp,
                auditedBy: user?.name || 'Staff User'
            });

            // 2. Add to logs subcollection
            await addDoc(collection(db, 'phcs', phcId, 'diagnosticsLogs'), {
                testId: selectedTestId,
                testName: targetTest.testName,
                statusBefore: targetTest.status,
                statusAfter: status,
                timestamp,
                comments: comments || 'Routine weekly audit check',
                auditedBy: user?.name || 'Staff User'
            });

            setFormMessage({ type: 'success', text: `Diagnostic audit logged successfully for ${targetTest.testName}.` });
            setComments('');
        } catch (error) {
            console.error('Error submitting diagnostics audit:', error);
            setFormMessage({ type: 'error', text: 'Audit entry submission failed.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (testStatus) => {
        switch (testStatus) {
            case 'functional':
                return { label: t('ops.diagnostics.functional'), color: 'var(--color-success)', bg: 'rgba(34, 197, 94, 0.15)', icon: CheckCircle2 };
            case 'down':
                return { label: t('ops.diagnostics.down'), color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.15)', icon: AlertCircle };
            case 'no_reagent':
                return { label: t('ops.diagnostics.noReagent'), color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.15)', icon: AlertTriangle };
            default:
                return { label: 'Unknown', color: 'var(--color-text-muted)', bg: 'rgba(255,255,255,0.05)', icon: AlertCircle };
        }
    };

    if (isLoading) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>Loading equipment audit data...</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Left: Diagnostics Equipment Status List */}
            <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
                <h3 style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={20} color="var(--color-accent)" /> {t('ops.diagnostics.title')}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    {tests.map(test => {
                        const badge = getStatusBadge(test.status);
                        const Icon = badge.icon;
                        const auditDate = test.lastAuditDate ? new Date(test.lastAuditDate).toLocaleDateString() : 'Never';

                        return (
                            <div key={test.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
                                border: '1px solid var(--color-glass-border)', flexWrap: 'wrap', gap: '1rem'
                            }}>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{test.testName}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                                        {t('ops.diagnostics.equipment')}: <strong>{test.equipmentRequired}</strong>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                                        Last Audited: {auditDate} by {test.auditedBy || 'System'}
                                    </div>
                                </div>

                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem',
                                    borderRadius: '50px', background: badge.bg, color: badge.color, fontSize: '0.8rem', fontWeight: 'bold'
                                }}>
                                    <Icon size={14} /> {badge.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Audit History Logs */}
                <h4 style={{ margin: 0, marginBottom: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                    Audit History Log
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                    {auditLogs.slice(-6).reverse().map(log => {
                        const statusBeforeBadge = getStatusBadge(log.statusBefore);
                        const statusAfterBadge = getStatusBadge(log.statusAfter);
                        
                        return (
                            <div key={log.id} style={{
                                padding: '0.75rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.8rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: '500' }}>{log.testName}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                                        <Calendar size={12} /> {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Status update:</span>
                                    <span style={{ color: statusBeforeBadge.color }}>{statusBeforeBadge.label}</span>
                                    <span>➔</span>
                                    <span style={{ color: statusAfterBadge.color, fontWeight: 'bold' }}>{statusAfterBadge.label}</span>
                                </div>
                                <div style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                                    "{log.comments}" — {log.auditedBy}
                                </div>
                            </div>
                        );
                    })}
                    {auditLogs.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                            No audit checks logged yet.
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Checklist Form */}
            <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
                <h3 style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ClipboardCheck size={20} color="var(--color-accent)" /> {t('ops.diagnostics.logAudit')}
                </h3>

                <form onSubmit={handleAuditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                            Select Equipment / Test
                        </label>
                        <select
                            value={selectedTestId}
                            onChange={(e) => setSelectedTestId(e.target.value)}
                            style={{
                                width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-glass-border)',
                                borderRadius: '8px', color: 'white', outline: 'none', cursor: 'pointer'
                            }}
                            required
                        >
                            {tests.map(test => (
                                <option key={test.id} value={test.id} style={{ color: 'black' }}>
                                    {test.testName} ({test.equipmentRequired})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                            {t('ops.diagnostics.status')}
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            style={{
                                width: '100%', padding: '0.6rem', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid var(--color-glass-border)',
                                borderRadius: '8px', color: 'white', cursor: 'pointer', outline: 'none'
                            }}
                        >
                            <option value="functional" style={{ color: 'black' }}>{t('ops.diagnostics.functional')}</option>
                            <option value="down" style={{ color: 'black' }}>{t('ops.diagnostics.down')}</option>
                            <option value="no_reagent" style={{ color: 'black' }}>{t('ops.diagnostics.noReagent')}</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                            Audit Comments / Action Needed
                        </label>
                        <textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Enter description, repair logs or maintenance request notes..."
                            rows="3"
                            style={{
                                width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-glass-border)',
                                borderRadius: '8px', color: 'white', fontSize: '0.9rem', outline: 'none', resize: 'vertical'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: '100%', padding: '0.75rem', background: 'rgba(14, 165, 233, 0.15)',
                            border: '1px solid var(--color-accent)', borderRadius: '8px', color: 'white',
                            fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s', opacity: isSubmitting ? 0.7 : 1
                        }}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Audit Status'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default DiagnosticsAudit;
