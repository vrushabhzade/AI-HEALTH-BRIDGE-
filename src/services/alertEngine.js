// HealthBridge Operations - Real-time Alert & Escalation Engine
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, query, where, doc, getDoc } from 'firebase/firestore';
import { calculateDaysOfSupply, findRedistributionCandidates, computeUnderperformanceScore } from './forecast';
import { generateOpsRecommendation } from './ai';

/**
 * Scans all PHCs and writes operational alerts (stockout, attendance gap, diagnostics, bed critical, underperforming)
 * directly to the 'alerts' collection in Firestore if they don't already exist or need updating.
 */
export async function runAlertEngine(language = 'en') {
    try {
        console.log('⚡ Starting Alert Engine scan...');
        const phcsRef = collection(db, 'phcs');
        const phcsSnapshot = await getDocs(phcsRef);
        const phcs = [];

        // Fetch all PHCs
        for (const phcDoc of phcsSnapshot.docs) {
            phcs.push({ id: phcDoc.id, ...phcDoc.data() });
        }

        // Fetch active alerts to avoid duplicates
        const alertsRef = collection(db, 'alerts');
        const activeAlertsQuery = query(alertsRef, where('status', '==', 'active'));
        const activeAlertsSnapshot = await getDocs(activeAlertsQuery);
        const activeAlerts = activeAlertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Gather all stock items across Nagpur for redistribution candidates
        const allStockItems = [];
        for (const phc of phcs) {
            const stockSnapshot = await getDocs(collection(db, 'phcs', phc.id, 'stock'));
            stockSnapshot.forEach(sDoc => {
                allStockItems.push({
                    phcId: phc.id,
                    phcName: phc.name,
                    districtId: phc.districtId,
                    itemId: sDoc.id,
                    ...sDoc.data()
                });
            });
        }

        // Process alert generation per PHC
        for (const phc of phcs) {
            // A. FETCH SUBCOLLECTION DATA
            // 1. Stock
            const stockItems = allStockItems.filter(item => item.phcId === phc.id);

            // 2. Attendance
            const attendanceSnapshot = await getDocs(collection(db, 'phcs', phc.id, 'attendance'));
            const attendanceLogs = attendanceSnapshot.docs.map(doc => doc.data());

            // 3. Diagnostics
            const diagnosticsSnapshot = await getDocs(collection(db, 'phcs', phc.id, 'diagnostics'));
            const diagnostics = diagnosticsSnapshot.docs.map(doc => doc.data());

            // 4. Bed Status
            const bedDocSnap = await getDoc(doc(db, 'phcs', phc.id, 'beds', 'current'));
            const bedStatus = bedDocSnap.exists() ? bedDocSnap.data() : { total: phc.capacity, occupied: 0, icuTotal: 0, icuOccupied: 0 };

            // 5. Footfall (latest day)
            const footfallSnapshot = await getDocs(collection(db, 'phcs', phc.id, 'footfall'));
            const footfallLogs = footfallSnapshot.docs.map(doc => doc.data());
            const latestFootfall = footfallLogs.sort((a, b) => new Date(b.date) - new Date(a.date))[0] || { totalPatients: 0 };

            // B. RUN DETECTIVE CHECKS
            
            // 1. STOCK MONITORING
            for (const item of stockItems) {
                const daysOfSupply = calculateDaysOfSupply(item.currentQty, item.avgDailyConsumption);
                const hasExistingAlert = activeAlerts.some(a => a.phcId === phc.id && a.type === 'stockout_warning' && a.itemId === item.itemId);

                if (daysOfSupply < 5 && !hasExistingAlert) {
                    console.log(`⚠️ Stockout threat: PHC ${phc.name} is low on ${item.itemName} (${daysOfSupply.toFixed(1)} days left)`);

                    // Look for same-item stocks for redistribution candidate
                    const itemStocks = allStockItems.filter(s => s.itemId === item.itemId);
                    const redistributionOptions = findRedistributionCandidates(itemStocks, item.itemId);
                    
                    // Filter recommendations targetted to this PHC
                    const recommendationForPhc = redistributionOptions.find(r => r.toPhcId === phc.id);

                    // Call AI service for natural language card text
                    const aiRecommendationText = await generateOpsRecommendation({
                        phcName: phc.name,
                        itemName: item.itemName,
                        daysOfSupply: Math.round(daysOfSupply),
                        redistributionCandidate: recommendationForPhc,
                        language
                    });

                    // Add alert doc
                    await addDoc(collection(db, 'alerts'), {
                        phcId: phc.id,
                        phcName: phc.name,
                        districtId: phc.districtId,
                        type: 'stockout_warning',
                        itemId: item.itemId,
                        severity: daysOfSupply <= 2 ? 'high' : 'medium',
                        message: `${item.itemName} is critically low. Only ${daysOfSupply.toFixed(1)} days of supply remaining (${item.currentQty} ${item.unit} left).`,
                        aiRecommendation: aiRecommendationText,
                        createdAt: new Date().toISOString(),
                        resolvedAt: null,
                        status: 'active'
                    });
                }
            }

            // 2. DOCTOR ATTENDANCE
            const doctorAbsences = {};
            const doctorTotals = {};
            const doctorNames = {};
            attendanceLogs.forEach(log => {
                if (!doctorTotals[log.doctorId]) {
                    doctorTotals[log.doctorId] = 0;
                    doctorAbsences[log.doctorId] = 0;
                    doctorNames[log.doctorId] = log.doctorName;
                }
                doctorTotals[log.doctorId]++;
                if (log.status === 'absent') {
                    doctorAbsences[log.doctorId]++;
                }
            });

            for (const doctorId in doctorTotals) {
                const totalShifts = doctorTotals[doctorId];
                const absences = doctorAbsences[doctorId];
                const absenceRate = totalShifts > 0 ? (absences / totalShifts) * 100 : 0;
                
                const hasExistingAlert = activeAlerts.some(a => a.phcId === phc.id && a.type === 'attendance_gap' && a.doctorId === doctorId);

                if (absenceRate > 15 && !hasExistingAlert) {
                    const docName = doctorNames[doctorId];
                    const alertMsg = `Dr. ${docName} has exceeded the 15% absence threshold (${Math.round(absenceRate)}% absence rate detected in last 5 shifts).`;
                    
                    const aiRec = language === 'hi'
                        ? `डॉ. ${docName} से अनुपस्थिति का स्पष्टीकरण मांगें। आपातकालीन बैकअप के लिए नागपुर सिविल अस्पताल से डॉक्टर का प्रबंध करें।`
                        : language === 'mr'
                        ? `डॉ. ${docName} कडून गैरहजेरीचे स्पष्टीकरण मागा. नागपूर जिल्हा रुग्णालयातून पर्यायी डॉक्टर तैनात करा.`
                        : `Request doctor explanation for shift absences. Recommend adjusting shift schedule or requesting coverage from Nagpur General Hospital.`;

                    await addDoc(collection(db, 'alerts'), {
                        phcId: phc.id,
                        phcName: phc.name,
                        districtId: phc.districtId,
                        type: 'attendance_gap',
                        doctorId: doctorId,
                        severity: 'medium',
                        message: alertMsg,
                        aiRecommendation: aiRec,
                        createdAt: new Date().toISOString(),
                        resolvedAt: null,
                        status: 'active'
                    });
                }
            }

            // 3. BED AVAILABILITY
            const bedOccupancyRate = bedStatus.total > 0 ? (bedStatus.occupied / bedStatus.total) : 0;
            const icuOccupancyRate = bedStatus.icuTotal > 0 ? (bedStatus.icuOccupied / bedStatus.icuTotal) : 0;
            const hasExistingBedAlert = activeAlerts.some(a => a.phcId === phc.id && a.type === 'bed_critical');

            if ((bedOccupancyRate > 0.9 || icuOccupancyRate > 0.9) && !hasExistingBedAlert) {
                const alertMsg = `${phc.name} has reached critical bed capacity (${bedStatus.occupied}/${bedStatus.total} General beds, ${bedStatus.icuOccupied}/${bedStatus.icuTotal} ICU beds occupied).`;
                
                const aiRec = language === 'hi'
                    ? `बेड क्षमता संकट! नए मरीजों को निकटतम सीएचसी कामठी में भेजें। केंद्रीय नियंत्रण कक्ष को अतिरिक्त पोर्टेबल बेड आवंटित करने का निर्देश दें।`
                    : language === 'mr'
                    ? `बेड क्षमता टंचाई! नवीन रुग्णांना कामठी सीएचसी मध्ये हलवा. अतिरिक्त खाटांची व्यवस्था करण्यासाठी नागपूर नियंत्रण कक्षाला कळवा.`
                    : `Critical occupancy reached. Recommend rerouting non-emergency patient intake to Kamptee CHC and alerting emergency response for backup bed logistics.`;

                await addDoc(collection(db, 'alerts'), {
                    phcId: phc.id,
                    phcName: phc.name,
                    districtId: phc.districtId,
                    type: 'bed_critical',
                    severity: 'high',
                    message: alertMsg,
                    aiRecommendation: aiRec,
                    createdAt: new Date().toISOString(),
                    resolvedAt: null,
                    status: 'active'
                });
            }

            // 4. COMPOSITE UNDERPERFORMANCE SCORE
            const score = computeUnderperformanceScore({
                stockItems,
                attendanceLogs,
                footfall: latestFootfall,
                diagnostics,
                capacity: phc.capacity
            });

            const hasExistingPerfAlert = activeAlerts.some(a => a.phcId === phc.id && a.type === 'underperforming');

            if (score > 40 && !hasExistingPerfAlert) {
                const alertMsg = `${phc.name} is flagged for underperformance (Composite score: ${score}/100).`;
                
                const aiRec = language === 'hi'
                    ? `नियमित चिकित्सा आपूर्ति श्रृंखला, बायोमेडिकल मशीनरी का ऑडिट और प्रशासनिक स्टाफ समीक्षा की सिफारिश की जाती है। नागपुर जिला प्रशासक द्वारा केंद्र का दौरा आवश्यक है।`
                    : language === 'mr'
                    ? `औषध पुरवठा, वैद्यकीय उपकरणांची तपासणी आणि प्रशासकीय ऑडिटची शिफारस केली जाते. नागपूर जिल्हा आरोग्य अधिकाऱ्यांनी तात्काळ भेट द्यावी.`
                    : `Flagged center underperformance. Recommend an on-site operational audit by District Health Officers. Focus on medicine distribution delays, doctor rosters, and diagnostics downtime.`;

                await addDoc(collection(db, 'alerts'), {
                    phcId: phc.id,
                    phcName: phc.name,
                    districtId: phc.districtId,
                    type: 'underperforming',
                    severity: score > 60 ? 'high' : 'medium',
                    message: alertMsg,
                    aiRecommendation: aiRec,
                    createdAt: new Date().toISOString(),
                    resolvedAt: null,
                    status: 'active'
                });
            }
        }

        console.log('✅ Alert Engine scan finished successfully.');
    } catch (err) {
        console.error('❌ Alert Engine Execution Error:', err);
    }
}
