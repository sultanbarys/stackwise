# Stackwise — Inventory Engine v2 Specification

## Overview

This document defines the upgraded mathematical model, metric definitions, prioritization algorithm, and UI layout for Stackwise's inventory engine. Every formula is deterministic and transparent — no hidden adjustments, no invented data.

---

## 1. Improved Mathematical Model

### Core Inputs (from user)
| Input | Source | Required |
|-------|--------|----------|
| `daily_sales[]` | Derived from sales CSV | Yes |
| `current_stock` | Stock CSV or manual entry | Optional |
| `lead_time` | Global or per-SKU setting | Default: 7 days |
| `target_coverage_days` | User setting | Default: 30 days |
| `service_level` | Dropdown (90%, 95%, 99%) | Default: 95% (z=1.65) |

### Derived Metrics (computed)
| Metric | Formula |
|--------|---------|
| `avg_daily_sales` | `sum(daily_sales) / count(days_with_data)` |
| `std_dev_daily` | `sqrt(sum((daily_sales_i - avg_daily_sales)^2) / (n - 1))` |
| `coefficient_of_variation` | `std_dev_daily / avg_daily_sales` (null when avg_daily ≤ 0) |
| `safety_stock` | `z × std_dev_daily × sqrt(lead_time)` |
| `stock_coverage_days` | `current_stock / avg_daily_sales` (∞ when avg_daily ≤ 0 and stock > 0; 0 when both are 0) |
| `days_out_of_stock` | `max(0, lead_time - coverage_days)` |
| `reorder_qty` | `ceil(max(0, target_coverage_days × avg_daily_sales + safety_stock - current_stock))` (0 when avg_daily ≤ 0) |
| `last_safe_reorder_date` | `today + max(0, coverage_days - lead_time)` |
| `lost_revenue` | `avg_daily_sales × unit_price × days_out_of_stock` (0 when coverage ≥ lead_time) |
| `velocity_pct` | Period-over-period change in avg daily sales |

---

## 2. Metric Definitions

### 2.1 Target Coverage (days)
**What it is:** The number of days of demand you want to cover with each reorder.  
**Default:** 30 days.  
**Why it matters:** The old formula used the full forecast horizon (30/60/90 days) as the coverage target. This is unrealistic — no seller reorders once every 90 days. Target coverage is the user's actual reorder cycle.  
**Effect on reorder quantity:** Higher coverage → larger orders, fewer reorders. Lower coverage → smaller orders, more frequent reorders.

### 2.2 Safety Stock (volatility-based)
**Old formula:** `avg_daily_sales × 7` (naive fixed buffer)  
**New formula:** `z × std_dev_daily × sqrt(lead_time)`  
**Where:**
- `z` = Z-score for desired service level (1.28 for 90%, 1.65 for 95%, 2.33 for 99%)
- `std_dev_daily` = standard deviation of daily sales from historical data
- `lead_time` = supplier lead time in days

**Why this is better:** A flat 7-day buffer ignores demand variability. A SKU selling 100/day with ±5 variance needs less buffer than a SKU selling 100/day with ±40 variance. The volatility-based formula scales safety stock to actual risk.

**Fallback (MVP):** If insufficient data for std_dev (< 7 days history), fall back to `avg_daily_sales × fallback_buffer_days` where fallback_buffer_days defaults to 7.

### 2.3 Coefficient of Variation (Volatility)
**Formula:** `cv = std_dev_daily / avg_daily_sales`  
**Labels:**
- `cv < 0.5` → **Stable** (demand is predictable)
- `0.5 ≤ cv < 1.0` → **Moderate** (some variability)
- `cv ≥ 1.0` → **Volatile** (demand is erratic, forecasts less reliable)

**Displayed as:** Badge in the SKU table with tooltip explaining the metric.

### 2.4 Stock Coverage (days)
**Formula:** `stock_coverage_days = current_stock / avg_daily_sales`  
**Interpretation:** How many days of demand the current stock can satisfy at the current sell rate.  
**Display:** Exact value rounded to nearest integer (e.g., "13 days"), color-coded:
- Green: ≥ target_coverage
- Yellow: between lead_time and target_coverage
- Red: < lead_time (or ≤ 0)

### 2.5 Coverage Days (formerly Days to Stockout)
**Formula:** `coverage_days = current_stock / avg_daily_sales`  
**Edge cases:** When `avg_daily ≤ 0` and `stock > 0`, coverage = ∞ (displayed as "—"). When both are 0, coverage = 0.  
**Display:** Rounded to nearest integer (e.g., "13d"). Tooltip shows: `"current_stock (X) ÷ avg_daily_sales (Y) = Z days"`.

### 2.6 Reorder Quantity
**Old formula:** `(forecast_horizon_demand + safety_stock) - current_stock`  
**New formula:** `ceil(max(0, target_coverage_days × avg_daily_sales + safety_stock - current_stock))`  
**Key difference:** Decouples reorder from the forecast horizon display. User can view a 90-day forecast but only reorder for 30 days of coverage. Result is always a non-negative integer (ceil). When avg_daily ≤ 0, reorder_qty = 0.

### 2.7 Revenue Impact (Lost Revenue)
**Formula:** `lost_revenue = avg_daily_sales × unit_price × days_out_of_stock`  
**Where:**
- `days_out_of_stock = max(0, lead_time_days - coverage_days)`
- `unit_price` = from optional price column in CSV
- Lost revenue is zero when `coverage_days ≥ lead_time_days`

**Assumptions stated in UI:** "Based on average daily sales rate. Actual lost revenue depends on demand elasticity and substitution behavior, which are not modeled."

---

## 3. Reorder Prioritization Algorithm

Items in the reorder list are sorted by urgency tier, then by days to stockout within each tier:

| Priority | Tier | Condition | Label |
|----------|------|-----------|-------|
| 1 | **Stockout** | `coverage ≤ 0` | `Stockout` |
| 2 | **Reorder now** | `coverage < lead_time` | `Reorder now` |
| 3 | **Watch** | `coverage < target_coverage` | `Watch` |
| 4 | **On track** | `coverage ≥ target_coverage` | Not shown in reorder list |

Risk classification depends only on: `coverage`, `lead_time`, `target_coverage`.
`safety_days` is NOT used as a risk threshold.

Within each tier, items are sorted ascending by `days_to_stockout`.

---

## 4. Inventory Health Overview Dashboard

A summary block shown above the SKU table when stock data is provided.

### Metrics displayed:

| Card | Formula | Description |
|------|---------|-------------|
| **SKUs at risk** | Count where `coverage < target_coverage` | SKUs not classified "On track" |
| **Overdue reorders** | Count where `reorder_by_date < today` | SKUs that should have been reordered already |
| **Avg stock coverage** | `mean(stock_coverage_days)` across all SKUs | Average days of inventory on hand |
| **Potential lost revenue** | `sum(avg_daily_sales × price × max(0, lead_time - days_to_stockout))` for at-risk SKUs | Revenue at risk if no action is taken |
| **Capital in slow / overstocked** | `sum(current_stock × unit_price)` for SKUs where `velocity_pct < 0` (slow movers) + SKUs where `coverage_days > target_coverage_days` (overstocked) | Cash tied up in underperforming or excess inventory |

If `price` is not provided, revenue-related metrics display "Requires price data" instead of a number.

---

## 5. Complete Formula List

```
avg_daily_sales        = total_quantity_sold / days_of_history
std_dev_daily          = sqrt(sum((daily_qty - avg)^2) / (n - 1))
coefficient_of_variation = std_dev_daily / avg_daily_sales  (null when avg_daily ≤ 0)
safety_stock           = z × std_dev_daily × sqrt(lead_time)
coverage_days          = current_stock / avg_daily_sales  (∞ when avg_daily ≤ 0 and stock > 0; 0 when both are 0)
reorder_qty            = ceil(max(0, target_coverage × avg_daily_sales + safety_stock - current_stock))  (0 when avg_daily ≤ 0)
last_safe_reorder_date = today + max(0, coverage_days - lead_time)
days_out_of_stock      = max(0, lead_time - coverage_days)
lost_revenue           = avg_daily_sales × unit_price × days_out_of_stock  (0 when coverage ≥ lead_time)
velocity_pct           = ((recent_avg - prior_avg) / prior_avg) × 100
```

### Z-score lookup:
| Service Level | Z-score |
|---------------|---------|
| 90% | 1.28 |
| 95% | 1.65 |
| 99% | 2.33 |

---

## 6. UI Layout Update

### Results section structure (when stock data provided):

```
┌─────────────────────────────────────────────────┐
│  Inventory Health Overview (dashboard cards)     │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │At risk│  │Overdue│  │Avg   │  │Lost  │        │
│  │  4    │  │  2   │  │cover │  │rev   │        │
│  │ SKUs  │  │      │  │22 d  │  │$1.2k │        │
│  └──────┘  └──────┘  └──────┘  └──────┘        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Settings bar                                    │
│  Target coverage: [30] days                      │
│  Service level: [95%]                            │
│  Lead time: [7] days                             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  SKU Demand Table                                │
│  Columns:                                        │
│  SKU | Product | Forecast | Avg Daily |          │
│  Velocity | Volatility | Stock | Coverage |      │
│  Days to Stockout | Reorder Qty | Risk           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Reorder List (prioritized)                      │
│  Sorted by: Overdue > Critical > Below Safety >  │
│  Watch                                           │
│  Each item shows: urgency tier, reorder qty,     │
│  formula breakdown, revenue impact               │
└─────────────────────────────────────────────────┘
```

### New table columns (inventory-aware mode):
| Column | Source | Tooltip |
|--------|--------|---------|
| Volatility | `cv` | "Coefficient of variation: std_dev / mean. Stable < 0.5; Moderate 0.5–1.0; Volatile ≥ 1.0" |
| Coverage | `stock_coverage_days` | "current_stock ÷ avg_daily_sales = X days of supply remaining" |
| Last safe reorder date | `last_safe_reorder_date` | "today + max(0, coverage_days − lead_time_days)" |
| Reorder Qty | `reorder_qty` | "ceil(max(0, target_coverage × avg_daily + safety_stock − current_stock))" |
| Risk | `risk` | "Stockout / Reorder now / Watch / On track" |

---

## 7. MVP Simplification Plan

### Ship first (v2.0):
1. ✅ Target coverage (days) — single global setting with default 30
2. ✅ Volatility-based safety stock with z=1.65 (95% service level)
3. ✅ Stock coverage column
4. ✅ Exact days-to-stockout (remove "~")
5. ✅ Improved reorder formula decoupled from horizon
6. ✅ 4-tier reorder prioritization
7. ✅ Inventory Health Overview (top dashboard)
8. ✅ Coefficient of variation / volatility labels
9. ✅ Tooltips on all calculated columns
10. ✅ Formula transparency block updated

### Ship later (v2.1+):
- Revenue impact (requires price column — most CSVs don't have it)
- Capital tied in slow movers (requires unit cost data)
- Editable per-SKU service levels
- Custom reorder cycle calculator
- ABC classification by revenue contribution

---

## 8. Why This Justifies $19–$49/month

### What spreadsheets cannot do:
1. **Volatility-aware safety stock**: Requires standard deviation calculation per SKU across time series, dynamically updated. A spreadsheet can do this once; it cannot maintain it across weekly uploads.
2. **Prioritized reorder list**: Multi-criteria sorting with urgency tiers is not a native spreadsheet feature. Users would need custom VBA or manual sorting.
3. **Inventory health dashboard**: Aggregating at-risk SKUs, coverage averages, and potential exposure across all products requires formulas that reference dynamic ranges — fragile in spreadsheets.
4. **Forecast + inventory linkage**: Connecting forward demand projection to current stock position, lead time, and safety stock in a unified view is the core value. Each piece alone is simple; the combination is the product.
5. **Transparent, auditable logic**: Every formula is shown. The user can verify any number. This builds trust that enterprise tools (with hidden ML) cannot provide to small sellers.
6. **Time savings**: A weekly reorder review that takes 2–3 hours in spreadsheets takes under 5 minutes with Stackwise. At $19/month, the tool pays for itself if it saves 30 minutes per week of a store operator's time.

### Defensible pricing:
- **$19/month Starter**: Single store, up to 50 SKUs, core forecast + reorder + health dashboard
- **$49/month Growth**: Up to 200 SKUs, volatility analysis, service level configuration, priority support
- **$99/month Pro**: Multi-store, scenario planning, advanced coverage analytics

The logic is strong enough that a user can open the formula block, verify every number against their own spreadsheet, and confirm Stackwise produces the same result — faster and with less error.
