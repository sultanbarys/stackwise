# Stackwise — "Try Stackwise" Page: Copy, Layout & Interaction Reference

## Overview

The Try Stackwise page is a standalone page (`try.html`) that lets visitors interact with the forecast system without creating an account. It supports two paths: running a demo with sample data, or uploading a real CSV. Export and save actions are gated behind email-only magic link sign-in.

---

## Section A — Homepage CTA Block

**Location:** Hero section on `index.html`

**Copy:**
- Primary CTA: **"Try the demo"** → links to `try.html`
- Secondary CTA: **"Upload your CSV"** → links to `try.html#upload`
- Microcopy: "No account required. See results in under a minute."
- Nav CTA: **"Try Stackwise"** (replaces "Start free trial")

**Layout:** Same two-button hero CTA row as before. Primary button uses olive background, secondary uses bordered outline. Microcopy sits directly below in tertiary text, 13px.

**Design note:** No animation change. Existing sequential fade-in (label → headline → sub → CTAs → note) applies.

---

## Section B — Try Stackwise Page: Step-by-Step Explanation

**Location:** Top of `try.html`, below the page headline

**Headline:** "See what your sales data can tell you"
**Subtext:** "Run a demand forecast on sample data or upload your own CSV. No account, no setup, no commitment."

**Step-by-step card:**
- Title: "How the demo works"
- Sub: "Three steps. Results appear on this page."
- Steps:
  1. **Upload your sales CSV** — "Use our sample dataset to explore, or upload your own sales history CSV."
  2. **View your demand forecast** — "See SKU-level demand projections and velocity metrics based on historical sales."
  3. **Optionally add stock levels** — "Provide current stock to unlock risk assessment, days-to-stockout, and reorder suggestions."

**Layout:** Max-width 720px. Steps in a vertical list with mono step numbers (01, 02, 03) left-aligned. Contained in a warm-white card with sand border, 32px padding.

**Animation:** Entire card fades in with standard `anim-fade`. No stagger on individual steps.

---

## Data Input — Demo / Upload Chooser

**Layout:** Two side-by-side options on desktop (1fr auto 1fr grid), stacked on mobile. Each option is a selectable card with radio-style indicator.

### Option 1: "Try with sample data"
- Description: "Explore Stackwise using a pre-loaded dataset of 12 SKUs across 6 months."
- Button: **"Run demo forecast"** (primary)

### Option 2: "Upload your own CSV"
- Description: "Use your real sales history. No account required."
- Upload area appears below when this option is selected
- Dropzone: "Drag your CSV here or **browse**"
- Hint: "CSV files only. Max 5 MB."
- Button: **"Run forecast on my data"** (primary, disabled until file selected)

**Divider:** "or" text in uppercase tertiary between the two options.

**Micro-interactions:**
- Option selection: border transitions from sand to olive (200ms), radio dot fills with olive
- Dropzone hover/dragover: dashed border turns olive, background gets 3% olive tint
- File selected: dropzone is replaced by file info bar (filename + remove button), upload CTA enables
- Error: red-tinted bar appears below dropzone with error icon and message

---

## Section C — Trust / Data Handling Block

**Location:** Below results section on `try.html`

**Title:** "How we handle your data"

**Items (2×2 grid on desktop, 1-column on mobile):**

| Item | Title | Description |
|------|-------|-------------|
| 1 | CSV-only upload | "We only accept CSV files. No store connections, no API access, no tracking scripts on your site." |
| 2 | You control your data | "Files are processed for forecasting only. We don't sell, share, or repurpose your data." |
| 3 | Delete anytime | "Remove your uploads instantly from your account. No questions, no waiting period." |
| 4 | Data retention | "Uploaded files are deleted after 30 days. Demo data is not stored. Retention controls for accounts are being finalized." |

**Layout:** Max-width 720px. Each item has a 20px olive icon, title in 14px/600, description in 13px secondary. Items separated by 24px gap. Bordered top with sand line.

**Design note:** Item 4 uses honest language about retention controls being finalized, per the constraint to not fabricate policies.

---

## Section D — CSV Format Guidance

**Location:** Below the upload chooser, as an expandable accordion

**Summary label:** "CSV format guidance" (expandable, collapsed by default)

**Content when expanded:**

**Intro:** "Your CSV should include columns for dates, product identifiers, and quantities. Below is the recommended format. Column order does not matter."

### Recommended columns

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `date` | Required | Order or sale date | `2025-09-14` |
| `sku` | Required | Unique product identifier | `BK-1042` |
| `quantity_sold` | Required | Units sold in this row | `3` |
| `product_name` | Optional | Human-readable product name | Ceramic Mug — Sage |
| `current_stock` | Optional | Units currently in stock (per SKU) | `120` |

### Example CSV rows
```
date,sku,quantity_sold,product_name,current_stock
2025-09-14,BK-1042,3,Ceramic Mug — Sage,120
2025-09-14,LT-0887,1,Linen Tote — Natural,45
2025-09-15,BK-1042,5,Ceramic Mug — Sage,120
2025-09-15,CN-2215,2,Soy Candle — Cedar,88
```

**Footer note (italic, tertiary):** "This schema is recommended, not enforced. Stackwise will attempt to map common column names (e.g., 'order_date', 'product_id', 'qty') automatically."

**Layout:** Contained in a warm-white card, max-width 720px. Table uses existing `previews__table` styling. Code block uses JetBrains Mono in a cream-background `pre`.

**Micro-interaction:** Chevron rotates 180° on open (same as main FAQ accordion, 200ms).

---

## Section E — Error Messages

All error messages appear in a rosé-tinted bar below the upload area, with a rust-colored warning icon.

| Trigger | Message |
|---------|---------|
| Wrong file type | "This file isn't a CSV. Please upload a .csv file." |
| Empty file | "This file appears to be empty. Upload a CSV with at least one row of data." |
| Missing columns | "We couldn't find the required columns: date, sku, and quantity_sold. Check that your CSV includes these (or similar) column headers." |
| Too many rows | "This file exceeds the demo limit of 10,000 rows. To process larger files, start a free trial." |
| Too many SKUs | "This file contains more than 200 unique SKUs. The demo supports up to 200. Start a free trial for higher limits." |
| File too large | "This file is larger than 5 MB. Try a smaller export or remove unused columns." |
| Parse error | "We had trouble reading this file. Make sure it's a valid CSV with comma-separated values." |

**Design note:** Error bar uses `rgba(184, 92, 58, 0.06)` background, rust text color, 13px font. Appears with no animation (immediate). Disappears when user selects a new valid file.

---

## Results Page — Forecast Output

**Trigger:** Appears after clicking "Run demo forecast" or "Run forecast on my data". Section is initially `hidden`, then revealed with a slide-in animation (opacity 0, translateY 20px → visible, 500ms).

### Results Header
- Title: "Your forecast" (DM Serif Display, 36px)
- Source line: "Sample dataset · 12 SKUs · 6 months of history" (14px tertiary) — or filename/stats for uploaded files
- Forecast horizon selector: pill-style toggle with **30 days** / **60 days** / **90 days**

### Mode Banner
- Displayed immediately below header
- **Forecast-only mode** (default): grey background, info icon. "Showing demand projections and velocity. Stock levels were not provided — risk and reorder columns are hidden."
- **Inventory-aware mode** (when stock loaded): olive-tinted background. "Stock levels provided. Showing risk assessment, days to stockout, and reorder suggestions."

### Stock Input Section
- Appears after forecast runs
- Title: "Add stock levels (optional)"
- Description: "Provide current inventory to calculate stockout risk and reorder suggestions."
- Two options: "Use sample stock data" button OR "Upload stock CSV" file input
- Stock loaded confirmation shows SKU count and any unmatched SKU warnings
- Remove button to go back to forecast-only mode

### SKU Demand Table — Forecast-Only Mode
- Header: "SKU Demand Table" (left) + "Next 30 days" in mono (right)
- Columns: SKU, Product, Forecast Total, Avg Daily, Velocity
- No risk column. No stock column. No reorder indicators.

### SKU Demand Table — Inventory-Aware Mode
- Same header
- Additional columns appear: Stock, Days to Stockout, Risk
- Risk is calculated: `days_to_stockout = current_stock ÷ avg_daily_sales`
  - On track: > 60 days
  - Watch: 30–60 days
  - Reorder soon: < 30 days
- SKUs without stock data show "—" in stock columns with "No stock data" label

### Reorder List (Inventory-Aware Mode only)
- Hidden in forecast-only mode
- Header: "Reorder List" (left) + badge showing count
- Each item shows:
  - Days until stockout
  - Average daily sales rate
  - Suggested reorder quantity (formula-calculated)
  - Formula breakdown: `(forecast_demand + safety_buffer) − current_stock = quantity`
- Formula explanation card at bottom:
  - `suggested_reorder = (forecast_horizon_demand + safety_buffer) − current_stock`
  - Safety buffer = 7 × avg_daily_sales (covers 7 extra days of demand as a cushion)

### Empty States
- SKU table empty: "No SKU data to display. Upload a CSV or run the demo to see results."
- Reorder list empty: "No items need reordering in this time frame."

---

## Section F — Save / Export Gating (Conversion)

**Location:** Below the results panels, inside a card with olive border (2px)

**Title:** "Save your results" (DM Serif Display, 24px)
**Description:** "Export this forecast or save it to revisit later. Enter your email and we'll send a login link — no password needed."

### Form
- Label: **"Email address"**
- Input placeholder: "you@yourstore.com"
- Hint text: "We'll send a magic link. No password to set up."
- Primary button: **"Save & export results"**
- Secondary button (smaller): **"Email me a login link"**

### Success State
After email submission, the form is replaced by a confirmation:
- Olive check icon (circle + checkmark)
- Title: "Check your inbox"
- Description: "We sent a login link to **you@example.com**. Click it to access your saved forecasts and export data."

**Micro-interaction:** Button shows "Sending…" during the 1.2s simulated delay. Form slides out, success state slides in (400ms fade).

---

## Demo FAQ Block

**Location:** Below the trust block on `try.html`

**Label:** "Demo FAQ"
**Headline:** "Questions about the demo"

| Question | Answer |
|----------|--------|
| Do I need to create an account to try the demo? | No. The demo with sample data works without any account. If you upload your own CSV, that also works without signing up. You only need an email if you want to save results, export data, or come back later. |
| What happens to the CSV I upload? | Your file is processed to generate the forecast. If you don't create an account, the file is discarded after your session ends. If you sign in with your email, uploads are stored for 30 days so you can re-run forecasts. |
| Is the sample dataset realistic? | The sample uses synthetic data modeled after a small e-commerce store with 12 SKUs across 6 months. It includes realistic patterns — seasonal variation, mixed velocities, and some stockout gaps — so the forecast output is representative of what you'd see with real data. |
| What is a "magic link" sign-in? | Instead of setting a password, we send a one-time login link to your email. Click it and you're signed in. Each link expires after 15 minutes for security. |
| Can I upload more than one CSV? | Yes. You upload a sales CSV to generate forecasts. You can optionally upload a second CSV with current stock levels per SKU to unlock risk assessment and reorder suggestions. After creating an account, you can manage multiple uploads and re-run forecasts. |
| What if I don't provide stock data? | Forecasts work without stock data. You'll see demand projections, average daily sales, and velocity trends per SKU. Risk status, days to stockout, and reorder quantity suggestions require stock levels and will not be shown without them. |
| How are reorder quantities calculated? | `suggested_reorder = (forecast_horizon_demand + safety_buffer) − current_stock`. The safety buffer is 7 × average daily sales, providing a 7-day cushion above the forecasted demand. |
| How is this different from the paid plans? | The demo shows the core forecast output — demand projections, velocity metrics, and optional stock-based risk analysis. Paid plans add saved history, higher SKU limits, scenario forecasting, and multi-store support depending on the tier. |

**Layout:** Same accordion style as main FAQ. Max-width 720px, centered. Warm-white background.

---

## Bottom CTA — Convert Demo Users

**Location:** Bottom of `try.html`, before footer

**Background:** dark (`--bg-dark`)
**Headline:** "Ready to use Stackwise with your own data?"
**Subtext:** "Start a 7-day free trial. Upload your sales history and get ongoing forecasts."
**CTA:** **"Start free trial"** (inverted — white button on dark)
**Note:** "No credit card required. Cancel anytime."

**Layout:** Centered, max-width 560px. Same styling as main page final CTA.

**Animation:** Content fades in on scroll.

---

## CTA Copy Reference — Full Button / Label Inventory

| Context | Button / Label | Purpose |
|---------|---------------|---------|
| Homepage hero | "Try the demo" | Primary entry to try page |
| Homepage hero | "Upload your CSV" | Direct to upload on try page |
| Homepage nav | "Try Stackwise" | Persistent nav CTA |
| Try page: demo option | "Run demo forecast" | Trigger sample data results |
| Try page: upload option | "Run forecast on my data" | Trigger uploaded CSV results |
| Try page: file state | "Drag your CSV here or browse" | Upload prompt |
| Try page: processing | "Processing…" | Button loading state |
| Try page: save gate | "Save & export results" | Primary conversion CTA |
| Try page: save gate | "Email me a login link" | Secondary conversion CTA |
| Try page: gate hint | "We'll send a magic link. No password to set up." | Reduces friction |
| Try page: gate success | "Check your inbox" | Confirmation headline |
| Try page: bottom CTA | "Start free trial" | Final conversion to paid |
| Try page: bottom note | "No credit card required. Cancel anytime." | Friction reduction |

---

## Animation Summary — Try Page

| Element | Animation | Duration | Trigger |
|---------|-----------|----------|---------|
| Page content | Standard `anim-fade` (fade up) | 500ms | Scroll into viewport |
| Option selection | Border color + radio dot fill | 200ms | Click |
| Dropzone hover/drag | Border color + background tint | 200ms | Hover / dragover |
| File error | Immediate appear (no animation) | — | Validation failure |
| Results section | Slide in (opacity + translateY) | 500ms | Data processed |
| SKU table rows | Staggered fade-in (per row) | 400ms + 50ms stagger | Results rendered |
| Reorder items | Staggered fade-in | 400ms + 80ms stagger | Results rendered |
| Horizon switch | Pill background transition | 150ms | Click |
| Gate form submit | Button text → "Sending…" | 1.2s | Form submit |
| Gate success | Fade in, form fades out | 400ms | After send |
| FAQ chevron | Rotate 180° | 200ms | Toggle |
| Reduced motion | All animations disabled | — | `prefers-reduced-motion: reduce` |
