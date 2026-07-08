import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration for HealthBridge
// Automatically reads from Vite environment variables, falling back to health-bridge-1aae1 defaults
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDb9JjZ061K-fKCIA8RqEh8FlYpIupRUUs",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "health-bridge-1aae1.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "health-bridge-1aae1",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "health-bridge-1aae1.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1069464653863",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1069464653863:web:1a2b3c4d5e6f7a8b"
};

// Initialize Firebase with full fault-tolerance
let app = null;
let auth = null;
let db = null;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully for project:', firebaseConfig.projectId);
} catch (error) {
    console.warn('⚠️ Firebase initialization failed — running in offline/demo mode:', error.message);
}

export { auth, db };
export default app;
