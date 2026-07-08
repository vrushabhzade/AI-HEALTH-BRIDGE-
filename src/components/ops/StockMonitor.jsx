import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { calculateDaysOfSupply } from '../../services/forecast';
import { Package, Plus, CheckCircle2, AlertTriangle, XCircle, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

const StockMonitor = ({ phcId }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [stock, setStock] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [criticalityFilter, setCriticalityFilter] = useState('All');

    // Form states
    const [selectedItemId, setSelectedItemId] = useState('');
    const [actionType, setActionType] = useState('consume'); // consume | restock
    const [logQty, setLogQty] = useState('');
    const [formMessage, setFormMessage] = useState({ type: '', text: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!phcId) return;
        setIsLoading(true);

        const unsubscribe = onSnapshot(
            collection(db, 'phcs', phcId, 'stock'),
            (snapshot) => {
                const stockData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const daysOfSupply = calculateDaysOfSupply(data.currentQty, data.avgDailyConsumption);
                    
                    // Determine status color/level
                    let status = 'sufficient';
                    if (daysOfSupply <= 2 || data.currentQty <= data.reorderThreshold * 0.5) {
                        status = 'critical';
                    } else if (daysOfSupply <= 5 || data.currentQty <= data.reorderThreshold) {
                        status = 'low';
                    }

                    return {
                        id: doc.id,
                        ...data,
                        daysOfSupply,
                        status
                    };
                });
                setStock(stockData);
                if (stockData.length > 0 && !selectedItemId) {
                    setSelectedItemId(stockData[0].id);
                }
                setIsLoading(false);
            },
            (error) => {
                console.error("Error loading stock:", error);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [phcId]);

    const handleLogSubmit = async (e) => {
        e.preventDefault();
        if (!phcId || !selectedItemId || !logQty || isSubmitting) return;

        const qty = parseInt(logQty, 10);
        if (isNaN(qty) || qty <= 0) {
            setFormMessage({ type: 'error', text: 'Please enter a valid positive quantity.' });
            return;
        }

        setIsSubmitting(true);
        setFormMessage({ type: '', text: '' });

        try {
            const itemRef = doc(db, 'phcs', phcId, 'stock', selectedItemId);
            const selectedItem = stock.find(item => item.id === selectedItemId);
            
            if (!selectedItem) throw new Error('Item not found');

            let newQty = selectedItem.currentQty;
            if (actionType === 'consume') {
                if (qty > selectedItem.currentQty) {
                    throw new Error(`Insufficient stock. Current quantity: ${selectedItem.currentQty}`);
                }
                newQty -= qty;
            } else {
                newQty += qty;
            }

            // Update item quantity
            await updateDoc(itemRef, {
                currentQty: newQty,
                lastRestocked: actionType === 'restock' ? new Date().toISOString() : selectedItem.lastRestocked,
                criticalFlag: calculateDaysOfSupply(newQty, selectedItem.avgDailyConsumption) < 5
            });

            // Write to stockLogs
            await addDoc(collection(db, 'phcs', phcId, 'stockLogs'), {
                itemId: selectedItemId,
                date: new Date().toISOString().split('T')[0],
                qtyConsumed: actionType === 'consume' ? qty : 0,
                qtyReceived: actionType === 'restock' ? qty : 0,
                loggedBy: user?.name || 'Staff User'
            });

            setFormMessage({
                type: 'success',
                text: `Successfully logged ${actionType === 'consume' ? 'consumption' : 'restocking'} of ${qty} ${selectedItem.unit}(s).`
            });
            setLogQty('');
        } catch (error) {
            console.error('Error logging stock transaction:', error);
            setFormMessage({ type: 'error', text: error.message || 'Log failed.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusDetails = (status) => {
        switch (status) {
            case 'critical':
                return { label: t('ops.stockMonitor.critical'), color: 'var(--color-error)', icon: XCircle, bg: 'rgba(239, 68, 68, 0.15)' };
            case 'low':
                return { label: t('ops.stockMonitor.low'), color: 'var(--color-warning)', icon: AlertTriangle, bg: 'rgba(245, 158, 11, 0.15)' };
            default:
                return { label: t('ops.stockMonitor.sufficient'), color: 'var(--color-success)', icon: CheckCircle2, bg: 'rgba(34, 197, 94, 0.15)' };
        }
    };

    // Filtered Stock
    const filteredStock = stock.filter(item => {
        const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || item.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
        const matchesCriticality = criticalityFilter === 'All' || item.status === criticalityFilter;
        return matchesSearch && matchesCategory && matchesCriticality;
    });

    const categories = ['All', ...new Set(stock.map(item => item.category))];

    if (isLoading) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>Loading inventory data...</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Left: Inventory List */}
            <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Package size={20} color="var(--color-accent)" /> {t('ops.stockMonitor.title')}
                    </h3>

                    {/* Search & Filters */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%', smWidth: 'auto' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.4rem 0.5rem 0.4rem 2rem', background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--color-glass-border)', borderRadius: '6px', color: 'white', fontSize: '0.85rem'
                                }}
                            />
                        </div>

                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            style={{
                                padding: '0.4rem', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid var(--color-glass-border)',
                                borderRadius: '6px', color: 'white', fontSize: '0.85rem', cursor: 'pointer'
                            }}
                        >
                            {categories.map(c => <option key={c} value={c} style={{ color: 'black' }}>{c}</option>)}
                        </select>

                        <select
                            value={criticalityFilter}
                            onChange={(e) => setCriticalityFilter(e.target.value)}
                            style={{
                                padding: '0.4rem', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid var(--color-glass-border)',
                                borderRadius: '6px', color: 'white', fontSize: '0.85rem', cursor: 'pointer'
                            }}
                        >
                            <option value="All" style={{ color: 'black' }}>All Stock Statuses</option>
                            <option value="critical" style={{ color: 'black' }}>Critical</option>
                            <option value="low" style={{ color: 'black' }}>Low</option>
                            <option value="sufficient" style={{ color: 'black' }}>Sufficient</option>
                        </select>
                    </div>
                </div>

                {/* Stock Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-secondary)' }}>
                                <th style={{ padding: '0.75rem 0.5rem' }}>{t('ops.stockMonitor.itemName')}</th>
                                <th style={{ padding: '0.75rem 0.5rem' }}>{t('ops.stockMonitor.category')}</th>
                                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>{t('ops.stockMonitor.qty')}</th>
                                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Daily Avg</th>
                                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Supply Left</th>
                                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStock.map(item => {
                                const details = getStatusDetails(item.status);
                                const StatusIcon = details.icon;

                                return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'middle' }}>
                                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>
                                            {item.itemName}
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                            {item.category}
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>
                                            {item.currentQty} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>{item.unit}</span>
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                                            {item.avgDailyConsumption} / day
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                            <span style={{
                                                fontSize: '0.8rem',
                                                color: item.daysOfSupply <= 5 ? details.color : 'white',
                                                fontWeight: item.daysOfSupply <= 5 ? 'bold' : 'normal'
                                            }}>
                                                {item.daysOfSupply === Infinity ? '∞' : `${Math.round(item.daysOfSupply)} days`}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem',
                                                borderRadius: '4px', background: details.bg, color: details.color, fontSize: '0.75rem', fontWeight: '600'
                                            }}>
                                                <StatusIcon size={12} /> {details.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredStock.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                                        No stock items found matching the filter criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right: Log Form */}
            <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
                <h3 style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={20} color="var(--color-accent)" /> {t('ops.stockMonitor.logEntry')}
                </h3>

                <form onSubmit={handleLogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                            Select Inventory Item
                        </label>
                        <select
                            value={selectedItemId}
                            onChange={(e) => setSelectedItemId(e.target.value)}
                            style={{
                                width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-glass-border)',
                                borderRadius: '8px', color: 'white', outline: 'none', cursor: 'pointer'
                            }}
                            required
                        >
                            {stock.map(item => (
                                <option key={item.id} value={item.id} style={{ color: 'black' }}>
                                    {item.itemName} ({item.currentQty} {item.unit} available)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                            Transaction Type
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setActionType('consume')}
                                style={{
                                    flex: 1, padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
                                    border: actionType === 'consume' ? '1px solid var(--color-error)' : '1px solid var(--color-glass-border)',
                                    background: actionType === 'consume' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                    color: actionType === 'consume' ? 'var(--color-error)' : 'white'
                                }}
                            >
                                {t('ops.stockMonitor.consume')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setActionType('restock')}
                                style={{
                                    flex: 1, padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
                                    border: actionType === 'restock' ? '1px solid var(--color-success)' : '1px solid var(--color-glass-border)',
                                    background: actionType === 'restock' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                                    color: actionType === 'restock' ? 'var(--color-success)' : 'white'
                                }}
                            >
                                {t('ops.stockMonitor.restock')}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                            {t('ops.stockMonitor.qtyField')}
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={logQty}
                            onChange={(e) => setLogQty(e.target.value)}
                            placeholder="Enter count..."
                            style={{
                                width: '100%', padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-glass-border)',
                                borderRadius: '8px', color: 'white', fontSize: '0.9rem'
                            }}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: '100%', padding: '0.75rem', background: actionType === 'consume' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                            border: `1px solid ${actionType === 'consume' ? 'var(--color-error)' : 'var(--color-success)'}`,
                            borderRadius: '8px', color: 'white', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s', opacity: isSubmitting ? 0.7 : 1
                        }}
                    >
                        {isSubmitting ? 'Logging...' : t('ops.stockMonitor.submit')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StockMonitor;
