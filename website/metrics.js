/* ============================================
   STACKWISE — Shared Metrics Engine
   Single source of truth for SKU and overview metrics
   ============================================ */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StackwiseMetrics = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MS_PER_DAY = 24 * 60 * 60 * 1000;

  function toNumber(value, fallback) {
    if (fallback === undefined) fallback = 0;
    if (typeof value === 'number' && isFinite(value)) return value;
    if (typeof value === 'string') {
      var trimmed = value.trim();
      if (trimmed === '') return fallback;
      var parsed = Number(trimmed);
      return isFinite(parsed) ? parsed : fallback;
    }
    if (value === null || value === undefined) return fallback;
    var num = Number(value);
    return isFinite(num) ? num : fallback;
  }

  function sanitizeNonNegativeInteger(value, fallback) {
    if (fallback === undefined) fallback = 0;
    var num = toNumber(value, fallback);
    if (!isFinite(num) || num < 0) return fallback;
    return Math.floor(num);
  }

  function normalizeToday(today) {
    if (today instanceof Date && !isNaN(today.getTime())) {
      return new Date(today.getTime());
    }
    var parsed = new Date(today);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return new Date(0);
  }

  function addDays(date, days) {
    return new Date(date.getTime() + days * MS_PER_DAY);
  }

  function getLeadTimeDays(sku, params) {
    if (!params) return 7;
    if (params.usePerSkuLeadTime && params.perSkuLeadTime && params.perSkuLeadTime[sku] !== undefined) {
      return sanitizeNonNegativeInteger(params.perSkuLeadTime[sku], 0);
    }
    return sanitizeNonNegativeInteger(params.globalLeadTime, 7);
  }

  // =========================================
  // PURE CALCULATION FUNCTIONS
  // Single source of truth for each metric.
  // computeSkuMetrics delegates to these.
  // =========================================

  /**
   * Convert a service-level percentage (0–1) to a Z-score.
   * If the value is already > 1, treat it as a raw Z-score.
   */
  function zFromServiceLevel(serviceLevel) {
    if (typeof serviceLevel === 'number' && serviceLevel > 0 && serviceLevel < 1) {
      if (serviceLevel <= 0.90) return 1.28;
      if (serviceLevel <= 0.95) return 1.65;
      if (serviceLevel <= 0.99) return 2.33;
      return 2.58;
    }
    return toNumber(serviceLevel, 1.65);
  }

  function computeSafetyStock(z, sigmaDaily, leadTimeDays) {
    return z * sigmaDaily * Math.sqrt(leadTimeDays);
  }

  /**
   * @param {number} stock
   * @param {number} avgDaily
   * @returns {number} — finite number, Infinity (no demand but stock > 0), or 0
   */
  function computeCoverageDays(stock, avgDaily) {
    if (avgDaily > 0) return stock / avgDaily;
    return stock > 0 ? Infinity : 0;
  }

  function computeReorderQty(targetCoverageDays, avgDaily, safetyStock, currentStock) {
    if (avgDaily <= 0) return { reorderQtyRaw: 0, reorderQty: 0 };
    var raw = Math.max(0, targetCoverageDays * avgDaily + safetyStock - currentStock);
    return { reorderQtyRaw: raw, reorderQty: Math.ceil(raw) };
  }

  function computeLastSafeReorderDate(today, coverageDays, leadTimeDays) {
    if (coverageDays === null || !isFinite(coverageDays)) return null;
    return addDays(today, Math.max(0, coverageDays - leadTimeDays));
  }

  function computeDaysOutOfStock(leadTimeDays, coverageDays) {
    if (coverageDays === null || !isFinite(coverageDays)) return 0;
    return Math.max(0, leadTimeDays - coverageDays);
  }

  function computeLostRevenue(avgDaily, unitPrice, daysOut) {
    if (daysOut <= 0) return 0;
    return avgDaily * unitPrice * daysOut;
  }

  /**
   * @param {number} sigmaDaily
   * @param {number} avgDaily
   * @returns {number|null} — null when avg_daily ≤ 0 (not measurable)
   */
  function computeCV(sigmaDaily, avgDaily) {
    if (avgDaily <= 0) return null;
    return sigmaDaily / avgDaily;
  }

  function computeRisk(coverageDays, leadTimeDays, targetCoverageDays) {
    if (coverageDays === null) return { risk: 'On track', riskTier: 3 };
    if (coverageDays <= 0) return { risk: 'Stockout', riskTier: 0 };
    if (coverageDays < leadTimeDays) return { risk: 'Reorder now', riskTier: 1 };
    if (coverageDays < targetCoverageDays) return { risk: 'Watch', riskTier: 2 };
    return { risk: 'On track', riskTier: 3 };
  }

  function computeOverdue(risk, lastSafeDate, today) {
    if (risk === 'On track') return false;
    if (!lastSafeDate) return false;
    return lastSafeDate < today;
  }

  function computeSkuMetrics(input, params, today) {
    var rows = Array.isArray(input) ? input : [];
    var options = params || {};
    var selectedHorizon = sanitizeNonNegativeInteger(options.horizon, 30);
    var horizon = selectedHorizon > 0 ? selectedHorizon : 30;
    var targetCoverageDays = sanitizeNonNegativeInteger(options.targetCoverageDays, 30);
    var z = toNumber(options.serviceLevelZ, 1.65);
    var stockBySku = options.stockBySku || null;
    var sessionToday = normalizeToday(today);
    var result = [];

    // Normalize stock map keys for case-insensitive, whitespace-tolerant lookup
    var normalizedStockMap = null;
    if (stockBySku !== null && typeof stockBySku === 'object') {
      normalizedStockMap = {};
      for (var sKey in stockBySku) {
        if (Object.prototype.hasOwnProperty.call(stockBySku, sKey)) {
          normalizedStockMap[String(sKey).trim().toUpperCase()] = stockBySku[sKey];
        }
      }
    }

    for (var i = 0; i < rows.length; i++) {
      var item = rows[i] || {};
      var sku = item.sku || '';
      var skuNorm = sku.trim().toUpperCase();
      var horizonKey = 'd' + horizon;
      var forecast = toNumber(item[horizonKey], 0);
      var avgDaily = forecast / horizon;
      var sigmaDaily = item.stdDev !== undefined && item.stdDev !== null ? toNumber(item.stdDev, 0) : avgDaily * 0.3;
      var unitPrice = toNumber(item.price, 0);
      var velocityPct = toNumber(item.velocityPct, 0);
      var leadTimeDays = getLeadTimeDays(sku, options);
      var hasStockMap = normalizedStockMap !== null;
      var hasStockForSku = hasStockMap && Object.prototype.hasOwnProperty.call(normalizedStockMap, skuNorm);
      var stock = hasStockForSku ? sanitizeNonNegativeInteger(normalizedStockMap[skuNorm], 0) : null;

      if (stock === null) {
        result.push({
          item: item,
          sku: sku,
          name: item.name || '',
          stock: null,
          avgDaily: avgDaily,
          stdDevDaily: sigmaDaily,
          cv: computeCV(sigmaDaily, avgDaily),
          leadTimeDays: leadTimeDays,
          targetCoverageDays: targetCoverageDays,
          unitPrice: unitPrice,
          forecast: forecast,
          velocityPct: velocityPct,
          velocityDir: item.velocityDir || 'flat',
          coverageDays: null,
          safetyStock: 0,
          reorderQty: 0,
          lastSafeReorderDate: null,
          daysOutOfStock: 0,
          lostRevenue: 0,
          risk: null,
          riskTier: null,
          overdue: false,
          slowMover: false,
          overstocked: false
        });
        continue;
      }

      var coverageDays = computeCoverageDays(stock, avgDaily);
      var safetyStock = computeSafetyStock(z, sigmaDaily, leadTimeDays);
      var reorderResult = computeReorderQty(targetCoverageDays, avgDaily, safetyStock, stock);
      var reorderQtyRaw = reorderResult.reorderQtyRaw;
      var reorderQty = reorderResult.reorderQty;
      var lastSafeReorderDate = computeLastSafeReorderDate(sessionToday, coverageDays, leadTimeDays);
      var daysOutOfStock = computeDaysOutOfStock(leadTimeDays, coverageDays);
      var lostRevenue = computeLostRevenue(avgDaily, unitPrice, daysOutOfStock);
      var cv = computeCV(sigmaDaily, avgDaily);
      var riskResult = computeRisk(coverageDays, leadTimeDays, targetCoverageDays);
      var risk = riskResult.risk;
      var riskTier = riskResult.riskTier;
      var overdue = computeOverdue(risk, lastSafeReorderDate, sessionToday);
      var slowMover = velocityPct < 0;
      var overstocked = coverageDays !== null && coverageDays > targetCoverageDays;

      result.push({
        item: item,
        sku: sku,
        name: item.name || '',
        stock: stock,
        avgDaily: avgDaily,
        stdDevDaily: sigmaDaily,
        cv: cv,
        leadTimeDays: leadTimeDays,
        targetCoverageDays: targetCoverageDays,
        unitPrice: unitPrice,
        forecast: forecast,
        velocityPct: velocityPct,
        velocityDir: item.velocityDir || 'flat',
        coverageDays: coverageDays,
        safetyStock: safetyStock,
        reorderQtyRaw: reorderQtyRaw,
        reorderQty: reorderQty,
        lastSafeReorderDate: lastSafeReorderDate,
        daysOutOfStock: daysOutOfStock,
        lostRevenue: lostRevenue,
        risk: risk,
        riskTier: riskTier,
        overdue: overdue,
        slowMover: slowMover,
        overstocked: overstocked
      });
    }

    return result;
  }

  function computeOverviewMetrics(skuMetrics, params) {
    var rows = Array.isArray(skuMetrics) ? skuMetrics : [];
    var options = params || {};
    var monetaryBasis = options.monetaryBasis === 'unit_cost' ? 'unit_cost' : 'unit_price';

    var skusAtRisk = 0;
    var overdueReorders = 0;
    var coverageSum = 0;
    var coverageCount = 0;
    var totalLostRevenue = 0;
    var capitalInSlowMovers = 0;
    var capitalInOverstocked = 0;

    for (var i = 0; i < rows.length; i++) {
      var m = rows[i];
      if (!m || m.stock === null) continue;

      if (m.risk !== 'On track') skusAtRisk++;
      if (m.overdue) overdueReorders++;

      if (m.avgDaily > 0 && m.coverageDays !== Infinity && m.coverageDays !== null) {
        coverageSum += m.coverageDays;
        coverageCount++;
      }

      totalLostRevenue += toNumber(m.lostRevenue, 0);

      var basisValue = monetaryBasis === 'unit_cost'
        ? toNumber(m.unitCost, 0)
        : toNumber(m.unitPrice, 0);
      if (m.slowMover) {
        capitalInSlowMovers += m.stock * basisValue;
      }
      if (m.overstocked) {
        capitalInOverstocked += m.stock * basisValue;
      }
    }

    return {
      skusAtRisk: skusAtRisk,
      overdueReorders: overdueReorders,
      avgCoverage: coverageCount > 0 ? Math.round(coverageSum / coverageCount) : 0,
      totalLostRevenue: totalLostRevenue,
      capitalInSlowMovers: capitalInSlowMovers,
      capitalInOverstocked: capitalInOverstocked,
      monetaryBasis: monetaryBasis,
      overdueSubtitle: overdueReorders === 0
        ? 'No overdue reorders'
        : 'Last safe reorder date has already passed'
    };
  }

  /**
   * Parse stock input entries with SKU normalization, duplicate handling,
   * and value validation. Duplicates: last occurrence wins.
   * @param {Array<{sku: string, stock: *}>} entries
   * @returns {{ stockBySku: Object, warnings: Array }}
   */
  function parseStockInput(entries) {
    var result = { stockBySku: {}, warnings: [] };
    if (!Array.isArray(entries)) return result;

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i] || {};
      var rawSku = typeof entry.sku === 'string' ? entry.sku.trim() : String(entry.sku == null ? '' : entry.sku).trim();

      if (!rawSku) {
        result.warnings.push({ row: i + 1, type: 'empty_sku', message: 'Empty SKU, skipped' });
        continue;
      }

      var normalizedKey = rawSku.toUpperCase();

      // Validate stock value
      var rawStock = entry.stock;
      var stockVal = sanitizeNonNegativeInteger(rawStock, 0);
      if (rawStock !== undefined && rawStock !== null && rawStock !== '') {
        var numCheck = toNumber(rawStock, NaN);
        if (numCheck !== numCheck || numCheck < 0) { // NaN check: NaN !== NaN
          result.warnings.push({ row: i + 1, type: 'invalid_stock', sku: rawSku, message: 'Invalid stock value, treated as 0' });
        }
      }

      // Duplicate handling — last occurrence wins
      if (Object.prototype.hasOwnProperty.call(result.stockBySku, normalizedKey)) {
        result.warnings.push({ row: i + 1, type: 'duplicate', sku: rawSku, message: 'Duplicate SKU, last occurrence used' });
      }

      result.stockBySku[normalizedKey] = stockVal;
    }

    return result;
  }

  /**
   * Format coverage days for display. Never returns raw Infinity or NaN.
   * Math layer uses Infinity for "no demand, stock > 0"; display shows "—".
   * @param {number|null} coverageDays
   * @returns {string}
   */
  function formatCoverageDays(coverageDays) {
    if (coverageDays === null || coverageDays === undefined) return '—';
    if (typeof coverageDays !== 'number' || !isFinite(coverageDays)) return '—';
    if (coverageDays !== coverageDays) return '—'; // NaN
    return Math.round(coverageDays) + 'd';
  }

  /**
   * Format coefficient of variation for display.
   * Math layer uses null for "not measurable (no demand)"; display shows "—".
   * @param {number|null} cv
   * @returns {string}
   */
  function formatCV(cv) {
    if (cv === null || cv === undefined) return '—';
    if (typeof cv !== 'number' || !isFinite(cv)) return '—';
    return cv.toFixed(2);
  }

  return {
    computeSkuMetrics: computeSkuMetrics,
    computeOverviewMetrics: computeOverviewMetrics,
    sanitizeNonNegativeInteger: sanitizeNonNegativeInteger,
    normalizeToday: normalizeToday,
    toNumber: toNumber,
    addDays: addDays,
    zFromServiceLevel: zFromServiceLevel,
    computeSafetyStock: computeSafetyStock,
    computeCoverageDays: computeCoverageDays,
    computeReorderQty: computeReorderQty,
    computeLastSafeReorderDate: computeLastSafeReorderDate,
    computeDaysOutOfStock: computeDaysOutOfStock,
    computeLostRevenue: computeLostRevenue,
    computeCV: computeCV,
    computeRisk: computeRisk,
    computeOverdue: computeOverdue,
    parseStockInput: parseStockInput,
    formatCoverageDays: formatCoverageDays,
    formatCV: formatCV
  };
});
