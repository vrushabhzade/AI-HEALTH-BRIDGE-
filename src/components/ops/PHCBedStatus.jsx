import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { BedDouble, RefreshCw, AlertCircle, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';

const PHCBedStatus = ({ phcId }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [bedStatus, setBedStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Form inputs
    const [occupied, setOccupied] = useState('');
    const [icuOccupied, setIcuOccupied] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [formMessage, setFormMessage] = useState({ type: '', text: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!phcId) return;
        setIsLoading(true);

        const unsubscribe = onSnapshot(
            doc(db, 'phcs', phcId, 'beds', 'current'),
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setBedStatus(data);
                    setOccupied(data.occupied.toString());
                    setIcuOccupied(data.icuOccupied.toString());
                } else {
                    // Fallback default
                    setBedStatus({ total: 40, occupied: 0, icuTotal: 2, icuOccupied: 0, lastUpdated: new Date().toISOString() });
                }
                setIsLoading(false);
            },
            (error) => {
                console.error("Error loading beds:", error);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [phcId]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!phcId || !bedStatus || isSubmitting) return;

        const occVal = parseInt(occupied, 10);
        const icuOccVal = parseInt(icuOccupied, 10);

        if (isNaN(occVal) || occVal < 0 || occVal > bedStatus.total) {
            setFormMessage({ type: 'error', text: `General occupancy must be between 0 and ${bedStatus.total}.` });
            return;
        }
        if (isNaN(icuOccVal) || icuOccVal < 0 || icuOccVal > bedStatus.icuTotal) {
            setFormMessage({ type: 'error', text: `ICU occupancy must be between 0 and ${bedStatus.icuTotal}.` });
            return;
        }

        setIsSubmitting(true);
        setFormMessage({ type: '', text: '' });

        try {
            const docRef = doc(db, 'phcs', phcId, 'beds', 'current');
            await updateDoc(docRef, {
                occupied: occVal,
                icuOccupied: icuOccVal,
                lastUpdated: new Date().toISOString()
            });

            setFormMessage({ type: 'success', text: 'Bed occupancy status updated successfully.' });
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating bed occupancy:', error);
            setFormMessage({ type: 'error', text: 'Failed to update bed occupancy.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusColor = (rate) => {
        if (rate >= 0.9) return 'var(--color-error)';
        if (rate >= 0.7) return 'var(--color-warning)';
        return 'var(--color-success)';
    };

    if (isLoading) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>Loading bed status...</p>
            </div>
        );
    }

    if (!bedStatus) return null;

    const generalRate = bedStatus.total > 0 ? bedStatus.occupied / bedStatus.total : 0;
    const icuRate = bedStatus.icuTotal > 0 ? bedStatus.icuOccupied / bedStatus.icuTotal : 0;
    const isCritical = generalRate >= 0.9 || icuRate >= 0.9;

    const generalColor = getStatusColor(generalRate);
    const icuColor = getStatusColor(icuRate);

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BedDouble size={20} color="var(--color-accent)" /> {t('ops.beds.title')}
                </h3>

                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-glass-border)',
                            borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.8rem'
                        }}
                    >
                        <Edit3 size={12} /> {t('ops.beds.update')}
                    </button>
                )}
            </div>

            {isCritical && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-error)', border: '1px solid rgba(239, 68, 68, 0.2)',
                    marginBottom: '1rem', fontSize: '0.8rem'
                }}>
                    <AlertCircle size={16} />
                    <span><strong>{t('ops.beds.critical')}</strong> Ward capacity is near maximum limit!</span>
                </div>
            )}

            {!isEditing ? (
                // Display Bars
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* General Beds */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>{t('ops.beds.general')}</span>
                            <span>
                                <strong>{bedStatus.occupied}</strong> / {bedStatus.total} occupied
                            </span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${generalRate * 100}%` }}
                                transition={{ duration: 0.5 }}
                                style={{ height: '100%', background: generalColor, borderRadius: '4px' }}
                            />
                        </div>
                    </div>

                    {/* ICU Beds */}
                    {bedStatus.icuTotal > 0 && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>{t('ops.beds.icu')}</span>
                                <span>
                                    <strong>{bedStatus.icuOccupied}</strong> / {bedStatus.icuTotal} occupied
                                </span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${icuRate * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                    style={{ height: '100%', background: icuColor, borderRadius: '4px' }}
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', textAlign: 'right' }}>
                        Last updated: {new Date(bedStatus.lastUpdated).toLocaleDateString()} {new Date(bedStatus.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            ) : (
                // Edit Form
                <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {formMessage.text && (
                        <div style={{
                            padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', textAlign: 'center',
                            background: formMessage.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            color: formMessage.type === 'error' ? 'var(--color-error)' : 'var(--color-success)',
                            border: `1px solid ${formMessage.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
                        }}>
                            {formMessage.text}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                Occupied General (Max {bedStatus.total})
                            </label>
                            <input
                                type="number"
                                min="0"
                                max={bedStatus.total}
                                value={occupied}
                                onChange={(e) => setOccupied(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-glass-border)',
                                    borderRadius: '6px', color: 'white', fontSize: '0.85rem'
                                }}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                Occupied ICU (Max {bedStatus.icuTotal})
                            </label>
                            <input
                                type="number"
                                min="0"
                                max={bedStatus.icuTotal}
                                value={icuOccupied}
                                onChange={(e) => setIcuOccupied(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-glass-border)',
                                    borderRadius: '6px', color: 'white', fontSize: '0.85rem'
                                }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            style={{
                                flex: 1, padding: '0.4rem', background: 'transparent', border: '1px solid var(--color-glass-border)',
                                borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                flex: 1, padding: '0.4rem', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid var(--color-success)',
                                borderRadius: '6px', color: 'white', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                fontSize: '0.85rem', opacity: isSubmitting ? 0.7 : 1
                            }}
                        >
                            Save
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default PHCBedStatus;
