// HealthBridge Operations - Forecasting & Analytics Services

/**
 * Calculates the days of supply remaining for a stock item.
 * If avgDailyConsumption is 0 or negative, it returns Infinity.
 * 
 * @param {number} currentQty 
 * @param {number} avgDailyConsumption 
 * @returns {number} days of supply
 */
export function calculateDaysOfSupply(currentQty, avgDailyConsumption) {
  if (!avgDailyConsumption || avgDailyConsumption <= 0) return Infinity;
  return currentQty / avgDailyConsumption;
}

/**
 * Computes the exponentially smoothed average daily consumption.
 * Formula: S_t = alpha * Y_t + (1 - alpha) * S_{t-1}
 * 
 * @param {number[]} consumptionHistory - Array of daily consumption numbers (chronological)
 * @param {number} alpha - Smoothing factor (default 0.3)
 * @returns {number} Smoothed daily consumption
 */
export function computeExponentialSmoothing(consumptionHistory, alpha = 0.3) {
  if (!consumptionHistory || consumptionHistory.length === 0) return 0;
  
  let smoothed = consumptionHistory[0];
  for (let i = 1; i < consumptionHistory.length; i++) {
    smoothed = alpha * consumptionHistory[i] + (1 - alpha) * smoothed;
  }
  return Number(smoothed.toFixed(2));
}

/**
 * Finds redistribution candidates for a given stock item across all PHCs.
 * Pairs PHCs with deficit (low days of supply) with PHCs with surplus.
 * 
 * @param {Array} allPhcStockForItem - Array of objects: 
 *   { phcId, phcName, districtId, currentQty, avgDailyConsumption, reorderThreshold, itemName }
 * @param {string} itemId - The ID of the item
 * @returns {Array} List of redistribution recommendations
 */
export function findRedistributionCandidates(allPhcStockForItem, itemId) {
  const targetDays = 15; // Deficit PHCs should be brought up to 15 days of supply
  const surplusSafeDays = 20; // Surplus PHCs must retain at least 20 days of supply

  // 1. Calculate days of supply and filter/prepare lists
  const data = allPhcStockForItem.map(phcStock => {
    const dailyCons = phcStock.avgDailyConsumption || 0;
    const daysOfSupply = calculateDaysOfSupply(phcStock.currentQty, dailyCons);
    return {
      ...phcStock,
      daysOfSupply,
      dailyCons
    };
  });

  // Deficits: days of supply < 7 days
  const deficits = data
    .filter(d => d.dailyCons > 0 && d.daysOfSupply < 7)
    .sort((a, b) => a.daysOfSupply - b.daysOfSupply);

  // Surpluses: days of supply > 20 days
  const surpluses = data
    .filter(s => s.dailyCons > 0 && s.daysOfSupply > surplusSafeDays)
    .sort((a, b) => b.daysOfSupply - a.daysOfSupply);

  const recommendations = [];

  // 2. Match deficits with surpluses
  for (const deficit of deficits) {
    const neededQty = Math.max(0, (targetDays * deficit.dailyCons) - deficit.currentQty);
    if (neededQty <= 0) continue;

    let qtyAcquired = 0;

    for (const surplus of surpluses) {
      if (surplus.districtId !== deficit.districtId) continue; // Only redistribute within same district

      const availableSurplus = Math.max(0, surplus.currentQty - (surplusSafeDays * surplus.dailyCons));
      if (availableSurplus <= 0) continue;

      const qtyToTransfer = Math.min(neededQty - qtyAcquired, availableSurplus);
      if (qtyToTransfer > 0) {
        qtyAcquired += qtyToTransfer;
        surplus.currentQty -= qtyToTransfer; // Deduct from surplus candidate for next rounds
        
        recommendations.push({
          fromPhcId: surplus.phcId,
          fromPhcName: surplus.phcName,
          toPhcId: deficit.phcId,
          toPhcName: deficit.phcName,
          itemId,
          itemName: deficit.itemName,
          suggestedQty: Math.round(qtyToTransfer),
          daysOfSupplyFromBefore: Math.round(calculateDaysOfSupply(surplus.currentQty + qtyToTransfer, surplus.dailyCons)),
          daysOfSupplyFromAfter: Math.round(calculateDaysOfSupply(surplus.currentQty, surplus.dailyCons)),
          daysOfSupplyToBefore: Math.round(deficit.daysOfSupply),
          daysOfSupplyToAfter: Math.round(calculateDaysOfSupply(deficit.currentQty + qtyAcquired, deficit.dailyCons))
        });
      }

      if (qtyAcquired >= neededQty) break;
    }
  }

  return recommendations;
}

/**
 * Computes a weighted composite underperformance score for a PHC (0-100 scale, higher = worse).
 * Factors:
 *  - Stockout Frequency (30% weight): Ratio of items below reorder threshold
 *  - Attendance Gap Rate (20% weight): Percentage of scheduled shifts absent or late
 *  - Capacity Overload (25% weight): Footfall relative to capacity (capped at 200% overload)
 *  - Diagnostics Downtime (25% weight): Percentage of diagnostic services down or lacking reagents
 * 
 * @param {Object} data - Input metrics for the PHC:
 *   { stockItems, attendanceLogs, footfall, diagnostics, capacity }
 * @returns {number} Underperformance score (0 to 100)
 */
export function computeUnderperformanceScore({ stockItems = [], attendanceLogs = [], footfall = {}, diagnostics = [], capacity = 50 }) {
  // 1. Stockout Factor (0 to 100)
  let stockoutScore = 0;
  if (stockItems.length > 0) {
    const belowThresholdCount = stockItems.filter(item => item.currentQty <= item.reorderThreshold).length;
    stockoutScore = (belowThresholdCount / stockItems.length) * 100;
  }

  // 2. Attendance Gap Factor (0 to 100)
  let attendanceScore = 0;
  if (attendanceLogs.length > 0) {
    const gapsCount = attendanceLogs.filter(log => log.status === 'absent' || log.status === 'late').length;
    attendanceScore = (gapsCount / attendanceLogs.length) * 100;
  }

  // 3. Overload Factor (0 to 100)
  let overloadScore = 0;
  if (capacity > 0 && footfall && footfall.totalPatients) {
    const ratio = footfall.totalPatients / capacity;
    if (ratio > 1.0) {
      // Over capacity. Scale up to 100, where 2x capacity = 100 score.
      overloadScore = Math.min(100, (ratio - 1.0) * 100);
    }
  }

  // 4. Diagnostics Downtime (0 to 100)
  let diagnosticsScore = 0;
  if (diagnostics.length > 0) {
    const downCount = diagnostics.filter(d => d.status === 'down' || d.status === 'no_reagent').length;
    diagnosticsScore = (downCount / diagnostics.length) * 100;
  }

  // Calculate weighted score
  const score = (stockoutScore * 0.3) + (attendanceScore * 0.2) + (overloadScore * 0.25) + (diagnosticsScore * 0.25);
  return Math.round(score);
}
