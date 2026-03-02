/* ============================================
   STACKWISE — Deterministic Consistency Tests
   Run in browser console after loading try.html
   or via: node tests.js
   ============================================ */

(function () {
  'use strict';

  var metrics = (typeof module === 'object' && module.exports)
    ? require('./metrics.js')
    : (typeof window !== 'undefined' ? window.StackwiseMetrics : null);

  if (!metrics) {
    throw new Error('StackwiseMetrics module not found.');
  }

  var log = (typeof console !== 'undefined' && console.log) ? function (s) { console.log(s); } : function () {};
  var error = (typeof console !== 'undefined' && console.error) ? function (s) { console.error(s); } : log;

  var passed = 0;
  var failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      return;
    }
    failed++;
    error('[FAIL] ' + message);
  }

  function assertEq(actual, expected, message) {
    assert(actual === expected, message + ' — expected: ' + expected + ', got: ' + actual);
  }

  function assertNear(actual, expected, epsilon, message) {
    assert(Math.abs(actual - expected) < epsilon, message + ' — expected ~' + expected + ', got: ' + actual);
  }

  function testCase(label, fn) {
    try {
      fn();
      log('[PASS] ' + label);
    } catch (err) {
      failed++;
      error('[FAIL] ' + label + ' — ' + err.message);
    }
  }

  var TODAY = new Date('2026-03-01T00:00:00.000Z');
  var baseParams = {
    horizon: 30,
    targetCoverageDays: 30,
    serviceLevelZ: 1.65,
    globalLeadTime: 7,
    usePerSkuLeadTime: false,
    perSkuLeadTime: {}
  };

  function oneSkuRow(d30, stdDev, price, velocityPct) {
    return [{
      sku: 'SKU-1',
      name: 'Test SKU',
      d30: d30,
      stdDev: stdDev,
      price: price,
      velocityPct: velocityPct,
      velocityDir: 'flat'
    }];
  }

  function computeOne(row, stockBySku, params) {
    var merged = {};
    var key;
    for (key in baseParams) merged[key] = baseParams[key];
    for (key in (params || {})) merged[key] = params[key];
    merged.stockBySku = stockBySku;
    return metrics.computeSkuMetrics(row, merged, TODAY)[0];
  }

  // T1) coverage_days < lead_time_days => risk "Reorder now", days_out_of_stock > 0,
  //     lost_revenue > 0, last_safe_reorder_date = today (clamped).
  testCase('T1: Reorder now path', function () {
    var row = oneSkuRow(300, 3, 20, 5); // avg_daily = 10
    var m = computeOne(row, { 'SKU-1': 30 }); // coverage=3, lt=7
    assertEq(m.risk, 'Reorder now', 'risk should be Reorder now');
    assert(m.daysOutOfStock > 0, 'days_out_of_stock should be > 0');
    assert(m.lostRevenue > 0, 'lost_revenue should be > 0');
    assertEq(m.lastSafeReorderDate.getTime(), TODAY.getTime(), 'last_safe_reorder_date should clamp to today');
  });

  // T2) coverage_days == lead_time_days => not overdue, lost_revenue == 0.
  testCase('T2: Lead-time boundary', function () {
    var row = oneSkuRow(300, 3, 20, 5); // avg_daily = 10
    var m = computeOne(row, { 'SKU-1': 70 }); // coverage=7
    assertEq(m.overdue, false, 'coverage == lead_time should not be overdue');
    assertEq(m.lostRevenue, 0, 'lost_revenue should be 0 at boundary');
  });

  // T3) coverage_days > target_coverage_days => risk "On track".
  testCase('T3: Above target coverage', function () {
    var row = oneSkuRow(300, 3, 20, 5); // avg_daily = 10
    var m = computeOne(row, { 'SKU-1': 400 }); // coverage=40 > target=30
    assertEq(m.risk, 'On track', 'risk should be On track above target coverage');
  });

  // T4) avg_daily = 0, stock > 0 => coverage_days Infinity (no demand, stock doesn't deplete), reorder_qty 0, lost_revenue 0, risk On track.
  testCase('T4: Zero demand with stock', function () {
    var row = oneSkuRow(0, 0, 20, 5); // avg_daily = 0
    var m = computeOne(row, { 'SKU-1': 25 });
    assertEq(m.coverageDays, Infinity, 'coverage should be Infinity (no demand, stock > 0)');
    assertEq(m.risk, 'On track', 'risk should be On track (not consuming)');
    assertEq(m.reorderQty, 0, 'reorder_qty should be 0');
    assertEq(m.lostRevenue, 0, 'lost_revenue should be 0');
    assertEq(m.overdue, false, 'overdue should be false');
    assertEq(m.cv, null, 'CV should be null (not measurable)');
  });

  // T5) avg_daily = 0, stock = 0 => coverage_days 0, risk "Stockout".
  testCase('T5: Zero demand and zero stock', function () {
    var row = oneSkuRow(0, 0, 20, 5);
    var m = computeOne(row, { 'SKU-1': 0 });
    assertEq(m.coverageDays, 0, 'coverage should be 0');
    assertEq(m.risk, 'Stockout', 'risk should be Stockout');
  });

  // T6) blank stock input => treated as 0 (no NaN anywhere).
  testCase('T6: Blank stock sanitization', function () {
    var row = oneSkuRow(300, 3, 20, 5);
    var stock = { 'SKU-1': '' };
    var m = computeOne(row, stock);
    assertEq(m.stock, 0, 'blank stock should sanitize to 0');
    assert(!isNaN(m.coverageDays), 'coverage_days should not be NaN');
    assert(!isNaN(m.reorderQty), 'reorder_qty should not be NaN');
    assert(!isNaN(m.lostRevenue), 'lost_revenue should not be NaN');
  });

  // T7) Overview aggregates are derived from per-SKU outputs.
  testCase('T7: Overview aggregate consistency', function () {
    var rows = [
      { sku: 'A', name: 'A', d30: 300, stdDev: 3, price: 10, velocityPct: 5, velocityDir: 'flat' }, // avg=10
      { sku: 'B', name: 'B', d30: 300, stdDev: 3, price: 10, velocityPct: 5, velocityDir: 'flat' },
      { sku: 'C', name: 'C', d30: 300, stdDev: 3, price: 10, velocityPct: 5, velocityDir: 'flat' }
    ];

    var skuMetrics = metrics.computeSkuMetrics(rows, {
      horizon: 30,
      targetCoverageDays: 30,
      serviceLevelZ: 1.65,
      globalLeadTime: 7,
      stockBySku: {
        A: 20,  // coverage=2 -> reorder now
        B: 70,  // coverage=7 -> overdue false
        C: 400  // on track -> overdue false
      }
    }, TODAY);

    var manualAtRisk = 0;
    var manualOverdue = 0;
    var manualCoverageSum = 0;
    var manualCoverageCount = 0;
    var manualLostRevenue = 0;
    var manualSlowCapital = 0;
    var manualOverstockedCapital = 0;

    for (var i = 0; i < skuMetrics.length; i++) {
      var m = skuMetrics[i];
      if (m.risk !== 'On track') manualAtRisk++;
      if (m.overdue) manualOverdue++;
      if (m.avgDaily > 0 && m.coverageDays !== Infinity && m.coverageDays !== null) {
        manualCoverageSum += m.coverageDays;
        manualCoverageCount++;
      }
      manualLostRevenue += m.lostRevenue;
      if (m.slowMover) {
        manualSlowCapital += m.stock * m.unitPrice;
      }
      if (m.overstocked) {
        manualOverstockedCapital += m.stock * m.unitPrice;
      }
    }

    var overview = metrics.computeOverviewMetrics(skuMetrics, { monetaryBasis: 'unit_price' });
    assertEq(overview.skusAtRisk, manualAtRisk, 'overview skus_at_risk must match per-SKU risk flags');
    assertEq(overview.overdueReorders, manualOverdue, 'overview overdue_reorders must match SKU overdue count');
    assertEq(overview.avgCoverage, manualCoverageCount > 0 ? Math.round(manualCoverageSum / manualCoverageCount) : 0,
      'overview avg_coverage must match per-SKU finite coverage mean');
    assertEq(overview.totalLostRevenue, manualLostRevenue, 'overview total_lost_revenue must match per-SKU sum');
    assertEq(overview.capitalInSlowMovers, manualSlowCapital, 'overview capital_in_slow_movers must match per-SKU slow mover capital sum');
    assertEq(overview.capitalInOverstocked, manualOverstockedCapital, 'overview capital_in_overstocked must match per-SKU overstocked capital sum');
  });

  // T8) Individual pure functions — safety stock, coverage, CV
  testCase('T8: Pure functions — safetyStock, coverage, CV', function () {
    var ss = metrics.computeSafetyStock(1.65, 3, 7);
    var expectedSS = 1.65 * 3 * Math.sqrt(7);
    assertNear(ss, expectedSS, 1e-10, 'computeSafetyStock(1.65, 3, 7)');

    assertEq(metrics.computeCoverageDays(100, 10), 10, 'coverage 100/10 = 10');
    assertEq(metrics.computeCoverageDays(50, 0), Infinity, 'coverage 50/0 = Infinity (no demand, stock > 0)');
    assertEq(metrics.computeCoverageDays(0, 0), 0, 'coverage 0/0 = 0');
    assertEq(metrics.computeCoverageDays(0, 10), 0, 'coverage 0/10 = 0');

    assertEq(metrics.computeCV(3, 10), 0.3, 'CV 3/10 = 0.3');
    assertEq(metrics.computeCV(5, 0), null, 'CV when avgDaily=0 is null (not measurable)');
    assertEq(metrics.computeCV(0, 10), 0, 'CV 0/10 = 0');
  });

  // T9) Pure function — computeReorderQty with rounding
  testCase('T9: Pure function — computeReorderQty', function () {
    var r1 = metrics.computeReorderQty(30, 10, 13.1, 50);
    assertNear(r1.reorderQtyRaw, 263.1, 0.001, 'raw ≈ 263.1');
    assertEq(r1.reorderQty, 264, 'ceil(263.1) = 264');

    var r2 = metrics.computeReorderQty(30, 10, 5, 500);
    assertEq(r2.reorderQtyRaw, 0, 'raw clamped to 0 when overstocked');
    assertEq(r2.reorderQty, 0, 'ceil(0) = 0');

    var r3 = metrics.computeReorderQty(30, 0, 5, 10);
    assertEq(r3.reorderQty, 0, 'reorderQty = 0 when avgDaily = 0');
  });

  // T10) Pure function — computeRisk boundaries
  testCase('T10: Pure function — computeRisk', function () {
    assertEq(metrics.computeRisk(0, 7, 30).risk, 'Stockout', 'coverage=0 → Stockout');
    assertEq(metrics.computeRisk(3, 7, 30).risk, 'Reorder now', 'coverage < lt → Reorder now');
    assertEq(metrics.computeRisk(7, 7, 30).risk, 'Watch', 'coverage == lt → Watch');
    assertEq(metrics.computeRisk(15, 7, 30).risk, 'Watch', 'lt < coverage < target → Watch');
    assertEq(metrics.computeRisk(30, 7, 30).risk, 'On track', 'coverage == target → On track');
    assertEq(metrics.computeRisk(40, 7, 30).risk, 'On track', 'coverage > target → On track');
    assertEq(metrics.computeRisk(null, 7, 30).risk, 'On track', 'null coverage → On track');
  });

  // T11) Pure functions — daysOut, lostRevenue, lastSafe, overdue
  testCase('T11: Pure functions — daysOut, lostRevenue, lastSafe, overdue', function () {
    assertEq(metrics.computeDaysOutOfStock(7, 3), 4, 'daysOut = 7 - 3 = 4');
    assertEq(metrics.computeDaysOutOfStock(7, 10), 0, 'daysOut clamped to 0');
    assertEq(metrics.computeDaysOutOfStock(7, null), 0, 'daysOut = 0 for null coverage');

    assertEq(metrics.computeLostRevenue(10, 20, 4), 800, 'lostRevenue = 10 × 20 × 4 = 800');
    assertEq(metrics.computeLostRevenue(10, 20, 0), 0, 'lostRevenue = 0 when daysOut = 0');

    var MS_DAY = 86400000;
    var d1 = metrics.computeLastSafeReorderDate(TODAY, 10, 7);
    assertEq(d1.getTime(), new Date(TODAY.getTime() + 3 * MS_DAY).getTime(), 'lastSafe = today + 3d');
    var d2 = metrics.computeLastSafeReorderDate(TODAY, 3, 7);
    assertEq(d2.getTime(), TODAY.getTime(), 'lastSafe clamps to today when coverage < lt');
    assertEq(metrics.computeLastSafeReorderDate(TODAY, null, 7), null, 'lastSafe null for null coverage');

    var past = new Date(TODAY.getTime() - MS_DAY);
    assertEq(metrics.computeOverdue('Reorder now', past, TODAY), true, 'overdue when date < today');
    assertEq(metrics.computeOverdue('On track', past, TODAY), false, 'never overdue if On track');
    assertEq(metrics.computeOverdue('Watch', TODAY, TODAY), false, 'not overdue when date == today');
    assertEq(metrics.computeOverdue('Reorder now', null, TODAY), false, 'not overdue when date null');
  });

  // T12) zFromServiceLevel
  testCase('T12: zFromServiceLevel', function () {
    assertEq(metrics.zFromServiceLevel(0.90), 1.28, 'z(90%) = 1.28');
    assertEq(metrics.zFromServiceLevel(0.95), 1.65, 'z(95%) = 1.65');
    assertEq(metrics.zFromServiceLevel(0.99), 2.33, 'z(99%) = 2.33');
    assertEq(metrics.zFromServiceLevel(1.65), 1.65, 'pass-through z-score 1.65');
    assertEq(metrics.zFromServiceLevel(2.33), 2.33, 'pass-through z-score 2.33');
  });

  // T13) Edge case — stock = 0 with positive demand
  testCase('T13: Stock=0 positive demand', function () {
    var row = oneSkuRow(300, 3, 20, 5); // avg_daily = 10
    var m = computeOne(row, { 'SKU-1': 0 });
    assertEq(m.coverageDays, 0, 'coverage = 0');
    assertEq(m.risk, 'Stockout', 'risk = Stockout');
    assert(m.daysOutOfStock > 0, 'daysOutOfStock > 0');
    assert(m.lostRevenue > 0, 'lostRevenue > 0');
    assert(m.reorderQty > 0, 'reorderQty > 0');
    assertEq(m.overdue, false, 'overdue = false (lastSafe == today)');
  });

  // T14) Edge case — leadTimeDays > targetCoverageDays
  testCase('T14: leadTime > targetCoverage', function () {
    var row = oneSkuRow(300, 3, 20, 5); // avg_daily = 10
    // lt=45, target=30, stock=50 → coverage=5 < lt → Reorder now
    var m = computeOne(row, { 'SKU-1': 50 }, { globalLeadTime: 45 });
    assertEq(m.risk, 'Reorder now', 'risk when lt(45) > target(30) and coverage(5) < lt');
    assert(m.daysOutOfStock > 0, 'daysOutOfStock > 0');
    assert(m.reorderQty > 0, 'reorderQty > 0');
  });

  // T15) Rounding boundary — reorderQtyRaw near integer
  testCase('T15: Rounding boundary', function () {
    // Exact integer
    var r1 = metrics.computeReorderQty(30, 10, 0, 100);
    assertEq(r1.reorderQtyRaw, 200, 'raw = 200 (exact)');
    assertEq(r1.reorderQty, 200, 'ceil(200) = 200');

    // Just above integer
    var r2 = metrics.computeReorderQty(30, 10, 0.01, 100);
    assertEq(r2.reorderQty, 201, 'ceil(200.01) = 201');

    // Near-zero raw
    var r3 = metrics.computeReorderQty(30, 10, 0, 299.99);
    assert(r3.reorderQtyRaw > 0 && r3.reorderQtyRaw < 0.02, 'raw near 0.01');
    assertEq(r3.reorderQty, 1, 'ceil(~0.01) = 1');

    // Exact zero
    var r4 = metrics.computeReorderQty(30, 10, 0, 300);
    assertEq(r4.reorderQty, 0, 'ceil(0) = 0');
  });

  // T16) Extended overview consistency — mixed edge cases
  testCase('T16: Overview consistency with edge cases', function () {
    var rows = [
      { sku: 'X', name: 'X', d30: 0,   stdDev: 0, price: 10, velocityPct: 0,  velocityDir: 'flat' },
      { sku: 'Y', name: 'Y', d30: 300, stdDev: 3, price: 10, velocityPct: -5, velocityDir: 'down' },
      { sku: 'Z', name: 'Z', d30: 300, stdDev: 3, price: 10, velocityPct: 5,  velocityDir: 'up' }
    ];

    var skuMetrics = metrics.computeSkuMetrics(rows, {
      horizon: 30, targetCoverageDays: 30, serviceLevelZ: 1.65,
      globalLeadTime: 7, stockBySku: { X: 100, Y: 0, Z: 400 }
    }, TODAY);

    var manualAtRisk = 0;
    var manualOverdue = 0;
    var manualCoverageSum = 0;
    var manualCoverageCount = 0;
    var manualLostRev = 0;
    var manualSlowCap = 0;
    var manualOverstockedCap = 0;

    for (var i = 0; i < skuMetrics.length; i++) {
      var m = skuMetrics[i];
      if (m.stock === null) continue;
      if (m.risk !== 'On track') manualAtRisk++;
      if (m.overdue) manualOverdue++;
      if (m.avgDaily > 0 && m.coverageDays !== Infinity && m.coverageDays !== null) {
        manualCoverageSum += m.coverageDays;
        manualCoverageCount++;
      }
      manualLostRev += m.lostRevenue;
      if (m.slowMover) manualSlowCap += m.stock * m.unitPrice;
      if (m.overstocked) manualOverstockedCap += m.stock * m.unitPrice;
    }

    var ov = metrics.computeOverviewMetrics(skuMetrics, { monetaryBasis: 'unit_price' });
    assertEq(ov.skusAtRisk, manualAtRisk, 'at-risk count matches');
    assertEq(ov.overdueReorders, manualOverdue, 'overdue count matches');
    assertEq(ov.avgCoverage, manualCoverageCount > 0 ? Math.round(manualCoverageSum / manualCoverageCount) : 0, 'avg coverage matches');
    assertEq(ov.totalLostRevenue, manualLostRev, 'total lost revenue matches');
    assertEq(ov.capitalInSlowMovers, manualSlowCap, 'slow mover capital matches');
    assertEq(ov.capitalInOverstocked, manualOverstockedCap, 'overstocked capital matches');
  });

  // =========================================
  // NEW TESTS — Coverage / deterministic / split / CSV
  // =========================================

  // T17) avg_daily=0, stock>0 => coverage = Infinity, risk = On track, display "—"
  testCase('T17: Zero demand coverage is Infinity, displayed as —', function () {
    var row = oneSkuRow(0, 0, 20, 0);
    var m = computeOne(row, { 'SKU-1': 50 });
    assertEq(m.coverageDays, Infinity, 'coverage should be Infinity (no demand, stock > 0)');
    assertEq(m.risk, 'On track', 'zero-demand SKU with stock should not be flagged');
    assert(m.risk !== 'Reorder now', 'must not be Reorder now');
    // Verify formatCoverageDays produces safe string
    var display = metrics.formatCoverageDays(m.coverageDays);
    assertEq(display, '—', 'formatted coverage should be —');
    assert(display.indexOf('Infinity') === -1, 'display must not contain raw Infinity');
    // Verify CV is null (not measurable)
    assertEq(m.cv, null, 'CV should be null when avg_daily=0');
    var cvDisplay = metrics.formatCV(m.cv);
    assertEq(cvDisplay, '—', 'formatted CV should be —');
  });

  // T18) avg_daily=0, stock=0 => coverage 0 (unchanged)
  testCase('T18: Zero demand zero stock', function () {
    var row = oneSkuRow(0, 0, 20, 0);
    var m = computeOne(row, { 'SKU-1': 0 });
    assertEq(m.coverageDays, 0, 'coverage should be 0');
    assertEq(m.risk, 'Stockout', 'risk should be Stockout');
    assertEq(metrics.formatCoverageDays(0), '0d', 'formatted 0 coverage = 0d');
  });

  // T19) Injected today makes last_safe_reorder_date deterministic
  testCase('T19: Deterministic today injection', function () {
    var row = oneSkuRow(300, 3, 20, 5); // avg_daily = 10
    var MS_DAY = 86400000;

    var today1 = new Date('2026-03-01T00:00:00.000Z');
    var m1 = computeOne(row, { 'SKU-1': 100 }); // coverage=10, lt=7 → lastSafe = today+3d
    assertEq(m1.lastSafeReorderDate.getTime(), today1.getTime() + 3 * MS_DAY, 'lastSafe with 2026-03-01');

    // Use a different today
    var today2 = new Date('2026-06-15T00:00:00.000Z');
    var merged = {};
    var key;
    for (key in baseParams) merged[key] = baseParams[key];
    merged.stockBySku = { 'SKU-1': 100 };
    var m2 = metrics.computeSkuMetrics(row, merged, today2)[0];
    assertEq(m2.lastSafeReorderDate.getTime(), today2.getTime() + 3 * MS_DAY, 'lastSafe with 2026-06-15');

    // Dates differ because today differs
    assert(m1.lastSafeReorderDate.getTime() !== m2.lastSafeReorderDate.getTime(),
      'different injected today must produce different lastSafeReorderDate');
  });

  // T20) slow_mover vs overstocked split
  testCase('T20: slow_mover vs overstocked split', function () {
    var rows = [
      { sku: 'SLOW', name: 'Slow', d30: 300, stdDev: 3, price: 10, velocityPct: -5, velocityDir: 'down' },
      { sku: 'OVER', name: 'Over', d30: 300, stdDev: 3, price: 10, velocityPct: 5,  velocityDir: 'up' },
      { sku: 'BOTH', name: 'Both', d30: 300, stdDev: 3, price: 10, velocityPct: -3, velocityDir: 'down' },
      { sku: 'NONE', name: 'None', d30: 300, stdDev: 3, price: 10, velocityPct: 5,  velocityDir: 'up' }
    ];
    // avg_daily = 10 for all
    var skuMetrics = metrics.computeSkuMetrics(rows, {
      horizon: 30, targetCoverageDays: 30, serviceLevelZ: 1.65,
      globalLeadTime: 7,
      stockBySku: {
        SLOW: 50,   // coverage=5 < 30 → not overstocked; vel<0 → slowMover
        OVER: 400,  // coverage=40 > 30 → overstocked; vel>=0 → not slowMover
        BOTH: 500,  // coverage=50 > 30 → overstocked; vel<0 → slowMover
        NONE: 50    // coverage=5 < 30 → not overstocked; vel>=0 → not slowMover
      }
    }, TODAY);

    var slow = skuMetrics[0]; // SLOW
    var over = skuMetrics[1]; // OVER
    var both = skuMetrics[2]; // BOTH
    var none = skuMetrics[3]; // NONE

    assertEq(slow.slowMover, true, 'SLOW: slowMover=true (vel<0)');
    assertEq(slow.overstocked, false, 'SLOW: overstocked=false (coverage<target)');

    assertEq(over.slowMover, false, 'OVER: slowMover=false (vel>=0)');
    assertEq(over.overstocked, true, 'OVER: overstocked=true (coverage>target)');

    assertEq(both.slowMover, true, 'BOTH: slowMover=true (vel<0)');
    assertEq(both.overstocked, true, 'BOTH: overstocked=true (coverage>target)');

    assertEq(none.slowMover, false, 'NONE: slowMover=false (vel>=0)');
    assertEq(none.overstocked, false, 'NONE: overstocked=false (coverage<target)');

    // Verify overview separates the two
    var ov = metrics.computeOverviewMetrics(skuMetrics, { monetaryBasis: 'unit_price' });
    // slowMover capital: SLOW(50*10=500) + BOTH(500*10=5000) = 5500
    assertEq(ov.capitalInSlowMovers, 5500, 'slow mover capital = SLOW + BOTH');
    // overstocked capital: OVER(400*10=4000) + BOTH(500*10=5000) = 9000
    assertEq(ov.capitalInOverstocked, 9000, 'overstocked capital = OVER + BOTH');
  });

  // T21) parseStockInput — SKU normalization, duplicates, invalid values
  testCase('T21: parseStockInput edge cases', function () {
    var result = metrics.parseStockInput([
      { sku: '  SKU-A  ', stock: 100 },
      { sku: 'sku-b', stock: '50' },
      { sku: 'SKU-A', stock: 200 },      // duplicate — last wins
      { sku: 'SKU-C', stock: -5 },        // negative → 0
      { sku: 'SKU-D', stock: 'abc' },     // non-numeric → 0
      { sku: '', stock: 10 },             // empty SKU → skipped
      { sku: 'SKU-E', stock: 0 }
    ]);

    // SKU-A: last occurrence (200) wins, normalized to 'SKU-A'
    assertEq(result.stockBySku['SKU-A'], 200, 'SKU-A last occurrence wins');
    assertEq(result.stockBySku['SKU-B'], 50, 'sku-b normalized to SKU-B');
    assertEq(result.stockBySku['SKU-C'], 0, 'negative stock treated as 0');
    assertEq(result.stockBySku['SKU-D'], 0, 'non-numeric stock treated as 0');
    assertEq(result.stockBySku['SKU-E'], 0, 'zero stock preserved');

    // Warnings
    var types = result.warnings.map(function (w) { return w.type; });
    assert(types.indexOf('duplicate') !== -1, 'should warn about duplicate');
    assert(types.indexOf('invalid_stock') !== -1, 'should warn about invalid stock');
    assert(types.indexOf('empty_sku') !== -1, 'should warn about empty SKU');

    // Never throws
    var empty = metrics.parseStockInput([]);
    assertEq(Object.keys(empty.stockBySku).length, 0, 'empty input returns empty map');
    assertEq(empty.warnings.length, 0, 'empty input has no warnings');

    var nullInput = metrics.parseStockInput(null);
    assertEq(Object.keys(nullInput.stockBySku).length, 0, 'null input returns empty map');
  });

  // T22) Case-insensitive stock lookup in computeSkuMetrics
  testCase('T22: Case-insensitive stock key matching', function () {
    var rows = [
      { sku: 'BK-1042', name: 'Mug', d30: 300, stdDev: 3, price: 20, velocityPct: 5, velocityDir: 'up' }
    ];
    // Stock key has different case and whitespace
    var skuMetrics = metrics.computeSkuMetrics(rows, {
      horizon: 30, targetCoverageDays: 30, serviceLevelZ: 1.65,
      globalLeadTime: 7,
      stockBySku: { ' bk-1042 ': 120 }
    }, TODAY);

    assertEq(skuMetrics[0].stock, 120, 'stock matched despite case/whitespace difference');
    assert(skuMetrics[0].coverageDays > 0, 'coverage computed with matched stock');
  });

  // T23) formatCoverageDays never returns raw Infinity/NaN
  testCase('T23: formatCoverageDays safety', function () {
    assertEq(metrics.formatCoverageDays(null), '—', 'null → —');
    assertEq(metrics.formatCoverageDays(undefined), '—', 'undefined → —');
    assertEq(metrics.formatCoverageDays(Infinity), '—', 'Infinity → —');
    assertEq(metrics.formatCoverageDays(10), '10d', '10 → 10d');
    assertEq(metrics.formatCoverageDays(0), '0d', '0 → 0d');
    assertEq(metrics.formatCoverageDays(7.6), '8d', '7.6 → 8d (rounded)');
    var nResult = metrics.formatCoverageDays(NaN);
    assert(nResult.indexOf('NaN') === -1, 'NaN must not appear in output');
    assert(nResult.indexOf('Infinity') === -1, 'Infinity must not appear in output');
  });

  // T24) Edge case: avg_daily=0, stock>0 => coverage Infinity, reorder_qty=0, risk=On track
  testCase('T24: Zero demand stock>0 — display and metrics', function () {
    var row = oneSkuRow(0, 0, 15, 0); // avg_daily = 0
    var m = computeOne(row, { 'SKU-1': 42 });
    assertEq(m.coverageDays, Infinity, 'coverage should be Infinity');
    assertEq(m.reorderQty, 0, 'reorder_qty should be 0');
    assertEq(m.risk, 'On track', 'risk should be On track');
    assertEq(m.lostRevenue, 0, 'lost_revenue should be 0');
    assertEq(m.overdue, false, 'overdue should be false');
    assertEq(m.lastSafeReorderDate, null, 'lastSafeReorderDate should be null');
    assertEq(m.daysOutOfStock, 0, 'daysOutOfStock should be 0');
    assertEq(m.cv, null, 'CV should be null (not measurable)');
    var displayed = metrics.formatCoverageDays(m.coverageDays);
    assertEq(displayed, '—', 'display must be —');
    assert(displayed !== 'Infinity', 'display must not be Infinity');
    assert(displayed !== '∞', 'display must not be ∞');
    var cvDisp = metrics.formatCV(m.cv);
    assertEq(cvDisp, '—', 'CV display must be —');
  });

  // T25) Edge case: avg_daily=0, stock=0 => coverage 0, reorder_qty=0, risk=Stockout
  testCase('T25: Zero demand stock=0 — deterministic', function () {
    var row = oneSkuRow(0, 0, 15, 0); // avg_daily = 0
    var m = computeOne(row, { 'SKU-1': 0 });
    assertEq(m.coverageDays, 0, 'coverage should be 0');
    assertEq(m.reorderQty, 0, 'reorder_qty should be 0');
    assertEq(m.risk, 'Stockout', 'risk should be Stockout');
    assertEq(m.lostRevenue, 0, 'lost_revenue should be 0');
    assertEq(m.overdue, false, 'overdue should be false');
    var displayed = metrics.formatCoverageDays(m.coverageDays);
    assertEq(displayed, '0d', 'display must be 0d');
  });

  // T26) formatCV safety — never returns raw Infinity/NaN/undefined
  testCase('T26: formatCV safety', function () {
    assertEq(metrics.formatCV(null), '—', 'null → —');
    assertEq(metrics.formatCV(undefined), '—', 'undefined → —');
    assertEq(metrics.formatCV(Infinity), '—', 'Infinity → —');
    assertEq(metrics.formatCV(0.35), '0.35', '0.35 → 0.35');
    assertEq(metrics.formatCV(0), '0.00', '0 → 0.00');
    assertEq(metrics.formatCV(1.234), '1.23', '1.234 → 1.23 (toFixed(2))');
    var nResult = metrics.formatCV(NaN);
    assert(nResult.indexOf('NaN') === -1, 'NaN must not appear in output');
    assert(nResult.indexOf('Infinity') === -1, 'Infinity must not appear in output');
    assertEq(nResult, '—', 'NaN → —');
  });

  // T27) avg_daily < 0 edge case (negative demand — defensive)
  testCase('T27: Negative avg_daily edge case', function () {
    assertEq(metrics.computeCoverageDays(50, -5), Infinity, 'negative avg_daily with stock > 0 → Infinity');
    assertEq(metrics.computeCoverageDays(0, -5), 0, 'negative avg_daily with stock = 0 → 0');
    assertEq(metrics.computeCV(3, -5), null, 'CV with negative avg_daily → null');
  });

  log('');
  log('========================================');
  log('Tests: ' + (passed + failed) + ' total, ' + passed + ' passed, ' + failed + ' failed');
  log('========================================');

  if (failed > 0) {
    error('SOME TESTS FAILED');
    if (typeof process !== 'undefined' && process.exit) process.exit(1);
  } else {
    log('ALL TESTS PASSED ✓');
  }
})();
