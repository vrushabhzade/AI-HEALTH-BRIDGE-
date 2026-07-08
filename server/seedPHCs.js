// Firestore Seeding Script for PHC/CHC Operations
import { adminDb } from './firebaseAdmin.js';

export const seedPHCData = async () => {
    try {
        console.log('🌱 Starting PHC Operations data seeding...');

        const districtsRef = adminDb.collection('districts');
        const phcsRef = adminDb.collection('phcs');
        const alertsRef = adminDb.collection('alerts');

        // Check if phcs are already seeded
        const phcSnapshot = await phcsRef.limit(1).get();
        if (!phcSnapshot.empty) {
            console.log('✅ PHC data already exists. Skipping seeding.');
            return;
        }

        // 1. Seed District
        const districtId = 'nagpur_district';
        await districtsRef.doc(districtId).set({
            name: 'Nagpur District',
            state: 'Maharashtra',
            adminUserIds: ['district-admin-123', 'guest-user-123'] // mapping guest user for easy demoing
        });
        console.log('  - Seeded District:', districtId);

        // 2. Define Mock PHCs
        const mockPHCs = [
            {
                id: 'ramtek_phc',
                name: 'Ramtek Primary Health Centre',
                districtId: districtId,
                type: 'PHC',
                location: { lat: 21.3977, lng: 79.3283 },
                capacity: 40,
                contactNumber: '+91 7114 255101'
            },
            {
                id: 'kamptee_chc',
                name: 'Kamptee Community Health Centre',
                districtId: districtId,
                type: 'CHC',
                location: { lat: 21.2231, lng: 79.2012 },
                capacity: 100,
                contactNumber: '+91 7109 288302'
            },
            {
                id: 'kalmeshwar_phc',
                name: 'Kalmeshwar Primary Health Centre',
                districtId: districtId,
                type: 'PHC',
                location: { lat: 21.2335, lng: 78.9194 },
                capacity: 35,
                contactNumber: '+91 7118 271203'
            }
        ];

        // 3. Populate subcollections per PHC
        const now = new Date();
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            dates.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
        }

        // Seed each PHC
        for (const phc of mockPHCs) {
            const { id: phcId, ...phcDetails } = phc;
            await phcsRef.doc(phcId).set(phcDetails);
            console.log(`  - Seeded PHC details for: ${phcId}`);

            // Subcollection A: Stock Items
            const stockRef = phcsRef.doc(phcId).collection('stock');
            let mockStock = [];

            if (phcId === 'ramtek_phc') {
                mockStock = [
                    { id: 'paracetamol', itemName: 'Paracetamol 650mg', category: 'Analgesics', currentQty: 120, unit: 'tablets', reorderThreshold: 500, avgDailyConsumption: 80, lastRestocked: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: '2027-12-31', criticalFlag: true },
                    { id: 'amoxicillin', itemName: 'Amoxicillin 500mg', category: 'Antibiotics', currentQty: 800, unit: 'capsules', reorderThreshold: 200, avgDailyConsumption: 40, lastRestocked: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: '2027-06-30', criticalFlag: false },
                    { id: 'ors_packet', itemName: 'ORS Packet (Oral Rehydration)', category: 'Dehydration', currentQty: 50, unit: 'sachets', reorderThreshold: 100, avgDailyConsumption: 15, lastRestocked: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: '2027-08-31', criticalFlag: true }
                ];
            } else if (phcId === 'kamptee_chc') {
                mockStock = [
                    { id: 'paracetamol', itemName: 'Paracetamol 650mg', category: 'Analgesics', currentQty: 5000, unit: 'tablets', reorderThreshold: 1000, avgDailyConsumption: 100, lastRestocked: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: '2028-01-15', criticalFlag: false },
                    { id: 'amoxicillin', itemName: 'Amoxicillin 500mg', category: 'Antibiotics', currentQty: 150, unit: 'capsules', reorderThreshold: 300, avgDailyConsumption: 50, lastRestocked: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: '2027-05-15', criticalFlag: true },
                    { id: 'ors_packet', itemName: 'ORS Packet (Oral Rehydration)', category: 'Dehydration', currentQty: 1200, unit: 'sachets', reorderThreshold: 200, avgDailyConsumption: 30, lastRestocked: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: '2028-03-20', criticalFlag: false }
                ];
            } else {
                mockStock = [
                    { id: 'paracetamol', itemName: 'Paracetamol 650mg', category: 'Analgesics', currentQty: 1200, unit: 'tablets', reorderThreshold: 300, avgDailyConsumption: 60, lastRestocked: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: '2027-11-20', criticalFlag: false },
                    { id: 'amoxicillin', itemName: 'Amoxicillin 500mg', category: 'Antibiotics', currentQty: 400, unit: 'capsules', reorderThreshold: 150, avgDailyConsumption: 30, lastRestocked: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: '2027-09-10', criticalFlag: false },
                    { id: 'ors_packet', itemName: 'ORS Packet (Oral Rehydration)', category: 'Dehydration', currentQty: 10, unit: 'sachets', reorderThreshold: 50, avgDailyConsumption: 8, lastRestocked: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: '2027-04-10', criticalFlag: true }
                ];
            }

            for (const item of mockStock) {
                const { id: itemId, ...itemDetails } = item;
                await stockRef.doc(itemId).set(itemDetails);

                // Subcollection B: Stock Logs (last 5 days)
                const stockLogsRef = phcsRef.doc(phcId).collection('stockLogs');
                for (let j = 0; j < 5; j++) {
                    const logDate = dates[j];
                    const randomConsumption = Math.round(itemDetails.avgDailyConsumption * (0.8 + Math.random() * 0.4));
                    await stockLogsRef.add({
                        itemId,
                        date: logDate,
                        qtyConsumed: randomConsumption,
                        qtyReceived: j === 3 ? Math.round(itemDetails.avgDailyConsumption * 10) : 0, // mock restock 3 days ago
                        loggedBy: 'phc_staff_demo'
                    });
                }
            }

            // Subcollection C: Footfall (last 7 days)
            const footfallRef = phcsRef.doc(phcId).collection('footfall');
            for (const logDate of dates) {
                let basePatients = 30;
                if (phcId === 'ramtek_phc') basePatients = 48; // Overload scenario (capacity = 40)
                if (phcId === 'kamptee_chc') basePatients = 75; // Stable scenario (capacity = 100)

                const variance = Math.round((Math.random() - 0.5) * 15);
                const total = Math.max(10, basePatients + variance);
                
                await footfallRef.doc(logDate).set({
                    totalPatients: total,
                    byDepartment: {
                        general: Math.round(total * 0.5),
                        maternal: Math.round(total * 0.15),
                        emergency: Math.round(total * 0.1),
                        pediatrics: Math.round(total * 0.25)
                    },
                    peakHour: '10:00 - 12:00',
                    loggedBy: 'phc_staff_demo'
                });
            }

            // Subcollection D: Attendance (last 5 days for 3 doctors)
            const attendanceRef = phcsRef.doc(phcId).collection('attendance');
            const mockDoctors = [
                { id: 'doc1', name: 'Dr. Anjali Deshmukh' },
                { id: 'doc2', name: 'Dr. Rajesh Koothrappali' },
                { id: 'doc3', name: 'Dr. Priya Sharma' }
            ];

            for (const docInfo of mockDoctors) {
                for (let j = 0; j < 5; j++) {
                    const logDate = dates[j];
                    let status = 'present';
                    let checkIn = '09:05 AM';
                    let checkOut = '05:00 PM';
                    let reason = '';

                    // Introduce high absence for Dr. Rajesh Koothrappali at Ramtek PHC to trigger attendance gaps
                    if (phcId === 'ramtek_phc' && docInfo.id === 'doc2') {
                        if (j === 0 || j === 2) {
                            status = 'absent';
                            checkIn = '';
                            checkOut = '';
                            reason = 'Medical Leave';
                        } else if (j === 4) {
                            status = 'late';
                            checkIn = '10:30 AM';
                        }
                    }

                    await attendanceRef.doc(`${logDate}_${docInfo.id}`).set({
                        doctorId: docInfo.id,
                        doctorName: docInfo.name,
                        date: logDate,
                        scheduledShift: '09:00 AM - 05:00 PM',
                        checkInTime: checkIn,
                        checkOutTime: checkOut,
                        status: status,
                        reasonIfAbsent: reason,
                        loggedBy: 'phc_staff_demo'
                    });
                }
            }

            // Subcollection E: Diagnostics tests
            const diagnosticsRef = phcsRef.doc(phcId).collection('diagnostics');
            const tests = [
                { id: 'xray', testName: 'Chest X-Ray', equipmentRequired: 'X-Ray Machine', status: 'functional', lastAuditDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), auditedBy: 'phc_staff_demo' },
                { id: 'ecg', testName: 'ECG Analysis', equipmentRequired: 'ECG Monitor', status: phcId === 'kalmeshwar_phc' ? 'down' : 'functional', lastAuditDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), auditedBy: 'phc_staff_demo' },
                { id: 'blood_test', testName: 'CBC Blood Test', equipmentRequired: 'Hematology Analyzer', status: phcId === 'ramtek_phc' ? 'no_reagent' : 'functional', lastAuditDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), auditedBy: 'phc_staff_demo' }
            ];

            for (const test of tests) {
                const { id: testId, ...testDetails } = test;
                await diagnosticsRef.doc(testId).set(testDetails);
            }

            // Subcollection F: Bed Status
            const bedsRef = phcsRef.doc(phcId).collection('beds');
            let bedStatus = {
                total: phcDetails.capacity,
                occupied: Math.round(phcDetails.capacity * 0.6),
                icuTotal: phcDetails.type === 'CHC' ? 10 : 2,
                icuOccupied: phcDetails.type === 'CHC' ? 4 : 1,
                lastUpdated: now.toISOString()
            };

            if (phcId === 'ramtek_phc') {
                bedStatus.occupied = 38; // 38 occupied out of 40 capacity (Critical!)
                bedStatus.icuOccupied = 2; // 2 out of 2 ICU (Critical!)
            }

            await bedsRef.doc('current').set(bedStatus);
        }

        // 4. Seed Alerts
        const mockAlerts = [
            {
                id: 'alert_1',
                phcId: 'ramtek_phc',
                phcName: 'Ramtek Primary Health Centre',
                districtId: districtId,
                type: 'stockout_warning',
                severity: 'high',
                message: 'Paracetamol 650mg is critically low at Ramtek Primary Health Centre. Only 1.5 days of supply remaining.',
                aiRecommendation: 'PHC Ramtek will stock out of Paracetamol in ~1.5 days. CHC Kamptee has 50 days\' surplus — recommend redistributing 500 units.',
                createdAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
                resolvedAt: null,
                status: 'active'
            },
            {
                id: 'alert_2',
                phcId: 'ramtek_phc',
                phcName: 'Ramtek Primary Health Centre',
                districtId: districtId,
                type: 'attendance_gap',
                severity: 'medium',
                message: 'Dr. Rajesh Koothrappali has exceeded the 15% absence threshold (40% absence rate detected).',
                aiRecommendation: 'Request explanation for shift absences on 2026-07-06 and 2026-07-04. Recommend adjusting scheduled shifts or routing emergency coverage from Kalmeshwar PHC.',
                createdAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
                resolvedAt: null,
                status: 'active'
            },
            {
                id: 'alert_3',
                phcId: 'kalmeshwar_phc',
                phcName: 'Kalmeshwar Primary Health Centre',
                districtId: districtId,
                type: 'diagnostics_critical',
                severity: 'high',
                message: 'ECG Analysis equipment is DOWN at Kalmeshwar Primary Health Centre.',
                aiRecommendation: 'Dispatch biomedical technician from Nagpur central workshop immediately. Reroute cardiac referrals to Kamptee CHC (12km away) until ECG is functional.',
                createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
                resolvedAt: null,
                status: 'active'
            }
        ];

        for (const alert of mockAlerts) {
            const { id: alertId, ...alertDetails } = alert;
            await alertsRef.doc(alertId).set(alertDetails);
        }

        console.log('✅ Seeding complete!');

    } catch (error) {
        console.error('❌ Seeding Error:', error);
    }
};
