import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldX, ArrowRight, Home, Building2, Hospital, UserCog } from 'lucide-react';

const ROLE_META = {
    district_admin: { label: 'District Admin',  icon: Building2,  color: '#38bdf8', desc: 'Access the district-level PHC/CHC operational intelligence dashboard.' },
    phc_staff:      { label: 'PHC Staff',        icon: Hospital,   color: '#34d399', desc: 'Access the PHC staff console for stock, attendance, beds & diagnostics tracking.' },
    admin:          { label: 'Administrator',    icon: UserCog,    color: '#f59e0b', desc: 'Access the system administration and user management panel.' },
    doctor:         { label: 'Doctor',           icon: UserCog,    color: '#a78bfa', desc: 'Access the doctor dashboard for managing consultations and prescriptions.' },
};

const ALL_ROLES = [
    { value: 'patient',        label: 'Patient',       color: '#94a3b8' },
    { value: 'doctor',         label: 'Doctor',        color: '#a78bfa' },
    { value: 'phc_staff',      label: 'PHC Staff',     color: '#34d399' },
    { value: 'district_admin', label: 'District Admin',color: '#38bdf8' },
];

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1425 100%)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(56,189,248,0.2)', borderTop: '3px solid #38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Authenticating...</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && user.role !== requiredRole) {
        const meta = ROLE_META[requiredRole] || { label: requiredRole, icon: UserCog, color: '#38bdf8', desc: 'This page is restricted.' };
        const MetaIcon = meta.icon;
        const currentMeta = ROLE_META[user.role] || { label: user.role, color: '#94a3b8' };

        const switchRole = (role) => {
            const updatedUser = { ...user, role };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            window.location.reload();
        };

        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1425 60%, #0a1020 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '2rem', fontFamily: 'Inter, sans-serif'
            }}>
                <div style={{ maxWidth: '520px', width: '100%' }}>

                    {/* Icon + Header */}
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{
                            width: '72px', height: '72px', borderRadius: '20px',
                            background: 'rgba(248,113,113,0.1)',
                            border: '1px solid rgba(248,113,113,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.25rem'
                        }}>
                            <ShieldX size={32} color="#f87171" />
                        </div>
                        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.6rem', fontWeight: '800', color: '#f1f5f9' }}>
                            Access Restricted
                        </h2>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                            You're signed in as <span style={{ color: currentMeta.color, fontWeight: '600' }}>{currentMeta.label || user.role}</span>
                            {' '}but this page requires{' '}
                            <span style={{ color: meta.color, fontWeight: '600' }}>{meta.label}</span> access.
                        </p>
                    </div>

                    {/* Required Role Card */}
                    <div style={{
                        padding: '1.25rem 1.5rem',
                        background: `${meta.color}0d`,
                        border: `1px solid ${meta.color}30`,
                        borderRadius: '14px',
                        marginBottom: '1.5rem',
                        display: 'flex', alignItems: 'flex-start', gap: '0.9rem'
                    }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${meta.color}18`, border: `1px solid ${meta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <MetaIcon size={18} color={meta.color} />
                        </div>
                        <div>
                            <div style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '0.95rem', marginBottom: '0.3rem' }}>{meta.label} Dashboard</div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>{meta.desc}</p>
                        </div>
                    </div>

                    {/* Role Switcher */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px',
                        padding: '1.25rem',
                        marginBottom: '1rem'
                    }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                            Demo Role Switcher
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            {ALL_ROLES.map(r => {
                                const isTarget = r.value === requiredRole;
                                const isCurrent = r.value === user.role;
                                return (
                                    <button
                                        key={r.value}
                                        onClick={() => switchRole(r.value)}
                                        disabled={isCurrent}
                                        style={{
                                            padding: '0.6rem 0.9rem',
                                            borderRadius: '9px',
                                            border: isTarget ? `1.5px solid ${r.color}60` : '1px solid rgba(255,255,255,0.08)',
                                            background: isTarget ? `${r.color}14` : isCurrent ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                                            color: isCurrent ? '#475569' : isTarget ? r.color : '#94a3b8',
                                            fontSize: '0.82rem', fontWeight: isTarget ? '700' : '500',
                                            cursor: isCurrent ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            gap: '0.4rem', transition: 'all 0.18s'
                                        }}
                                        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = `${r.color}18`; }}
                                        onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = isTarget ? `${r.color}14` : 'rgba(255,255,255,0.02)'; }}
                                    >
                                        <span>{r.label}</span>
                                        {isCurrent && <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Current</span>}
                                        {isTarget && !isCurrent && <ArrowRight size={12} />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Quick switch to required role */}
                        <button
                            onClick={() => switchRole(requiredRole)}
                            style={{
                                marginTop: '0.9rem', width: '100%', padding: '0.75rem',
                                background: `linear-gradient(135deg, ${meta.color}22, ${meta.color}10)`,
                                border: `1px solid ${meta.color}40`,
                                borderRadius: '10px', color: meta.color,
                                fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = `${meta.color}28`}
                            onMouseLeave={e => e.currentTarget.style.background = `linear-gradient(135deg, ${meta.color}22, ${meta.color}10)`}
                        >
                            <MetaIcon size={15} />
                            Switch to {meta.label} and Enter
                            <ArrowRight size={15} />
                        </button>
                    </div>

                    {/* Back to Dashboard */}
                    <a href="/dashboard" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                        padding: '0.6rem', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                        color: '#475569', textDecoration: 'none', fontSize: '0.83rem', fontWeight: '500',
                        transition: 'all 0.18s'
                    }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    >
                        <Home size={14} /> Back to Patient Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
