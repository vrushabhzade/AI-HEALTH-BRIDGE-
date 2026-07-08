import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // AUTO-LOGIN BYPASS
        // We check if a user is already cached, otherwise we create a Guest session automatically.
        // This removes the need for the Sign-In page.

        const initAuth = async () => {
            try {
                // Set a timeout to prevent infinite loading
                const timeoutId = setTimeout(() => {
                    console.warn('⚠️ Auth initialization timeout - proceeding with guest user');
                    const guestUser = {
                        uid: "guest-user-123",
                        email: "guest@nagpur-health.com",
                        name: "Guest User",
                        role: "patient",
                        isGuest: true
                    };
                    setUser(guestUser);
                    localStorage.setItem('user', JSON.stringify(guestUser));
                    setLoading(false);
                }, 10000); // 10 second timeout

                // 1. Check if we have a real Firebase user (optional, if they did sign in before)
                const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                    clearTimeout(timeoutId); // Clear timeout if auth resolves

                    if (firebaseUser) {
                        try {
                            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                            if (userDoc.exists()) {
                                const userData = userDoc.data();
                                const finalUser = {
                                    uid: firebaseUser.uid,
                                    email: firebaseUser.email,
                                    displayName: firebaseUser.displayName,
                                    ...userData
                                };
                                setUser(finalUser);
                                localStorage.setItem('user', JSON.stringify(finalUser));
                            } else {
                                // Fallback if doc missing
                                setUser(firebaseUser);
                            }
                        } catch (e) {
                            console.warn("Error fetching user profile", e);
                            setUser(firebaseUser);
                        }
                    } else {
                        // NO REAL USER -> Check localStorage for persisted demo session (role switcher)
                        const cachedUserRaw = localStorage.getItem('user');
                        if (cachedUserRaw) {
                            try {
                                const cachedUser = JSON.parse(cachedUserRaw);
                                console.log("⚡ Restoring cached demo session:", cachedUser.role);
                                setUser(cachedUser);
                            } catch (e) {
                                localStorage.removeItem('user');
                                const guestUser = { uid: "guest-user-123", email: "guest@nagpur-health.com", name: "Guest User", role: "patient", isGuest: true };
                                setUser(guestUser);
                                localStorage.setItem('user', JSON.stringify(guestUser));
                            }
                        } else {
                            console.log("⚡ Auto-logging in as Guest/Demo User");
                            const guestUser = { uid: "guest-user-123", email: "guest@nagpur-health.com", name: "Guest User", role: "patient", isGuest: true };
                            setUser(guestUser);
                            localStorage.setItem('user', JSON.stringify(guestUser));
                        }
                    }
                    setLoading(false);
                });
                return unsubscribe;
            } catch (error) {
                console.error('Auth initialization error:', error);
                // Fallback to guest user on error
                const guestUser = {
                    uid: "guest-user-123",
                    email: "guest@nagpur-health.com",
                    name: "Guest User",
                    role: "patient",
                    isGuest: true
                };
                setUser(guestUser);
                localStorage.setItem('user', JSON.stringify(guestUser));
                setLoading(false);
            }
        };

        const unsubscribePromise = initAuth();

        // Cleanup not strictly necessary for the one-shot effect but good practice if we stored the unsubscribe function
        // For simplicity in this auto-login refactor, we just let it run.
    }, []);

    const login = async (email, password) => {
        try {
            setError(null);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Login failed. Please try again.';

            // Provide user-friendly error messages
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email. Please register first.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password. Please try again.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address format.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection.';
            }

            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    };

    const register = async (userData) => {
        const { email, password, name, role, phone } = userData;
        try {
            setError(null);
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update profile
            await updateProfile(user, { displayName: name });

            // Store extra info in Firestore
            const newUser = {
                uid: user.uid,
                name,
                email,
                role,
                phone,
                createdAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'users', user.uid), newUser);

            return { success: true, user };
        } catch (error) {
            console.error('Registration error:', error);
            let errorMessage = 'Registration failed. Please try again.';

            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered. Please login instead.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Use at least 6 characters.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address format.';
            }

            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            localStorage.removeItem('user');
        } catch (error) {
            console.error('Logout error:', error);
            setError('Failed to logout. Please try again.');
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, loading, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
