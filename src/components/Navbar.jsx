import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Menu, X, HeartPulse, Home, LayoutDashboard, Stethoscope,
    FileText, User, Globe, Building2, Hospital, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import ProfileSwitcher from './ProfileSwitcher';

const Navbar = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const { language, setLanguage, t } = useLanguage();

    // Base nav links (always visible when logged in)
    const navLinks = [
        { name: 'Home',         path: '/',              icon: Home },
        { name: 'Dashboard',    path: '/dashboard',     icon: LayoutDashboard },
        { name: 'Find Doctors', path: '/find-doctors',  icon: Stethoscope },
        { name: 'Prescriptions',path: '/prescriptions', icon: FileText },
        { name: 'Profile',      path: '/profile',       icon: User },
    ];

    // Role-specific links
    if (user?.role === 'admin') {
        navLinks.push({ name: 'Admin',        path: '/admin',          icon: ShieldCheck });
    }
    if (user?.role === 'district_admin') {
        navLinks.push({ name: 'District Ops', path: '/district-admin', icon: Building2 });
    }
    if (user?.role === 'phc_staff') {
        navLinks.push({ name: 'PHC Ops',      path: '/phc-staff',      icon: Hospital });
    }
    // Show both ops links to guests/patients for demo navigation
    if (user?.isGuest || user?.role === 'patient') {
        navLinks.push({ name: 'District Ops', path: '/district-admin', icon: Building2 });
        navLinks.push({ name: 'PHC Ops',      path: '/phc-staff',      icon: Hospital });
    }

    const handleRoleChange = (newRole) => {
        const updatedUser = { ...user, role: newRole };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.location.reload();
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
            background: 'rgba(10, 15, 30, 0.85)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)'
        }}>
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px', gap: '1rem' }}>

                {/* ── Logo ── */}
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', flexShrink: 0 }}>
                    <div style={{
                        width: '38px', height: '38px',
                        background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
                        borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 14px rgba(14,165,233,0.45)'
                    }}>
                        <HeartPulse color="white" size={20} />
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.4px', color: '#f1f5f9' }}>
                        Health<span style={{ background: 'linear-gradient(135deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Bridge</span>
                    </span>
                </Link>

                {/* ── Desktop Nav Links ── */}
                <div className="desktop-menu" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1, justifyContent: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const active = isActive(link.path);
                        return (
                            <Link
                                key={link.path + link.name}
                                to={link.path}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                                    padding: '0.4rem 0.75rem',
                                    borderRadius: '8px',
                                    whiteSpace: 'nowrap',
                                    textDecoration: 'none',
                                    fontSize: '0.82rem',
                                    fontWeight: active ? '700' : '500',
                                    color: active ? '#38bdf8' : '#94a3b8',
                                    background: active ? 'rgba(56,189,248,0.1)' : 'transparent',
                                    border: active ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
                                    transition: 'all 0.18s ease',
                                    position: 'relative'
                                }}
                                onMouseEnter={e => {
                                    if (!active) {
                                        e.currentTarget.style.color = '#cbd5e1';
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!active) {
                                        e.currentTarget.style.color = '#94a3b8';
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <Icon size={14} strokeWidth={active ? 2.5 : 2} />
                                {link.name}
                                {active && (
                                    <motion.div
                                        layoutId="nav-underline"
                                        style={{
                                            position: 'absolute', bottom: '-1px', left: '20%', right: '20%', height: '2px',
                                            background: 'linear-gradient(90deg,#38bdf8,#818cf8)',
                                            borderRadius: '2px 2px 0 0'
                                        }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* ── Right Controls ── */}
                <div className="desktop-menu" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>

                    {/* Language Toggle */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer'
                    }}>
                        <Globe size={13} color="#64748b" />
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            style={{
                                background: 'transparent', border: 'none', color: '#cbd5e1',
                                fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', outline: 'none', padding: 0
                            }}
                        >
                            <option value="en" style={{ color: 'black' }}>EN</option>
                            <option value="hi" style={{ color: 'black' }}>HI</option>
                            <option value="mr" style={{ color: 'black' }}>MR</option>
                        </select>
                    </div>

                    {/* Demo Role Switcher */}
                    {user && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            <span style={{ fontSize: '0.68rem', color: '#475569', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Role</span>
                            <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(e.target.value)}
                                style={{
                                    background: 'transparent', border: 'none', color: '#38bdf8',
                                    fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', outline: 'none', padding: 0
                                }}
                            >
                                <option value="patient"        style={{ color: 'black' }}>Patient</option>
                                <option value="doctor"         style={{ color: 'black' }}>Doctor</option>
                                <option value="phc_staff"      style={{ color: 'black' }}>PHC Staff</option>
                                <option value="district_admin" style={{ color: 'black' }}>District Admin</option>
                            </select>
                        </div>
                    )}

                    {/* Profile Avatar */}
                    <ProfileSwitcher />
                </div>

                {/* ── Mobile Toggle ── */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="mobile-toggle"
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'none', padding: '0.25rem' }}
                >
                    {isOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* ── Mobile Menu ── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ background: 'rgba(10,15,30,0.97)', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '1rem 0 1.5rem' }}>
                            {navLinks.map((link) => {
                                const Icon = link.icon;
                                const active = isActive(link.path);
                                return (
                                    <Link
                                        key={link.path + link.name}
                                        to={link.path}
                                        onClick={() => setIsOpen(false)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.75rem 1rem', borderRadius: '10px',
                                            fontSize: '0.95rem', fontWeight: active ? '700' : '500',
                                            color: active ? '#38bdf8' : '#94a3b8',
                                            background: active ? 'rgba(56,189,248,0.1)' : 'transparent',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                                        {link.name}
                                    </Link>
                                );
                            })}

                            {/* Mobile Language */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '0.5rem' }}>
                                <Globe size={18} color="#64748b" />
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.9rem', padding: '0.4rem 0.6rem', flex: 1, outline: 'none' }}
                                >
                                    <option value="en" style={{ color: 'black' }}>English</option>
                                    <option value="hi" style={{ color: 'black' }}>हिंदी</option>
                                    <option value="mr" style={{ color: 'black' }}>मराठी</option>
                                </select>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @media (max-width: 900px) {
                    .desktop-menu { display: none !important; }
                    .mobile-toggle { display: block !important; }
                }
            `}</style>
        </nav>
    );
};

export default Navbar;
