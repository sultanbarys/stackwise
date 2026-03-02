/* ============================================
   STACKWISE — Try Page Interactions
   Handles demo/upload flow, results rendering,
   3-method stock input, lead time, safety stock,
   horizon switching, and save/export gating
   ============================================ */

(function () {
  'use strict';

  // =========================================
  // SAMPLE DATA — Forecast Only (derived from sales history)
  // Stock data is SEPARATE and optional.
  // =========================================
  // stdDev = daily demand standard deviation (derived from synthetic 6-month history)
  // price = unit selling price (USD) — used for revenue impact estimates
  var SAMPLE_SKUS = [
    { sku: 'BK-1042', name: 'Ceramic Mug — Sage',        d30: 284, d60: 555, d90: 810,  velocityPct: 12,  velocityDir: 'up',   stdDev: 3.2,  price: 24.00 },
    { sku: 'LT-0887', name: 'Linen Tote — Natural',       d30: 156, d60: 318, d90: 490,  velocityPct: 24,  velocityDir: 'up',   stdDev: 2.8,  price: 38.00 },
    { sku: 'CN-2215', name: 'Soy Candle — Cedar',          d30: 92,  d60: 178, d90: 260,  velocityPct: 0,   velocityDir: 'flat', stdDev: 1.1,  price: 18.00 },
    { sku: 'WB-0334', name: 'Wool Blanket — Oat',          d30: 47,  d60: 90,  d90: 128,  velocityPct: -8,  velocityDir: 'down', stdDev: 1.6,  price: 89.00 },
    { sku: 'PT-1190', name: 'Stoneware Plate Set',         d30: 210, d60: 415, d90: 625,  velocityPct: 6,   velocityDir: 'up',   stdDev: 2.5,  price: 42.00 },
    { sku: 'CK-0512', name: 'Cork Coaster Set (4-pack)',   d30: 114, d60: 225, d90: 340,  velocityPct: 3,   velocityDir: 'up',   stdDev: 4.1,  price: 12.00 },
    { sku: 'GL-0773', name: 'Glass Vase — Smoke',          d30: 68,  d60: 130, d90: 195,  velocityPct: -2,  velocityDir: 'down', stdDev: 3.8,  price: 55.00 },
    { sku: 'TW-0291', name: 'Cotton Tea Towel — Stripe',   d30: 135, d60: 265, d90: 395,  velocityPct: 5,   velocityDir: 'up',   stdDev: 1.9,  price: 14.00 },
    { sku: 'BW-1105', name: 'Bamboo Serving Bowl',         d30: 78,  d60: 148, d90: 220,  velocityPct: 1,   velocityDir: 'flat', stdDev: 2.2,  price: 32.00 },
    { sku: 'NP-0445', name: 'Linen Napkin Set (4)',         d30: 95,  d60: 185, d90: 280,  velocityPct: -1,  velocityDir: 'flat', stdDev: 3.5,  price: 22.00 },
    { sku: 'SP-0889', name: 'Stoneware Spoon Rest',        d30: 62,  d60: 120, d90: 175,  velocityPct: -5,  velocityDir: 'down', stdDev: 2.9,  price: 16.00 },
    { sku: 'JR-0667', name: 'Ceramic Jar — Matte White',   d30: 105, d60: 205, d90: 310,  velocityPct: 4,   velocityDir: 'up',   stdDev: 1.4,  price: 28.00 }
  ];

  var SAMPLE_STOCK = {
    'BK-1042': 120,
    'LT-0887': 45,
    'CN-2215': 200,
    'WB-0334': 85,
    'PT-1190': 95,
    'CK-0512': 22,
    'GL-0773': 150,
    'TW-0291': 40,
    'BW-1105': 55,
    'NP-0445': 35,
    'SP-0889': 110,
    'JR-0667': 48
  };


  // =========================================
  // ERROR MESSAGES
  // =========================================
  var ERROR_MESSAGES = {
    wrongFileType: 'This file isn\'t a CSV. Please upload a .csv file.',
    emptyFile: 'This file appears to be empty. Upload a CSV with at least one row of data.',
    missingColumns: 'We couldn\'t find the required columns: date, sku, and quantity_sold. Check that your CSV includes these (or similar) column headers.',
    tooManyRows: 'This file exceeds the demo limit of 10,000 rows. To process larger files, start a free trial.',
    tooManySKUs: 'This file contains more than 200 unique SKUs. The demo supports up to 200. Start a free trial for higher limits.',
    parseError: 'We had trouble reading this file. Make sure it\'s a valid CSV with comma-separated values.',
    fileTooLarge: 'This file is larger than 5 MB. Try a smaller export or remove unused columns.'
  };


  // =========================================
  // DOM REFERENCES — Sales Upload
  // =========================================
  var optionDemo = document.querySelector('[data-mode="demo"]');
  var optionUpload = document.querySelector('[data-mode="upload"]');
  var btnDemo = document.getElementById('btn-demo');
  var btnUpload = document.getElementById('btn-upload');
  var csvInput = document.getElementById('csv-input');
  var dropzone = document.getElementById('dropzone');
  var fileInfo = document.getElementById('file-info');
  var fileName = document.getElementById('file-name');
  var fileRemove = document.getElementById('file-remove');
  var uploadErrorEl = document.getElementById('upload-error');
  var uploadErrorTextEl = document.getElementById('upload-error-text');

  // Results
  var resultsSection = document.getElementById('try-results');
  var resultsSource = document.getElementById('results-source');
  var horizonLabel = document.getElementById('horizon-label');
  var skuTableBody = document.getElementById('sku-table-body');
  var reorderList = document.getElementById('reorder-list');
  var reorderCount = document.getElementById('reorder-count');
  var resultsEmpty = document.getElementById('results-empty');
  var reorderEmpty = document.getElementById('reorder-empty');
  var reorderPanel = document.getElementById('reorder-panel');
  var reorderFormula = document.getElementById('reorder-formula');
  var horizonButtons = document.querySelectorAll('.try-results__horizon-btn');
  var stockColumns = document.querySelectorAll('.stock-col');

  // Mode banner
  var modeBanner = document.getElementById('mode-banner');
  var modeTitle = document.getElementById('mode-title');
  var modeDesc = document.getElementById('mode-desc');

  // Gate
  var gateForm = document.getElementById('gate-form');
  var gateEmail = document.getElementById('gate-email');
  var gateSuccess = document.getElementById('gate-success');
  var gateEmailEcho = document.getElementById('gate-email-echo');
  var btnSave = document.getElementById('btn-save');
  var btnMagicLink = document.getElementById('btn-magic-link');

  // =========================================
  // DOM REFERENCES — Stock Panel
  // =========================================
  var stockInputSection = document.getElementById('stock-input-section');
  var stockDemoCta = document.getElementById('stock-demo-cta');
  var btnSampleStock = document.getElementById('btn-sample-stock');
  var stockStatus = document.getElementById('stock-status');
  var stockStatusDot = document.getElementById('stock-status-dot');
  var stockStatusText = document.getElementById('stock-status-text');

  // Tabs
  var tabEditor = document.getElementById('tab-editor');
  var tabPaste = document.getElementById('tab-paste');
  var tabCsv = document.getElementById('tab-csv');
  var panelEditor = document.getElementById('panel-editor');
  var panelPaste = document.getElementById('panel-paste');
  var panelCsv = document.getElementById('panel-csv');

  // Editor
  var stockEditorBody = document.getElementById('stock-editor-body');
  var btnSetDefault = document.getElementById('btn-set-default');
  var btnClearStock = document.getElementById('btn-clear-stock');
  var btnApplyEditor = document.getElementById('btn-apply-editor');

  // Paste
  var pasteTextarea = document.getElementById('paste-textarea');
  var pastePreview = document.getElementById('paste-preview');
  var pastePreviewCount = document.getElementById('paste-preview-count');
  var pastePreviewBody = document.getElementById('paste-preview-body');
  var pasteError = document.getElementById('paste-error');
  var pasteErrorText = document.getElementById('paste-error-text');
  var btnApplyPaste = document.getElementById('btn-apply-paste');

  // CSV upload
  var stockCsvDropzone = document.getElementById('stock-csv-dropzone');
  var stockCsvInput = document.getElementById('stock-csv-input');
  var stockCsvFileInfo = document.getElementById('stock-csv-file-info');
  var stockCsvFileName = document.getElementById('stock-csv-file-name');
  var stockCsvFileRemove = document.getElementById('stock-csv-file-remove');
  var stockCsvMapping = document.getElementById('stock-csv-mapping');
  var mapSkuCol = document.getElementById('map-sku-col');
  var mapStockCol = document.getElementById('map-stock-col');
  var stockCsvMatch = document.getElementById('stock-csv-match');
  var stockCsvMatchFill = document.getElementById('stock-csv-match-fill');
  var stockCsvMatchText = document.getElementById('stock-csv-match-text');
  var stockCsvUnmatched = document.getElementById('stock-csv-unmatched');
  var stockCsvUnmatchedList = document.getElementById('stock-csv-unmatched-list');
  var stockCsvError = document.getElementById('stock-csv-error');
  var stockCsvErrorText = document.getElementById('stock-csv-error-text');
  var stockCsvFooter = document.getElementById('stock-csv-footer');
  var btnApplyCsv = document.getElementById('btn-apply-csv');

  // Success state
  var stockSuccess = document.getElementById('stock-success');
  var stockSuccessTitle = document.getElementById('stock-success-title');
  var stockSuccessDesc = document.getElementById('stock-success-desc');
  var stockSuccessEdit = document.getElementById('stock-success-edit');
  var stockSuccessRemove = document.getElementById('stock-success-remove');

  // Lead time
  var leadtimeSection = document.getElementById('leadtime-section');
  var leadtimeInput = document.getElementById('leadtime-input');
  var leadtimePerSkuCheckbox = document.getElementById('leadtime-per-sku');
  var leadtimePerSkuSection = document.getElementById('leadtime-persku-section');
  var leadtimeTableBody = document.getElementById('leadtime-table-body');

  // Safety stock
  var safetySection = document.getElementById('safety-section');
  // Formula labels
  var formulaSafetyStock = document.getElementById('formula-safety-stock');
  var formulaSafetyLabel = document.getElementById('formula-safety-label');
  var formulaLeadtimeLabel = document.getElementById('formula-leadtime-label');

  // =========================================
  // STATE
  // =========================================
  var currentHorizon = 30;
  var currentData = null;
  var currentStock = null;
  var selectedFile = null;
  var uploadError = null;       // current file-validation error message (string | null)
  var hasTriedSubmit = false;   // true after user clicks "Run forecast on my data"
  var isDemo = false;
  var globalLeadTime = 7;
  var perSkuLeadTime = {};
  var usePerSkuLeadTime = false;
  var parsedStockCsvData = null;
  var targetCoverage = 30;       // Target coverage in days (decoupled from forecast horizon)
  var serviceLevel = 1.65;       // Z-score: 1.28=90%, 1.65=95%, 2.33=99%
  var serviceLevelLabel = '95%';
  var TODAY = new Date();         // Single source of truth for "today" — frozen at page load
  var currentMetrics = null;      // Per-SKU computed metrics — single source for all UI sections
  var metricsEngine = (typeof window !== 'undefined') ? window.StackwiseMetrics : null;


  // =========================================
  // OPTION SWITCHING — Demo vs Upload
  // =========================================
  function setActiveOption(mode) {
    if (mode === 'demo') {
      optionDemo.classList.add('try-input__option--active');
      optionUpload.classList.remove('try-input__option--active');
    } else {
      optionUpload.classList.add('try-input__option--active');
      optionDemo.classList.remove('try-input__option--active');
    }
  }

  if (optionDemo) {
    optionDemo.addEventListener('click', function (e) {
      if (e.target === btnDemo || e.target.closest('.try-input__btn')) return;
      setActiveOption('demo');
    });
  }

  if (optionUpload) {
    optionUpload.addEventListener('click', function (e) {
      if (e.target === btnUpload || e.target.closest('.try-input__btn') ||
          e.target === csvInput || e.target.closest('.try-upload__dropzone') ||
          e.target.closest('.try-upload__file-info')) return;
      setActiveOption('upload');
    });
  }


  // =========================================
  // FILE UPLOAD HANDLING (Sales CSV)
  // =========================================
  function showError(message) {
    uploadError = (typeof message === 'string' && message.length > 0) ? message : null;
    if (uploadError !== null) {
      uploadErrorEl.hidden = false;
      uploadErrorTextEl.textContent = uploadError;
    } else {
      hideError();
    }
  }

  function hideError() {
    uploadError = null;
    uploadErrorEl.hidden = true;
    uploadErrorTextEl.textContent = '';
  }

  function showFileInfo(file) {
    fileInfo.hidden = false;
    fileName.textContent = file.name;
    dropzone.hidden = true;
    btnUpload.disabled = false;
    hideError();
  }

  function clearFile() {
    selectedFile = null;
    fileInfo.hidden = true;
    dropzone.hidden = false;
    csvInput.value = '';
    btnUpload.disabled = true;
    hideError();
    hasTriedSubmit = false;
  }

  function validateFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showError(ERROR_MESSAGES.wrongFileType);
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError(ERROR_MESSAGES.fileTooLarge);
      return false;
    }
    if (file.size === 0) {
      showError(ERROR_MESSAGES.emptyFile);
      return false;
    }
    return true;
  }

  function handleFileSelect(file) {
    if (!file) return;
    setActiveOption('upload');
    hideError();              // clear any previous error immediately
    hasTriedSubmit = false;   // reset submit-attempt tracking for the new file
    if (validateFile(file)) {
      selectedFile = file;
      showFileInfo(file);
    }
  }

  if (csvInput) {
    csvInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        handleFileSelect(this.files[0]);
      }
    });
  }

  if (fileRemove) {
    fileRemove.addEventListener('click', function (e) {
      e.stopPropagation();
      clearFile();
    });
  }

  if (dropzone) {
    ['dragenter', 'dragover'].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropzone.classList.add('try-upload__dropzone--drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropzone.classList.remove('try-upload__dropzone--drag-over');
      });
    });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });
  }


  // =========================================
  // CSV PARSING (Sales)
  // =========================================
  function parseCSV(text) {
    var lines = text.trim().split('\n');
    if (lines.length < 2) return { error: 'emptyFile' };

    var headers = lines[0].toLowerCase().split(',').map(function (h) {
      return h.trim().replace(/['"]/g, '');
    });

    var dateCol = findColumn(headers, ['date', 'order_date', 'sale_date', 'created_at', 'order_created']);
    var skuCol = findColumn(headers, ['sku', 'product_id', 'item_id', 'variant_sku', 'product_sku']);
    var qtyCol = findColumn(headers, ['quantity_sold', 'quantity', 'qty', 'units_sold', 'qty_sold', 'units']);

    if (dateCol === -1 || skuCol === -1 || qtyCol === -1) return { error: 'missingColumns' };
    if (lines.length - 1 > 10000) return { error: 'tooManyRows' };

    var skus = {};
    for (var i = 1; i < lines.length; i++) {
      var cols = lines[i].split(',');
      if (cols.length > skuCol) {
        var sku = cols[skuCol].trim().replace(/['"]/g, '');
        if (sku) skus[sku] = true;
      }
    }
    if (Object.keys(skus).length > 200) return { error: 'tooManySKUs' };

    return { success: true, rowCount: lines.length - 1, skuCount: Object.keys(skus).length, headers: headers };
  }

  function findColumn(headers, candidates) {
    for (var i = 0; i < candidates.length; i++) {
      var idx = headers.indexOf(candidates[i]);
      if (idx !== -1) return idx;
    }
    return -1;
  }


  // =========================================
  // RUN FORECAST (Demo or Upload)
  // =========================================
  if (btnDemo) {
    btnDemo.addEventListener('click', function () {
      currentData = SAMPLE_SKUS;
      currentStock = null;
      isDemo = true;
      resultsSource.textContent = 'Sample dataset · ' + SAMPLE_SKUS.length + ' SKUs · 6 months of history';
      showResults();
    });
  }

  if (btnUpload) {
    btnUpload.addEventListener('click', function () {
      if (!selectedFile) return;
      hasTriedSubmit = true;
      btnUpload.disabled = true;
      btnUpload.textContent = 'Processing…';

      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var result = parseCSV(e.target.result);
          if (result.error) {
            showError(ERROR_MESSAGES[result.error]);
            btnUpload.disabled = false;
            btnUpload.textContent = 'Run forecast on my data';
            return;
          }
          hideError();   // explicitly clear error on successful parse
          currentData = SAMPLE_SKUS.slice(0, Math.min(result.skuCount, 12));
          currentStock = null;
          isDemo = false;
          resultsSource.textContent = selectedFile.name + ' · ' + result.skuCount + ' SKUs · ' + result.rowCount + ' rows';
          showResults();
          btnUpload.disabled = false;
          btnUpload.textContent = 'Run forecast on my data';
        } catch (err) {
          showError(ERROR_MESSAGES.parseError);
          btnUpload.disabled = false;
          btnUpload.textContent = 'Run forecast on my data';
        }
      };
      reader.onerror = function () {
        showError(ERROR_MESSAGES.parseError);
        btnUpload.disabled = false;
        btnUpload.textContent = 'Run forecast on my data';
      };
      reader.readAsText(selectedFile);
    });
  }


  // =========================================
  // HELPERS — kept thin, used by canonical compute
  // =========================================

  function avgDailySales(item, horizon) {
    var horizonKey = 'd' + horizon;
    return (item[horizonKey] || 0) / horizon;
  }

  function getStdDev(item) {
    if (item.stdDev !== undefined && item.stdDev !== null) return item.stdDev;
    var avg = avgDailySales(item, 30);
    return avg * 0.3;
  }

  function volatilityLabel(cv) {
    if (cv === null || cv === undefined) return '—';
    if (cv < 0.5) return 'Stable';
    if (cv < 1.0) return 'Moderate';
    return 'Volatile';
  }

  function volatilityClass(cv) {
    if (cv === null || cv === undefined) return 'volatility--na';
    if (cv < 0.5) return 'volatility--stable';
    if (cv < 1.0) return 'volatility--moderate';
    return 'volatility--volatile';
  }

  function getLeadTime(sku) {
    if (usePerSkuLeadTime && perSkuLeadTime[sku] !== undefined) {
      return perSkuLeadTime[sku];
    }
    return globalLeadTime;
  }

  function sanitizeStockInput(value) {
    if (metricsEngine && metricsEngine.sanitizeNonNegativeInteger) {
      return metricsEngine.sanitizeNonNegativeInteger(value, 0);
    }
    var num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return 0;
    return num;
  }


  // =========================================
  // DISPLAY FORMATTERS
  // Pure display layer — accepts pre-computed
  // metric values. Never re-computes math.
  // Never outputs raw null, Infinity, or NaN.
  // =========================================

  /**
   * Display-safe coverage days.
   * Math layer: Infinity = infinite coverage (no demand, stock > 0).
   * Display:    Infinity → "—", null → "—", finite → "Xd".
   * @param {number|null} coverageDays — pre-computed from metrics engine
   * @returns {string}
   */
  function formatCoverageDays(coverageDays) {
    if (coverageDays === null || coverageDays === undefined) return '—';
    if (typeof coverageDays !== 'number' || !isFinite(coverageDays)) return '—';
    return Math.round(coverageDays) + 'd';
  }

  /**
   * Display-safe coefficient of variation.
   * Math layer: null = not measurable (no demand).
   * Display:    null → "—", finite → "X.XX".
   * @param {number|null} cv — pre-computed from metrics engine
   * @returns {string}
   */
  function formatCV(cv) {
    if (cv === null || cv === undefined) return '—';
    if (typeof cv !== 'number' || !isFinite(cv)) return '—';
    return cv.toFixed(2);
  }


  // =========================================
  // CANONICAL PER-SKU METRICS
  // Single source of truth — every UI section
  // (table, reorder list, health overview)
  // reads from this computed array.
  // =========================================
  function computeSkuMetrics(data, stock, horizon) {
    if (!metricsEngine || !metricsEngine.computeSkuMetrics) {
      return [];
    }

    var base = metricsEngine.computeSkuMetrics(data, {
      stockBySku: stock,
      horizon: horizon,
      targetCoverageDays: targetCoverage,
      serviceLevelZ: serviceLevel,
      globalLeadTime: globalLeadTime,
      usePerSkuLeadTime: usePerSkuLeadTime,
      perSkuLeadTime: perSkuLeadTime
    }, TODAY);

    return base.map(function (m) {
      var unitsAtRisk = m.daysOutOfStock > 0 ? Math.ceil(m.avgDaily * m.daysOutOfStock) : 0;
      return {
        item: m.item,
        sku: m.sku,
        name: m.name,
        stock: m.stock,
        avgDaily: m.avgDaily,
        stdDevDaily: m.stdDevDaily,
        cv: m.cv,
        volLabel: volatilityLabel(m.cv),
        volClass: volatilityClass(m.cv),
        leadTime: m.leadTimeDays,
        price: m.unitPrice,
        unitPrice: m.unitPrice,
        coverageDays: m.coverageDays,
        safetyStock: m.safetyStock,
        reorderQty: m.reorderQty,
        risk: m.risk,
        riskTier: m.riskTier,
        lastSafeReorderDate: m.lastSafeReorderDate,
        daysOutOfStock: m.daysOutOfStock,
        lostRevenue: m.lostRevenue,
        unitsAtRisk: unitsAtRisk,
        overdue: m.overdue,
        slowMover: m.slowMover,
        overstocked: m.overstocked,
        forecast: m.forecast,
        velocityPct: m.velocityPct,
        velocityDir: m.velocityDir
      };
    });
  }


  // =========================================
  // CANONICAL OVERVIEW METRICS
  // Reduces the per-SKU metrics array into
  // aggregate numbers for the health cards.
  // =========================================
  function computeOverviewMetrics(skuMetrics) {
    if (!metricsEngine || !metricsEngine.computeOverviewMetrics) {
      return {
        skusAtRisk: 0,
        overdueReorders: 0,
        avgCoverage: 0,
        totalLostRevenue: 0,
        capitalInSlowMovers: 0,
        overdueSubtitle: 'No overdue reorders'
      };
    }

    return metricsEngine.computeOverviewMetrics(skuMetrics, {
      monetaryBasis: 'unit_price'
    });
  }

  function formatCurrency(val) {
    if (val === null || val === undefined) return '—';
    if (val >= 1000) return '$' + (val / 1000).toFixed(1) + 'k';
    return '$' + val.toFixed(2);
  }

  function formatDate(date) {
    if (!date) return '—';
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
  }

  function isInventoryAware() {
    return currentStock !== null && typeof currentStock === 'object';
  }


  // =========================================
  // TAB SWITCHING
  // =========================================
  var tabs = [tabEditor, tabPaste, tabCsv];
  var panels = [panelEditor, panelPaste, panelCsv];

  function activateTab(index) {
    tabs.forEach(function (tab, i) {
      if (!tab) return;
      var isActive = i === index;
      tab.classList.toggle('stock-tabs__tab--active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      if (panels[i]) panels[i].hidden = !isActive;
    });
  }

  tabs.forEach(function (tab, i) {
    if (tab) {
      tab.addEventListener('click', function () {
        activateTab(i);
      });
    }
  });


  // =========================================
  // STOCK STATUS INDICATOR
  // =========================================
  function updateStockStatus() {
    if (!currentData || !stockStatus) return;

    var total = currentData.length;
    var filled = 0;
    if (currentStock) {
      currentData.forEach(function (item) {
        if (currentStock[item.sku] !== undefined) filled++;
      });
    }

    stockStatus.hidden = false;
    stockStatusText.textContent = filled + ' of ' + total + ' SKUs filled';

    stockStatus.classList.remove('stock-panel__status--complete', 'stock-panel__status--partial');
    if (filled === total && filled > 0) {
      stockStatus.classList.add('stock-panel__status--complete');
    } else if (filled > 0) {
      stockStatus.classList.add('stock-panel__status--partial');
    }
  }


  // =========================================
  // STOCK EDITOR (Tab 1)
  // =========================================
  function buildEditorTable() {
    if (!currentData || !stockEditorBody) return;
    var html = '';
    currentData.forEach(function (item) {
      var val = (currentStock && currentStock[item.sku] !== undefined) ? currentStock[item.sku] : '';
      var cls = val !== '' ? 'stock-editor__input--filled' : '';
      html += '<tr>' +
        '<td><span class="mono">' + escapeHtml(item.sku) + '</span></td>' +
        '<td>' + escapeHtml(item.name) + '</td>' +
        '<td><input type="number" class="stock-editor__input ' + cls + '" data-sku="' + escapeHtml(item.sku) + '" value="' + val + '" min="0" placeholder="—" /></td>' +
        '</tr>';
    });
    stockEditorBody.innerHTML = html;

    var inputs = stockEditorBody.querySelectorAll('.stock-editor__input');
    inputs.forEach(function (inp) {
      inp.addEventListener('input', onEditorInput);
      inp.addEventListener('paste', onEditorPaste);
    });

    updateEditorButtonState();
  }

  function onEditorInput() {
    var val = this.value.trim();
    this.classList.toggle('stock-editor__input--filled', val !== '' && !isNaN(parseInt(val, 10)));
    this.classList.toggle('stock-editor__input--error', val !== '' && (isNaN(parseInt(val, 10)) || parseInt(val, 10) < 0));
    updateEditorButtonState();
  }

  function onEditorPaste(e) {
    var text = (e.clipboardData || window.clipboardData).getData('text');
    if (!text) return;

    var lines = text.trim().split(/\n/);
    if (lines.length <= 1) return;

    e.preventDefault();
    var inputs = stockEditorBody.querySelectorAll('.stock-editor__input');
    var startIdx = Array.prototype.indexOf.call(inputs, this);

    lines.forEach(function (line, i) {
      var idx = startIdx + i;
      if (idx >= inputs.length) return;
      var parts = line.split(/[\t,]+/);
      var val = parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
      var num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0) {
        inputs[idx].value = num;
        inputs[idx].classList.add('stock-editor__input--filled');
        inputs[idx].classList.remove('stock-editor__input--error');
      }
    });

    updateEditorButtonState();
  }

  function updateEditorButtonState() {
    if (!stockEditorBody || !btnApplyEditor) return;
    var inputs = stockEditorBody.querySelectorAll('.stock-editor__input');
    var anyFilled = false;
    inputs.forEach(function (inp) {
      if (inp.value.trim() !== '' && !isNaN(parseInt(inp.value, 10)) && parseInt(inp.value, 10) >= 0) {
        anyFilled = true;
      }
    });
    btnApplyEditor.disabled = !anyFilled;
  }

  if (btnSetDefault) {
    btnSetDefault.addEventListener('click', function () {
      var inputs = stockEditorBody.querySelectorAll('.stock-editor__input');
      inputs.forEach(function (inp) {
        if (inp.value.trim() === '') {
          inp.value = '0';
          inp.classList.add('stock-editor__input--filled');
          inp.classList.remove('stock-editor__input--error');
        }
      });
      updateEditorButtonState();
    });
  }

  if (btnClearStock) {
    btnClearStock.addEventListener('click', function () {
      var inputs = stockEditorBody.querySelectorAll('.stock-editor__input');
      inputs.forEach(function (inp) {
        inp.value = '';
        inp.classList.remove('stock-editor__input--filled', 'stock-editor__input--error');
      });
      updateEditorButtonState();
    });
  }

  if (btnApplyEditor) {
    btnApplyEditor.addEventListener('click', function () {
      var stock = {};
      var inputs = stockEditorBody.querySelectorAll('.stock-editor__input');

      inputs.forEach(function (inp) {
        var sku = inp.getAttribute('data-sku');
        stock[sku] = sanitizeStockInput(inp.value);
      });

      if (Object.keys(stock).length === 0) return;

      currentStock = stock;
      onStockApplied(Object.keys(stock).length, 'editor');
    });
  }


  // =========================================
  // PASTE INPUT (Tab 2)
  // =========================================
  var pasteDebounce = null;

  if (pasteTextarea) {
    pasteTextarea.addEventListener('input', function () {
      clearTimeout(pasteDebounce);
      pasteDebounce = setTimeout(parsePasteInput, 300);
    });
  }

  function parsePasteInput() {
    var text = pasteTextarea.value.trim();
    if (!text) {
      pastePreview.hidden = true;
      pasteError.hidden = true;
      btnApplyPaste.disabled = true;
      return;
    }

    var lines = text.split('\n');
    var parsed = [];
    var seen = {};
    var duplicates = 0;
    var invalidLines = 0;
    var knownSkus = {};
    if (currentData) {
      currentData.forEach(function (item) {
        knownSkus[item.sku.toUpperCase()] = item.sku;
      });
    }

    lines.forEach(function (line) {
      line = line.trim();
      if (!line) return;

      var parts = line.split(/[\t,]|\s{2,}/);
      if (parts.length < 2) {
        parts = line.split(/\s+/);
      }

      if (parts.length < 2) {
        invalidLines++;
        parsed.push({ sku: line, stock: NaN, status: 'invalid', statusLabel: 'Invalid format' });
        return;
      }

      var sku = parts[0].trim();
      var rawStock = parts[parts.length - 1].trim();

      if (!sku) {
        invalidLines++;
        parsed.push({ sku: '(empty)', stock: NaN, status: 'invalid', statusLabel: 'Missing SKU' });
        return;
      }

      var stockVal = sanitizeStockInput(rawStock);
      var coercedLabel = (rawStock === '' || isNaN(parseInt(rawStock, 10)) || parseInt(rawStock, 10) < 0)
        ? ' (treated as 0)'
        : '';

      var normalizedSku = sku.toUpperCase();
      if (seen[normalizedSku]) {
        parsed.push({ sku: sku, stock: stockVal, status: 'duplicate', statusLabel: 'Duplicate — skipped' });
        duplicates++;
        return;
      }

      seen[normalizedSku] = true;
      var matched = knownSkus[normalizedSku];
      parsed.push({
        sku: matched || sku,
        stock: stockVal,
        status: matched ? 'matched' : 'unmatched',
        statusLabel: (matched ? 'Matched' : 'Not in sales data') + coercedLabel
      });
    });

    var matchedCount = parsed.filter(function (p) { return p.status === 'matched'; }).length;
    var totalValid = parsed.filter(function (p) { return p.status === 'matched' || p.status === 'unmatched'; }).length;

    pastePreview.hidden = false;
    pastePreviewCount.textContent = matchedCount + ' matched' +
      (totalValid > matchedCount ? ', ' + (totalValid - matchedCount) + ' unmatched' : '') +
      (invalidLines > 0 ? ', ' + invalidLines + ' invalid' : '') +
      (duplicates > 0 ? ', ' + duplicates + ' duplicate' : '');

    var html = '';
    parsed.forEach(function (p) {
      html += '<tr>' +
        '<td><span class="mono">' + escapeHtml(p.sku) + '</span></td>' +
        '<td><span class="mono">' + (isNaN(p.stock) ? '—' : p.stock) + '</span></td>' +
        '<td><span class="paste-status--' + p.status + '">' + p.statusLabel + '</span></td>' +
        '</tr>';
    });
    pastePreviewBody.innerHTML = html;

    btnApplyPaste.disabled = matchedCount === 0 && totalValid === 0;

    if (matchedCount === 0 && totalValid > 0) {
      pasteError.hidden = false;
      pasteErrorText.textContent = 'None of the pasted SKUs match your sales data. Stock will still be stored but won\'t affect risk calculations.';
    } else {
      pasteError.hidden = true;
    }

    pasteTextarea._parsed = parsed;
  }

  if (btnApplyPaste) {
    btnApplyPaste.addEventListener('click', function () {
      var parsed = pasteTextarea._parsed;
      if (!parsed) return;

      var stock = {};
      parsed.forEach(function (p) {
        if ((p.status === 'matched' || p.status === 'unmatched') && !isNaN(p.stock)) {
          stock[p.sku] = p.stock;
        }
      });

      if (Object.keys(stock).length === 0) return;
      currentStock = stock;
      onStockApplied(Object.keys(stock).length, 'paste');
    });
  }


  // =========================================
  // CSV UPLOAD WITH COLUMN MAPPING (Tab 3)
  // =========================================
  if (stockCsvDropzone) {
    ['dragenter', 'dragover'].forEach(function (evt) {
      stockCsvDropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        stockCsvDropzone.classList.add('stock-csv__dropzone--drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      stockCsvDropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        stockCsvDropzone.classList.remove('stock-csv__dropzone--drag-over');
      });
    });
    stockCsvDropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleStockCsvFile(e.dataTransfer.files[0]);
      }
    });
  }

  if (stockCsvInput) {
    stockCsvInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        handleStockCsvFile(this.files[0]);
      }
    });
  }

  if (stockCsvFileRemove) {
    stockCsvFileRemove.addEventListener('click', function (e) {
      e.stopPropagation();
      resetStockCsvUpload();
    });
  }

  function resetStockCsvUpload() {
    parsedStockCsvData = null;
    if (stockCsvInput) stockCsvInput.value = '';
    if (stockCsvFileInfo) stockCsvFileInfo.hidden = true;
    if (stockCsvDropzone) stockCsvDropzone.hidden = false;
    if (stockCsvMapping) stockCsvMapping.hidden = true;
    if (stockCsvMatch) stockCsvMatch.hidden = true;
    if (stockCsvError) stockCsvError.hidden = true;
    if (stockCsvFooter) stockCsvFooter.hidden = true;
    if (mapSkuCol) mapSkuCol.innerHTML = '<option value="">— Select —</option>';
    if (mapStockCol) mapStockCol.innerHTML = '<option value="">— Select —</option>';
  }

  function handleStockCsvFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      stockCsvError.hidden = false;
      stockCsvErrorText.textContent = 'This file isn\'t a CSV. Please upload a .csv file.';
      return;
    }
    if (file.size === 0) {
      stockCsvError.hidden = false;
      stockCsvErrorText.textContent = 'This file appears to be empty.';
      return;
    }

    stockCsvError.hidden = true;
    stockCsvFileName.textContent = file.name;
    stockCsvFileInfo.hidden = false;
    stockCsvDropzone.hidden = true;

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var text = e.target.result;
        var lines = text.trim().split('\n');
        if (lines.length < 2) {
          stockCsvError.hidden = false;
          stockCsvErrorText.textContent = 'CSV has no data rows. At least one header row and one data row are required.';
          return;
        }

        var headers = lines[0].split(',').map(function (h) { return h.trim().replace(/['"]/g, ''); });
        var rows = [];
        for (var i = 1; i < lines.length; i++) {
          var cols = lines[i].split(',').map(function (c) { return c.trim().replace(/['"]/g, ''); });
          if (cols.length >= headers.length) rows.push(cols);
        }

        parsedStockCsvData = { headers: headers, rows: rows };

        mapSkuCol.innerHTML = '<option value="">— Select —</option>';
        mapStockCol.innerHTML = '<option value="">— Select —</option>';
        headers.forEach(function (h, idx) {
          var opt1 = document.createElement('option');
          opt1.value = idx;
          opt1.textContent = h;
          mapSkuCol.appendChild(opt1);

          var opt2 = document.createElement('option');
          opt2.value = idx;
          opt2.textContent = h;
          mapStockCol.appendChild(opt2);
        });

        var skuGuess = findColumn(headers.map(function (h) { return h.toLowerCase(); }), ['sku', 'product_id', 'item_id', 'variant_sku', 'product_sku', 'item']);
        var stockGuess = findColumn(headers.map(function (h) { return h.toLowerCase(); }), ['current_stock', 'stock', 'quantity_on_hand', 'on_hand', 'inventory', 'qty', 'quantity']);

        if (skuGuess !== -1) mapSkuCol.value = skuGuess;
        if (stockGuess !== -1) mapStockCol.value = stockGuess;

        stockCsvMapping.hidden = false;
        stockCsvFooter.hidden = false;
        updateCsvMappingPreview();
      } catch (err) {
        stockCsvError.hidden = false;
        stockCsvErrorText.textContent = 'Could not parse this file. Ensure it\'s a valid CSV.';
      }
    };
    reader.readAsText(file);
  }

  if (mapSkuCol) mapSkuCol.addEventListener('change', updateCsvMappingPreview);
  if (mapStockCol) mapStockCol.addEventListener('change', updateCsvMappingPreview);

  function updateCsvMappingPreview() {
    if (!parsedStockCsvData) return;
    var skuIdx = parseInt(mapSkuCol.value, 10);
    var stockIdx = parseInt(mapStockCol.value, 10);

    if (isNaN(skuIdx) || isNaN(stockIdx)) {
      stockCsvMatch.hidden = true;
      btnApplyCsv.disabled = true;
      return;
    }

    if (skuIdx === stockIdx) {
      stockCsvError.hidden = false;
      stockCsvErrorText.textContent = 'SKU and Stock columns must be different.';
      btnApplyCsv.disabled = true;
      return;
    }
    stockCsvError.hidden = true;

    var stock = {};
    var invalidCount = 0;
    parsedStockCsvData.rows.forEach(function (row) {
      var sku = row[skuIdx] ? row[skuIdx].trim() : '';
      if (!sku) { invalidCount++; return; }
      var val = sanitizeStockInput(row[stockIdx]);
      stock[sku] = val;
    });

    var matched = 0;
    var unmatched = [];
    if (currentData) {
      currentData.forEach(function (item) {
        if (stock[item.sku] !== undefined) { matched++; }
        else { unmatched.push(item.sku); }
      });
    }

    var totalEntries = Object.keys(stock).length;
    var salesSkuCount = currentData ? currentData.length : 0;
    var matchPct = salesSkuCount > 0 ? Math.round((matched / salesSkuCount) * 100) : 0;

    stockCsvMatch.hidden = false;
    stockCsvMatchFill.style.width = matchPct + '%';
    var matchText = 'Matched ' + matched + '/' + salesSkuCount + ' SKUs.';
    if (unmatched.length > 0) matchText += ' ' + unmatched.length + ' missing.';
    if (invalidCount > 0) matchText += ' ' + invalidCount + ' rows skipped (invalid).';
    stockCsvMatchText.textContent = matchText;

    if (unmatched.length > 0) {
      stockCsvUnmatched.hidden = false;
      stockCsvUnmatchedList.textContent = unmatched.join(', ');
    } else {
      stockCsvUnmatched.hidden = true;
    }

    btnApplyCsv.disabled = totalEntries === 0;
    mapSkuCol._parsedStock = stock;
  }

  if (btnApplyCsv) {
    btnApplyCsv.addEventListener('click', function () {
      var stock = mapSkuCol._parsedStock;
      if (!stock || Object.keys(stock).length === 0) return;
      currentStock = stock;
      onStockApplied(Object.keys(stock).length, 'csv');
    });
  }


  // =========================================
  // SAMPLE STOCK (Demo shortcut)
  // =========================================
  if (btnSampleStock) {
    btnSampleStock.addEventListener('click', function () {
      currentStock = JSON.parse(JSON.stringify(SAMPLE_STOCK));
      onStockApplied(Object.keys(SAMPLE_STOCK).length, 'sample');
    });
  }


  // =========================================
  // STOCK APPLIED — Common handler
  // =========================================
  function onStockApplied(count, method) {
    var matched = 0;
    var unmatched = [];
    if (currentData) {
      currentData.forEach(function (item) {
        if (currentStock[item.sku] !== undefined) { matched++; }
        else { unmatched.push(item.sku); }
      });
    }

    showStockSuccess(matched, currentData ? currentData.length : 0, unmatched);

    if (leadtimeSection) leadtimeSection.hidden = false;
    if (safetySection) safetySection.hidden = false;
    buildLeadTimeTable();

    updateStockStatus();
    updateModeUI();
    renderTable();
    renderReorderList();
  }

  function showStockSuccess(matched, total, unmatched) {
    var stockPanel = document.getElementById('stock-input-section');
    if (stockPanel) stockPanel.classList.add('stock-panel--collapsed');

    stockSuccess.hidden = false;
    stockSuccessTitle.textContent = 'Stock levels applied';
    var desc = matched + ' of ' + total + ' SKUs matched.';
    if (unmatched.length > 0) {
      desc += ' ' + unmatched.length + ' SKU(s) missing stock: ' + unmatched.slice(0, 5).join(', ');
      if (unmatched.length > 5) desc += '…';
      desc += '. These show forecast-only data.';
    } else {
      desc += ' Risk and reorder columns are now visible.';
    }
    stockSuccessDesc.textContent = desc;
  }

  if (stockSuccessEdit) {
    stockSuccessEdit.addEventListener('click', function () {
      var stockPanel = document.getElementById('stock-input-section');
      if (stockPanel) stockPanel.classList.remove('stock-panel--collapsed');
      stockSuccess.hidden = true;
      buildEditorTable();
      activateTab(0);
    });
  }

  if (stockSuccessRemove) {
    stockSuccessRemove.addEventListener('click', function () {
      currentStock = null;
      stockSuccess.hidden = true;
      if (leadtimeSection) leadtimeSection.hidden = true;
      if (safetySection) safetySection.hidden = true;

      var stockPanel = document.getElementById('stock-input-section');
      if (stockPanel) stockPanel.classList.remove('stock-panel--collapsed');

      buildEditorTable();
      updateStockStatus();
      updateModeUI();
      renderTable();
      renderReorderList();
    });
  }


  // =========================================
  // LEAD TIME
  // =========================================
  if (leadtimeInput) {
    leadtimeInput.addEventListener('input', function () {
      var val = parseInt(this.value, 10);
      if (!isNaN(val) && val >= 0 && val <= 365) {
        globalLeadTime = val;
        updateFormulaLabels();
        if (isInventoryAware()) {
          renderTable();
          renderReorderList();
        }
      }
    });
  }

  if (leadtimePerSkuCheckbox) {
    leadtimePerSkuCheckbox.addEventListener('change', function () {
      usePerSkuLeadTime = this.checked;
      leadtimePerSkuSection.hidden = !this.checked;
      if (this.checked) buildLeadTimeTable();
      if (isInventoryAware()) {
        renderTable();
        renderReorderList();
      }
    });
  }

  function buildLeadTimeTable() {
    if (!currentData || !leadtimeTableBody) return;
    var html = '';
    currentData.forEach(function (item) {
      var val = perSkuLeadTime[item.sku] !== undefined ? perSkuLeadTime[item.sku] : globalLeadTime;
      html += '<tr>' +
        '<td><span class="mono">' + escapeHtml(item.sku) + '</span></td>' +
        '<td>' + escapeHtml(item.name) + '</td>' +
        '<td><input type="number" class="leadtime-sku-input" data-sku="' + escapeHtml(item.sku) + '" value="' + val + '" min="0" max="365" step="1" /></td>' +
        '</tr>';
    });
    leadtimeTableBody.innerHTML = html;

    leadtimeTableBody.querySelectorAll('.leadtime-sku-input').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var sku = this.getAttribute('data-sku');
        var val = parseInt(this.value, 10);
        if (!isNaN(val) && val >= 0) {
          perSkuLeadTime[sku] = val;
          if (isInventoryAware()) {
            renderTable();
            renderReorderList();
          }
        }
      });
    });
  }


  // Safety stock is computed inside computeSkuMetrics(): z × σ_daily × √lead_time

  // =========================================
  // TARGET COVERAGE & SERVICE LEVEL
  // =========================================
  var targetCoverageInput = document.getElementById('target-coverage-input');
  var targetCoverageEcho = document.getElementById('target-coverage-echo');
  var serviceLevelSelect = document.getElementById('service-level-select');

  if (targetCoverageInput) {
    targetCoverageInput.addEventListener('input', function () {
      var val = parseInt(this.value, 10);
      if (!isNaN(val) && val >= 1 && val <= 180) {
        targetCoverage = val;
        if (targetCoverageEcho) targetCoverageEcho.textContent = val;
        if (isInventoryAware()) {
          renderTable();
          renderReorderList();
        }
      }
    });
  }

  if (serviceLevelSelect) {
    serviceLevelSelect.addEventListener('change', function () {
      var val = parseFloat(this.value);
      if (!isNaN(val)) {
        serviceLevel = val;
        serviceLevelLabel = this.options[this.selectedIndex].text;
        updateFormulaLabels();
        if (isInventoryAware()) {
          renderTable();
          renderReorderList();
        }
      }
    });
  }


  // =========================================
  // FORMULA LABEL UPDATES
  // =========================================
  function updateFormulaLabels() {
    if (formulaSafetyStock) formulaSafetyStock.textContent = 'z × sigma_daily × sqrt(lead_time_days)';
    if (formulaSafetyLabel) formulaSafetyLabel.textContent = serviceLevelLabel + ' service level';
    if (formulaLeadtimeLabel) formulaLeadtimeLabel.textContent = globalLeadTime + ' days';
  }


  // =========================================
  // MODE UI MANAGEMENT
  // =========================================
  function updateModeUI() {
    var inventoryMode = isInventoryAware();
    var skuCount = currentData ? currentData.length : 0;

    if (inventoryMode) {
      var matched = 0;
      if (currentData && currentStock) {
        currentData.forEach(function (item) {
          if (currentStock[item.sku] !== undefined) matched++;
        });
      }
      modeTitle.textContent = 'Inventory-aware mode';
      modeDesc.textContent = 'Stock levels applied for ' + matched + '/' + skuCount + ' SKUs. Showing risk assessment, stock coverage, and reorder suggestions.';
      modeBanner.className = 'try-results__mode-banner try-results__mode-banner--inventory';
    } else {
      modeTitle.textContent = 'Forecast-only mode';
      modeDesc.textContent = 'Forecast-only mode. Add stock to unlock reorder timing and risk.';
      modeBanner.className = 'try-results__mode-banner';
    }

    stockColumns = document.querySelectorAll('.stock-col');
    stockColumns.forEach(function (col) {
      col.hidden = !inventoryMode;
    });

    if (reorderPanel) reorderPanel.hidden = !inventoryMode;
  }


  // =========================================
  // RENDER RESULTS
  // =========================================
  function showResults() {
    resultsSection.hidden = false;
    currentHorizon = 30;
    updateHorizonUI();
    updateModeUI();
    renderTable();
    renderReorderList();

    if (stockInputSection) {
      stockInputSection.hidden = false;
      stockInputSection.classList.remove('stock-panel--collapsed');
      stockSuccess.hidden = true;
      if (leadtimeSection) leadtimeSection.hidden = true;
      if (safetySection) safetySection.hidden = true;
    }

    // Show demo CTA only in demo mode; hide for user uploads
    if (stockDemoCta) {
      if (isDemo) {
        stockDemoCta.hidden = false;
        var demoNote = stockDemoCta.querySelector('.stock-panel__demo-note');
        if (demoNote) demoNote.textContent = 'Pre-fills stock for all ' + currentData.length + ' demo SKUs';
      } else {
        stockDemoCta.hidden = true;
      }
    }

    buildEditorTable();
    updateStockStatus();

    if (gateForm) gateForm.hidden = false;
    if (gateSuccess) gateSuccess.hidden = true;

    setTimeout(function () {
      var offset = 80;
      var top = resultsSection.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }, 100);
  }

  function renderTable() {
    if (!currentData || currentData.length === 0) {
      resultsEmpty.hidden = false;
      skuTableBody.innerHTML = '';
      return;
    }

    // Compute canonical metrics — single source for table, reorder list, and overview
    currentMetrics = computeSkuMetrics(currentData, currentStock, currentHorizon);

    resultsEmpty.hidden = true;
    var inventoryMode = isInventoryAware();
    var html = '';

    currentMetrics.forEach(function (m) {
      var velocityClass = 'velocity--' + m.velocityDir;
      var velocitySign = m.velocityPct > 0 ? '+' : '';
      var velocityArrow = m.velocityDir === 'up' ? '↑' :
                          m.velocityDir === 'down' ? '↓' : '→';

      var cvTooltip = m.cv === null
        ? 'Not measurable (no demand)'
        : 'Coefficient of variation: ' + formatCV(m.cv) + '. std_dev (' + m.stdDevDaily.toFixed(1) + ') ÷ avg_daily (' + m.avgDaily.toFixed(1) + ')';

      html += '<tr>' +
        '<td><span class="mono">' + escapeHtml(m.sku) + '</span></td>' +
        '<td>' + escapeHtml(m.name) + '</td>' +
        '<td><span class="mono">' + m.forecast + ' units</span></td>' +
        '<td><span class="mono">' + m.avgDaily.toFixed(1) + '/day</span></td>' +
        '<td><span class="velocity ' + velocityClass + '">' + velocityArrow + ' ' + velocitySign + m.velocityPct + '%</span></td>' +
        '<td><span class="volatility-badge ' + m.volClass + '" title="' + cvTooltip + '">' + m.volLabel + '</span></td>';

      if (inventoryMode) {
        if (m.stock !== null) {
          // Map risk label to CSS class
          var riskClassMap = { 'Stockout': 'risk--critical', 'Reorder now': 'risk--high', 'Watch': 'risk--medium', 'On track': 'risk--low' };
          var riskClass = riskClassMap[m.risk] || 'risk--low';

          // Coverage display
          var coverageText = formatCoverageDays(m.coverageDays);
          var coverageClass = '';
          var coverageTooltip = 'current_stock (' + m.stock + ') ÷ avg_daily (' + m.avgDaily.toFixed(1) + ')';
          if (m.coverageDays === Infinity) {
            coverageTooltip += ' = ∞ (no demand — stock does not deplete)';
            coverageClass = 'coverage--healthy';
          } else if (typeof m.coverageDays === 'number' && isFinite(m.coverageDays)) {
            coverageTooltip += ' = ' + m.coverageDays.toFixed(1) + ' days of supply';
            if (m.coverageDays <= 0) coverageClass = 'coverage--critical';
            else if (m.coverageDays < m.leadTime) coverageClass = 'coverage--critical';
            else if (m.coverageDays < targetCoverage) coverageClass = 'coverage--warning';
            else coverageClass = 'coverage--healthy';
          }

          // Reorder qty — show when risk != On track
          var needsReorder = m.risk !== 'On track' && m.risk !== null;
          var reorderText = needsReorder && m.reorderQty > 0 ? m.reorderQty + ' units' : '—';
          var reorderTooltip = needsReorder
            ? 'ceil(max(0, ' + targetCoverage + ' × ' + m.avgDaily.toFixed(1) + ' + ' + m.safetyStock.toFixed(2) + ' − ' + m.stock + ')) = ' + m.reorderQty
            : 'Coverage ≥ target (' + targetCoverage + 'd). No reorder needed.';

          var reorderDateText = (needsReorder && m.lastSafeReorderDate) ? formatDate(m.lastSafeReorderDate) : '—';
          var reorderDateClass = '';
          if (m.overdue) {
            reorderDateClass = ' style="color: var(--accent-rust); font-weight: 600;"';
          }

          var riskTooltipMap = { 'Stockout': 'No stock remaining', 'Reorder now': 'Will stock out before lead time', 'Watch': 'Below target coverage', 'On track': 'Coverage meets or exceeds target' };
          var riskTooltip = riskTooltipMap[m.risk] || '';

          html += '<td class="stock-col"><span class="mono">' + m.stock + '</span></td>' +
            '<td class="stock-col"><span class="mono ' + coverageClass + '" title="' + coverageTooltip + '">' + coverageText + '</span></td>' +
            '<td class="stock-col"><span class="mono"' + reorderDateClass + '>' + reorderDateText + '</span></td>' +
            '<td class="stock-col"><span class="mono" title="' + reorderTooltip + '">' + reorderText + '</span></td>' +
            '<td class="stock-col"><span class="risk ' + riskClass + '" title="' + riskTooltip + '">' + m.risk + '</span></td>';
        } else {
          html += '<td class="stock-col"><span class="mono text-muted">—</span></td>' +
            '<td class="stock-col"><span class="mono text-muted">—</span></td>' +
            '<td class="stock-col"><span class="mono text-muted">—</span></td>' +
            '<td class="stock-col"><span class="mono text-muted">—</span></td>' +
            '<td class="stock-col"><span class="text-muted">No stock data</span></td>';
        }
      }

      html += '</tr>';
    });

    skuTableBody.innerHTML = html;
  }

  function renderReorderList() {
    if (!currentData || !isInventoryAware()) {
      if (reorderPanel) reorderPanel.hidden = true;
      return;
    }

    if (reorderPanel) reorderPanel.hidden = false;
    updateFormulaLabels();

    // Render Inventory Health Overview from the same metrics
    renderHealthOverview();

    // Filter from canonical currentMetrics: include items where risk != "On track"
    var reorderItems = [];
    if (currentMetrics) {
      currentMetrics.forEach(function (m) {
        if (m.stock === null) return;
        if (m.risk === 'On track' || m.risk === null) return;
        if (m.reorderQty <= 0) return;
        reorderItems.push(m);
      });
    }

    // Sort by risk tier first (lower = more urgent), then coverage ascending
    reorderItems.sort(function (a, b) {
      if (a.riskTier !== b.riskTier) return a.riskTier - b.riskTier;
      var aCov = (a.coverageDays === null || !isFinite(a.coverageDays)) ? 1e9 : a.coverageDays;
      var bCov = (b.coverageDays === null || !isFinite(b.coverageDays)) ? 1e9 : b.coverageDays;
      return aCov - bCov;
    });

    if (reorderItems.length === 0) {
      reorderEmpty.hidden = false;
      reorderList.innerHTML = '';
      reorderCount.textContent = 'No items';
      if (reorderFormula) reorderFormula.hidden = true;
      return;
    }

    reorderEmpty.hidden = true;
    if (reorderFormula) reorderFormula.hidden = false;
    reorderCount.textContent = reorderItems.length + (reorderItems.length === 1 ? ' item needs attention' : ' items need attention');

    var html = '';
    reorderItems.forEach(function (m) {
      var urgencyClass = m.riskTier <= 1 ? 'high' : 'medium';
      var coverageFmt = formatCoverageDays(m.coverageDays);
      var coverageText = coverageFmt === '—' ? '—' : coverageFmt + ' coverage';
      var dateText = m.lastSafeReorderDate ? formatDate(m.lastSafeReorderDate) : '—';

      // Revenue impact
      var impactText = '';
      if (m.lostRevenue > 0 && m.price > 0) {
        impactText = ' · Est. lost revenue: ' + formatCurrency(m.lostRevenue);
      } else if (m.unitsAtRisk > 0 && m.price <= 0) {
        impactText = ' · Units at risk: ' + m.unitsAtRisk;
      }

      html += '<div class="try-results__reorder-item">' +
        '<div class="try-results__reorder-icon try-results__reorder-icon--' + urgencyClass + '">!</div>' +
        '<div>' +
          '<p class="try-results__reorder-name">' + escapeHtml(m.name) +
            ' <span class="reorder-tier reorder-tier--' + urgencyClass + '">' + m.risk + '</span></p>' +
          '<p class="try-results__reorder-meta">' +
            coverageText + ' · ' +
            'Avg ' + m.avgDaily.toFixed(1) + '/day · ' +
            'Lead time ' + m.leadTime + 'd · ' +
            'Last safe reorder date: <strong' + (m.overdue ? ' style="color: var(--accent-rust);"' : '') + '>' + dateText + '</strong>' +
            (m.overdue ? ' (overdue)' : '') +
            impactText +
          '</p>' +
          '<p class="try-results__reorder-meta">Suggested reorder: <strong>' + m.reorderQty + ' units</strong> · ' +
            'Safety stock: ' + m.safetyStock.toFixed(2) + ' units (z=' + serviceLevel + ' × sigma=' + m.stdDevDaily.toFixed(1) + ' × sqrt(' + m.leadTime + '))</p>' +
          '<p class="try-results__reorder-calc mono">(' + targetCoverage + 'd × ' + m.avgDaily.toFixed(1) +
            ') + ' + m.safetyStock.toFixed(2) + ' − ' + m.stock +
            ' = ' + m.reorderQty + ' (after ceil(max(0, ...)))</p>' +
        '</div>' +
      '</div>';
    });

    reorderList.innerHTML = html;
  }

  // =========================================
  // INVENTORY HEALTH OVERVIEW
  // =========================================
  function renderHealthOverview() {
    var container = document.getElementById('health-overview');
    if (!container) return;

    if (!isInventoryAware() || !currentMetrics) {
      container.hidden = true;
      return;
    }

    container.hidden = false;
    var health = computeOverviewMetrics(currentMetrics);

    document.getElementById('health-at-risk').textContent = health.skusAtRisk;
    document.getElementById('health-overdue').textContent = health.overdueReorders;
    document.getElementById('health-avg-coverage').textContent = health.avgCoverage + ' days';
    var overdueSub = document.getElementById('health-overdue-sub');
    if (overdueSub) overdueSub.textContent = health.overdueSubtitle;

    // Revenue impact (unit_price basis)
    var revLabel = document.getElementById('health-lost-revenue-label');
    var revSub = document.getElementById('health-lost-revenue-sub');
    document.getElementById('health-lost-revenue').textContent = formatCurrency(health.totalLostRevenue);
    if (revLabel) revLabel.textContent = 'Potential lost revenue';
    if (revSub) revSub.textContent = 'avg_daily × unit_price × days_out_of_stock (only when coverage < lead_time_days)';

    // Slow movers capital (unit_price basis)
    var slowLabel = document.getElementById('health-slow-capital-label');
    var slowSub = document.getElementById('health-slow-capital-sub');
    var combinedSlowOverstocked = (health.capitalInSlowMovers || 0) + (health.capitalInOverstocked || 0);
    document.getElementById('health-slow-capital').textContent = formatCurrency(combinedSlowOverstocked);
    if (slowLabel) slowLabel.textContent = 'Capital in slow / overstocked';
    if (slowSub) slowSub.textContent = 'slow_mover: velocity_pct < 0; overstocked: coverage_days > target; capital = Σ(stock × unit_price)';

    // Update at-risk sub-label with actual threshold
    var riskSub = document.getElementById('health-at-risk-sub');
    if (riskSub) riskSub.textContent = 'Coverage < target (' + targetCoverage + 'd)';
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }


  // =========================================
  // HORIZON SELECTOR
  // =========================================
  horizonButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentHorizon = parseInt(this.getAttribute('data-horizon'), 10);
      updateHorizonUI();
      renderTable();
      renderReorderList();
    });
  });

  function updateHorizonUI() {
    horizonButtons.forEach(function (btn) {
      var isActive = parseInt(btn.getAttribute('data-horizon'), 10) === currentHorizon;
      btn.classList.toggle('try-results__horizon-btn--active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
    if (horizonLabel) {
      horizonLabel.textContent = 'Next ' + currentHorizon + ' days';
    }
  }


  // =========================================
  // SAVE / EXPORT GATING
  // =========================================
  if (gateForm) {
    gateForm.addEventListener('submit', function (e) {
      e.preventDefault();
      handleGateSubmit('save');
    });
  }

  if (btnMagicLink) {
    btnMagicLink.addEventListener('click', function () {
      if (!gateEmail.value || !gateEmail.checkValidity()) {
        gateEmail.focus();
        return;
      }
      handleGateSubmit('magic-link');
    });
  }

  function handleGateSubmit(action) {
    var email = gateEmail.value;
    if (!email) return;

    btnSave.disabled = true;
    btnMagicLink.disabled = true;

    if (action === 'save') {
      btnSave.textContent = 'Sending…';
    } else {
      btnMagicLink.textContent = 'Sending…';
    }

    setTimeout(function () {
      gateForm.hidden = true;
      gateSuccess.hidden = false;
      gateEmailEcho.textContent = email;
      btnSave.disabled = false;
      btnSave.textContent = 'Save & export results';
      btnMagicLink.disabled = false;
      btnMagicLink.textContent = 'Email me a login link';
    }, 1200);
  }


  // =========================================
  // FAQ ACCORDION
  // =========================================
  document.querySelectorAll('.try-faq .faq__item').forEach(function (item) {
    item.addEventListener('toggle', function () {
      var answer = item.querySelector('.faq__answer');
      if (!answer) return;
      if (item.open) {
        answer.style.maxHeight = '0px';
        answer.style.opacity = '0';
        answer.style.overflow = 'hidden';
        answer.style.transition = 'max-height 400ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 300ms ease';
        requestAnimationFrame(function () {
          answer.style.maxHeight = answer.scrollHeight + 'px';
          answer.style.opacity = '1';
        });
      }
    });
  });


  // =========================================
  // SCROLL TO #UPLOAD ON PAGE LOAD
  // =========================================
  if (window.location.hash === '#upload') {
    setTimeout(function () {
      var target = document.getElementById('upload');
      if (target) {
        var offset = 80;
        var top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    }, 300);
  }


  // =========================================
  // INTERNAL VALIDATION (development aid)
  // Runs after each render to confirm logical
  // consistency. Outputs warnings to console.
  // =========================================
  function validateInternals() {
    if (!currentData || !isInventoryAware() || !currentMetrics) return;

    var errors = [];
    var riskCounts = { 'Stockout': 0, 'Reorder now': 0, 'Watch': 0, 'On track': 0 };
    var lostRevenueOnlyOnStockoutRisk = true;
    var summaryAtRisk = 0;

    currentMetrics.forEach(function (m) {
      if (m.stock === null) return;

      // 1. Check no undefined variables in key computations
      if (m.avgDaily === undefined || m.avgDaily === null) errors.push(m.sku + ': avg_daily is undefined');
      if (m.coverageDays === undefined) errors.push(m.sku + ': coverage is undefined');
      if (m.leadTime === undefined || m.leadTime === null) errors.push(m.sku + ': lead_time is undefined');
      if (m.risk === undefined) errors.push(m.sku + ': risk is undefined');

      // 2. Risk categories are mutually exclusive (only count once)
      if (riskCounts[m.risk] !== undefined) riskCounts[m.risk]++;

      // 3. lost_revenue only appears when coverage < lead_time
      if (m.lostRevenue > 0 && m.coverageDays >= m.leadTime) {
        lostRevenueOnlyOnStockoutRisk = false;
        errors.push(m.sku + ': lost_revenue > 0 but coverage (' + formatCoverageDays(m.coverageDays) + ') >= lead_time (' + m.leadTime + ')');
      }

      // 4. reorder_qty must be 0 or positive
      if (m.reorderQty < 0) {
        errors.push(m.sku + ': reorder_qty is negative (' + m.reorderQty + ')');
      }

      // 5. Track at-risk for summary validation
      if (m.risk === 'Watch' || m.risk === 'Reorder now' || m.risk === 'Stockout') summaryAtRisk++;
    });

    // Verify risk counts sum to total SKUs with stock
    var totalWithStock = 0;
    currentMetrics.forEach(function (m) { if (m.stock !== null) totalWithStock++; });
    var riskSum = riskCounts['Stockout'] + riskCounts['Reorder now'] + riskCounts['Watch'] + riskCounts['On track'];
    if (riskSum !== totalWithStock) {
      errors.push('Risk count mismatch: sum(' + riskSum + ') ≠ SKUs with stock(' + totalWithStock + ')');
    }

    // Verify at-risk matches Stockout + Reorder now + Watch
    var expectedAtRisk = riskCounts['Stockout'] + riskCounts['Reorder now'] + riskCounts['Watch'];
    if (summaryAtRisk !== expectedAtRisk) {
      errors.push('At-risk mismatch: counted(' + summaryAtRisk + ') ≠ Stockout+Reorder now+Watch(' + expectedAtRisk + ')');
    }

    // Verify health overview matches — uses same currentMetrics
    var health = computeOverviewMetrics(currentMetrics);
    if (health.skusAtRisk !== summaryAtRisk) {
      errors.push('Health overview at-risk(' + health.skusAtRisk + ') ≠ computed at-risk(' + summaryAtRisk + ')');
    }

    // Report
    if (errors.length > 0) {
      console.warn('[Stackwise Validation] ' + errors.length + ' issue(s):');
      errors.forEach(function (e) { console.warn('  • ' + e); });
    } else {
      console.info('[Stackwise Validation] All checks passed. Risk: ' +
        riskCounts['Stockout'] + ' stockout, ' + riskCounts['Reorder now'] + ' reorder now, ' +
        riskCounts['Watch'] + ' watch, ' + riskCounts['On track'] + ' on track. ' +
        'Lost revenue restricted to coverage < lead_time: ' + lostRevenueOnlyOnStockoutRisk);
    }
  }

  // Hook validation into renderTable
  var _originalRenderTable = renderTable;
  renderTable = function () {
    _originalRenderTable();
    validateInternals();
  };

})();
