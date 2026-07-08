import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { adminDb } from './firebaseAdmin.js';
import { seedPHCData } from './seedPHCs.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Seeding Function for Firestore
const seedDoctors = async () => {
    try {
        const doctorsRef = adminDb.collection('doctors');
        const snapshot = await doctorsRef.limit(1).get();

        if (!snapshot.empty) return;

        const mockDoctors = [
            { name: 'Dr. Anjali Deshmukh', specialty: 'General Physician', qualification: 'MBBS, MD', rating: 4.8, distance: 2.5, languages: ['Marathi', 'Hindi', 'English'], image: 'https://ui-avatars.com/api/?name=Anjali+Deshmukh&background=random&color=fff', isFemale: true },
            { name: 'Dr. Rajesh Koothrappali', specialty: 'Dermatologist', qualification: 'MD (Dermatology)', rating: 4.5, distance: 5.0, languages: ['Hindi', 'English'], image: 'https://ui-avatars.com/api/?name=Rajesh+K&background=random&color=fff', isFemale: false },
            { name: 'Dr. Priya Sharma', specialty: 'Pediatrician', qualification: 'MBBS, DCH', rating: 4.9, distance: 1.2, languages: ['Marathi', 'English'], image: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=random&color=fff', isFemale: true },
            { name: 'Dr. Suresh Patil', specialty: 'Cardiologist', qualification: 'DM (Cardiology)', rating: 4.7, distance: 12.5, languages: ['Marathi', 'Hindi'], image: 'https://ui-avatars.com/api/?name=Suresh+Patil&background=random&color=fff', isFemale: false }
        ];

        const batch = adminDb.batch();
        mockDoctors.forEach((doc) => {
            const docRef = doctorsRef.doc();
            batch.set(docRef, { ...doc, id: docRef.id });
        });

        await batch.commit();
        console.log('✅ Firestore Seeded with Mock Doctors');
    } catch (error) {
        console.error('❌ Firestore Seeding Error:', error);
    }
};

const seedHospitals = async () => {
    const hospitalRef = adminDb.collection('hospitals');
    const snapshot = await hospitalRef.get();
    if (!snapshot.empty) return;

    const mockHospitals = [
        { name: "Nagpur Govt Medical College", beds: 45, total: 200, status: "stable" },
        { name: "Mayo Hospital", beds: 12, total: 150, status: "busy" },
        { name: "Kingsway Hospital", beds: 8, total: 120, status: "critical" },
        { name: "Nagpur PHC Rural", beds: 30, total: 50, status: "stable" }
    ];

    const batch = adminDb.batch();
    mockHospitals.forEach(h => {
        const docRef = hospitalRef.doc();
        batch.set(docRef, h);
    });
    await batch.commit();
    console.log('✅ Database Seeded with Mock Hospitals');
};

// Seed on startup
seedDoctors();
seedHospitals();
seedPHCData();

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'HealthBridge API is running with Firebase' });
});

// 1. Get All Doctors
app.get('/api/doctors', async (req, res) => {
    try {
        const snapshot = await adminDb.collection('doctors').get();
        const doctors = [];
        snapshot.forEach(doc => doctors.push({ id: doc.id, ...doc.data() }));
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Book Appointment
app.post('/api/appointments', async (req, res) => {
    try {
        const { doctorId, patientName, date, time } = req.body;
        const newAppointment = {
            doctorId,
            patientName,
            date,
            time,
            status: 'Pending',
            createdAt: new Date().toISOString()
        };
        const docRef = await adminDb.collection('appointments').add(newAppointment);
        res.status(201).json({ id: docRef.id, ...newAppointment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Get All Appointments
app.get('/api/appointments', async (req, res) => {
    try {
        const snapshot = await adminDb.collection('appointments').get();
        const appointments = [];
        for (const doc of snapshot.docs) {
            const appointmentData = doc.data();
            let doctor = null;
            if (appointmentData.doctorId) {
                const doctorDoc = await adminDb.collection('doctors').doc(appointmentData.doctorId).get();
                if (doctorDoc.exists) {
                    doctor = doctorDoc.data();
                }
            }
            appointments.push({ id: doc.id, ...appointmentData, doctorId: doctor || appointmentData.doctorId });
        }
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Update Appointment Status
app.patch('/api/appointments/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const appointmentRef = adminDb.collection('appointments').doc(req.params.id);
        const doc = await appointmentRef.get();

        if (!doc.exists) return res.status(404).json({ message: 'Appointment not found' });

        await appointmentRef.update({ status });
        const updatedDoc = await appointmentRef.get();
        res.json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Prescriptions
app.get('/api/prescriptions', async (req, res) => {
    try {
        const snapshot = await adminDb.collection('prescriptions').orderBy('createdAt', 'desc').get();
        const prescriptions = [];
        snapshot.forEach(doc => prescriptions.push({ id: doc.id, ...doc.data() }));
        res.json(prescriptions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/prescriptions', async (req, res) => {
    try {
        const newPrescription = {
            ...req.body,
            createdAt: new Date().toISOString()
        };
        const docRef = await adminDb.collection('prescriptions').add(newPrescription);
        res.status(201).json({ id: docRef.id, ...newPrescription });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Placeholder for protect middleware (replace with actual implementation)
const protect = (req, res, next) => {
    // In a real application, this would verify a JWT or session token
    // and attach user information to req.user.
    // For this example, we'll mock a user.
    req.user = { id: 'mockUserId123' }; // Mock user ID
    next();
};

// Lab History API
app.get('/api/lab-history', protect, async (req, res) => {
    try {
        const snapshot = await adminDb.collection('users').doc(req.user.id).collection('labHistory').orderBy('date', 'desc').get();
        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/lab-history', protect, async (req, res) => {
    try {
        const { metrics, diagnosis } = req.body;
        const newRecord = {
            metrics,
            diagnosis,
            date: new Date().toISOString()
        };
        await adminDb.collection('users').doc(req.user.id).collection('labHistory').add(newRecord);
        res.status(201).json(newRecord);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
