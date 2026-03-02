# UX Specification: "Add Stock Levels" Experience

**Product:** StockWise — Try Page  
**Version:** 1.0  
**Last updated:** 2025-01-XX

---

## 1. Overview & Goal

The stock input experience lets users provide current inventory levels for SKUs already in their sales forecast. This unlocks **inventory-aware mode**, which surfaces risk scores, days to stockout, reorder-by dates, and suggested reorder quantities.

**Target:** A user should be able to provide stock data for all their SKUs **in under 60 seconds**, regardless of whether they type values, paste from a spreadsheet, or upload a CSV export.

---

## 2. UX Flow (Step-by-Step)

```
1. User runs forecast (demo or upload) → results appear
2. "Add stock levels" panel appears below mode banner, above SKU table
3. User chooses one of three input methods via tabs:
   a. Edit in table — type stock values directly
   b. Paste — paste SKU + stock from clipboard
   c. Upload CSV — upload a file and map columns
4. (Optional) User clicks "Load sample stock data" for demo shortcut
5. User clicks "Apply" → stock is applied
6. Success state replaces tabs: "Stock levels applied — X of Y matched"
7. Lead time and safety stock sections become visible
8. Results table gains Stock, Days to Stockout, Reorder By, and Risk columns
9. Reorder List panel appears with reorder suggestions
```

### State Transitions

| From | Action | To |
|------|--------|----|
| Forecast-only | Apply stock (any method) | Inventory-aware |
| Inventory-aware | Click "Edit" in success bar | Editor (tabs visible, pre-filled) |
| Inventory-aware | Click "Remove" in success bar | Forecast-only |
| Any tab | Switch tab | New tab panel visible |

---

## 3. Component Specifications

### 3.1 Stock Panel Container (`.stock-panel`)

- **Position:** Below mode banner, above SKU Demand Table
- **Background:** `var(--bg-warm-white)` (#FAF7F4)
- **Border:** 1px solid `var(--border-subtle)` (#E6E0D9)
- **Border-radius:** `var(--r-card)` (12px)
- **Padding:** `var(--s-5)` (24px)
- **Hidden** until forecast is run (`hidden` attribute)

### 3.2 Header

| Element | Content |
|---------|---------|
| Title | `Add stock levels` (DM Serif Display, `--text-primary`) |
| Subtitle | `Unlock stockout risk, reorder dates, and suggested quantities.` |
| Status pill | `X of Y SKUs filled` — hidden until user starts entering data |

**Status pill colors:**
- Empty: neutral (`var(--text-muted)`)
- Partial: olive background (`var(--accent-olive)` at 10% opacity)
- Complete: olive dot + green text

### 3.3 Demo CTA

- **Copy:** `Load sample stock data` (secondary button)
- **Helper text:** `Pre-fills stock for all 12 demo SKUs`
- Visible for all users (demo or upload)

### 3.4 Tab Navigation (`.stock-tabs`)

Three tabs in a horizontal row:

| Tab | Icon | Label | Default |
|-----|------|-------|---------|
| 1 | Table grid | `Edit in table` | Active |
| 2 | Clipboard | `Paste` | — |
| 3 | Document | `Upload CSV` | — |

**Tab styling:**
- Inactive: transparent background, muted text
- Active: white background, olive text & bottom border
- Transition: `150ms ease`
- ARIA: `role="tab"`, `aria-selected`, `aria-controls`

### 3.5 Tab Panel 1: In-App Editor

**Toolbar:**
- `Set blanks to 0` — ghost button, fills empty inputs with 0
- `Clear all` — ghost button, empties all inputs
- Helper text: `Type values or paste a column from your spreadsheet.`

**Table columns:**
| Column | Width | Content |
|--------|-------|---------|
| SKU | auto | Monospace, read-only |
| Product | auto | Normal text, read-only |
| Current stock | 100px | `<input type="number">`, right-aligned |

**Input states:**
- Empty: `#EDE7DF` background, `—` placeholder
- Filled: white background, olive left border
- Error (negative/NaN): amber/rust border
- Focus: olive ring (`box-shadow: 0 0 0 2px var(--accent-olive-20)`)

**Bulk paste from spreadsheet:**
- If user pastes multi-line text into any stock input, the handler intercepts and distributes values down the column starting from the focused row
- Parses last value on each pasted line as the stock quantity

**Footer:**
- `Apply stock levels` — primary button, disabled until ≥1 valid value

### 3.6 Tab Panel 2: Paste Quick Input

**Layout:**
1. Label: `Paste SKU and stock values`
2. Hint: `One SKU per line. Accepts tab, comma, or spaces between SKU and quantity.`
3. Example block (faded background):
   ```
   BK-1042  120
   LT-0887  45
   CN-2215  200
   ```
4. Textarea (6 rows, monospace, spellcheck off)
5. Live preview table (appears after typing)
6. Error banner (if needed)
7. Footer with `Apply pasted stock` button

**Parser behavior:**
- Splits on newlines
- Each line split on: tab → comma → 2+ spaces → single space (fallback)
- First token = SKU, last token = stock quantity
- Numbers validated: must be integer ≥ 0

**Preview table columns:**
| Column | Content |
|--------|---------|
| SKU | Monospace |
| Stock | Monospace |
| Status | Badge: `Matched` / `Not in sales data` / `Duplicate — skipped` / `Invalid format` / `Negative value` |

**Status badge colors:**
- Matched: olive green (#5C6B4F)
- Unmatched: amber (#C4845C)
- Duplicate: muted gray
- Invalid: rust (#B85C3A)

**Preview header shows:** `X matched, Y unmatched, Z invalid, W duplicate`

**Debounce:** 300ms after typing stops

### 3.7 Tab Panel 3: CSV Upload with Column Mapping

**Dropzone:**
- Large document icon (32×32)
- Copy: `Drop your stock CSV here or browse`
- Subcopy: `Any CSV with SKU and stock columns. Headers can be named anything.`
- Drag-over state: olive dashed border

**After file selected:**
1. File name shown with × remove button
2. Dropzone hidden
3. Column mapping UI appears

**Column mapping:**
- Title: `Map your columns`
- Description: `Select which column contains SKU identifiers and which contains stock quantities.`
- Two `<select>` dropdowns side by side:
  - SKU column
  - Stock column
- Auto-detection: tries to match headers against known aliases:
  - SKU: `sku`, `product_id`, `item_id`, `variant_sku`, `product_sku`, `item`
  - Stock: `current_stock`, `stock`, `quantity_on_hand`, `on_hand`, `inventory`, `qty`, `quantity`

**Match rate bar:**
- Visual bar (`var(--accent-olive)` fill on sand background)
- Text: `X of Y sales SKUs matched (Z%). W stock entries loaded. N rows skipped (invalid).`

**Unmatched SKU list:** Shown below match bar if any sales SKUs have no stock match.

**Validation:**
- SKU and Stock columns cannot be the same
- At least 1 valid entry required to enable Apply button

**Footer:** `Apply mapped stock` — primary button

### 3.8 Success State

Appears after any Apply action. Replaces tab content (tabs hidden via `.stock-panel--collapsed`).

| Element | Content |
|---------|---------|
| Icon | Check circle (olive) |
| Title | `Stock levels applied` |
| Description | `X of Y SKUs matched. Risk and reorder columns are now visible.` — or — `X of Y SKUs matched. Z SKU(s) missing stock: [list]. These show forecast-only data.` |
| Edit button | Text button → reopens tabs pre-filled |
| Remove button | Text button → clears stock, returns to forecast-only |

### 3.9 Lead Time Section

Appears after stock is applied.

**Header:**
- Title: `Lead time`
- Description: `How many days between placing and receiving an order. Used to calculate reorder dates.`

**Controls:**
- Global lead time input: `<input type="number">` default 7, range 0–365
- Per-SKU toggle: `Set per SKU` checkbox
- Per-SKU table (shown when checked): SKU | Product | Lead time (days) input

**Effect:** Changes `reorder_by_date = today + (days_to_stockout − lead_time)`

### 3.10 Safety Stock Buffer

Appears after stock is applied.

**Controls:**
- Label: `Safety stock buffer`
- Input: `<input type="number">` default 7, range 0–90
- Unit text: `days of extra demand`
- Live formula echo: `safety_stock = avg_daily_sales × [N] days`

**Effect:** Safety stock buffer changes `safety_stock` in reorder calculation.

---

## 4. Formula Outputs

### Columns Added to SKU Demand Table (Inventory-Aware Mode)

| Column | Formula | Display |
|--------|---------|---------|
| Stock | `current_stock` (user input) | Integer |
| Days to Stockout | `current_stock ÷ avg_daily_sales` | `~N days` or `∞` |
| Reorder By | `today + max(0, days_to_stockout − lead_time)` | `Jan 15, 2025` (rust if overdue) |
| Risk | `> 60d → On track`, `30–60d → Watch`, `< 30d → Reorder soon` | Color-coded pill |

### Reorder List Item Details

Each reorder card shows:
- Days until stockout
- Average daily sales
- Lead time (per-SKU or global)
- **Reorder by date** (bold, rust if overdue)
- Suggested reorder quantity (bold)
- Safety stock breakdown
- Formula: `(forecast + safety) − stock = suggested`

### Formula Display (shown below reorder list)

```
suggested_reorder = (forecast_demand + safety_stock) − current_stock
safety_stock = avg_daily_sales × [N] days
days_to_stockout = current_stock ÷ avg_daily_sales
reorder_by_date = today + (days_to_stockout − lead_time)
```

Dynamic labels update when safety days or lead time changes.

---

## 5. Validation Rules & Edge Cases

### Input Validation

| Rule | Behavior |
|------|----------|
| Non-numeric stock value | Input highlighted with error border; row excluded from apply |
| Negative stock value | Treated as error; excluded |
| Duplicate SKU (paste) | Marked "Duplicate — skipped"; first value kept |
| SKU not in sales data | Stored but marked "Not in sales data"; no risk calculation |
| Empty stock field (editor) | Skipped during apply (only filled fields count) |
| CSV wrong file type | Error: "This file isn't a CSV. Please upload a .csv file." |
| CSV empty file | Error: "This file appears to be empty." |
| CSV same column mapped | Error: "SKU and Stock columns must be different." |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| 0 avg daily sales | `days_to_stockout = ∞`, risk = "On track" |
| Stock = 0 | `days_to_stockout = 0`, risk = "Reorder soon" |
| Reorder date in the past | Date shown in rust with "(overdue)" label |
| All SKUs missing from stock | Success shows "0 of X matched", table shows "No stock data" per row |
| Partial match | Matched SKUs show full data; unmatched show "—" with "No stock data" |
| Lead time > days to stockout | Reorder date = today (already past trigger point) |
| Safety days = 0 | Safety stock = 0; reorder = forecast − stock |

---

## 6. Microcopy Reference

### Headers & Labels
- `Add stock levels` — panel title
- `Unlock stockout risk, reorder dates, and suggested quantities.` — panel subtitle
- `X of Y SKUs filled` — status indicator
- `Load sample stock data` — demo button
- `Pre-fills stock for all 12 demo SKUs` — demo note

### Tab Labels
- `Edit in table`
- `Paste`
- `Upload CSV`

### Editor
- `Set blanks to 0` — toolbar button
- `Clear all` — toolbar button
- `Type values or paste a column from your spreadsheet.` — hint
- `Apply stock levels` — primary action

### Paste
- `Paste SKU and stock values` — label
- `One SKU per line. Accepts tab, comma, or spaces between SKU and quantity.` — hint
- `Apply pasted stock` — primary action

### CSV
- `Drop your stock CSV here or browse` — dropzone label
- `Any CSV with SKU and stock columns. Headers can be named anything.` — dropzone hint
- `Map your columns` — mapping section title
- `Select which column contains SKU identifiers and which contains stock quantities.` — mapping description
- `Apply mapped stock` — primary action

### Success State
- `Stock levels applied` — title
- `X of Y SKUs matched. Risk and reorder columns are now visible.` — description (full match)
- `X of Y SKUs matched. Z SKU(s) missing stock: [list]. These show forecast-only data.` — description (partial match)
- `Edit` — edit button
- `Remove` — remove button

### Lead Time
- `Lead time` — section title
- `How many days between placing and receiving an order. Used to calculate reorder dates.` — description
- `Default lead time (days)` — input label
- `Set per SKU` — toggle label

### Safety Stock
- `Safety stock buffer` — label
- `days of extra demand` — unit text
- `safety_stock = avg_daily_sales × N days` — formula echo

### Mode Banners
- Forecast-only: `Forecast-only mode` / `Add stock levels to unlock stockout risk, reorder dates, and suggested order quantities.`
- Inventory-aware: `Inventory-aware mode` / `Stock levels provided. Showing risk assessment, days to stockout, reorder dates, and reorder suggestions.`

### Error Messages
- Paste: `None of the pasted SKUs match your sales data. Stock will still be stored but won't affect risk calculations.`
- CSV wrong type: `This file isn't a CSV. Please upload a .csv file.`
- CSV empty: `This file appears to be empty.`
- CSV parse fail: `Could not parse this file. Ensure it's a valid CSV.`
- CSV no data: `CSV has no data rows. At least one header row and one data row are required.`
- CSV same column: `SKU and Stock columns must be different.`

---

## 7. Why This Reduces Friction

| Before | After |
|--------|-------|
| Single CSV upload with rigid column names | 3 flexible methods: type, paste, upload |
| Required exact `sku` + `current_stock` headers | Auto-detects columns from 10+ common header names |
| No feedback on missing SKUs | Match rate bar + unmatched SKU list |
| No way to quickly fill stock for demo | "Load sample stock data" one-click shortcut |
| Fixed 7-day safety buffer, hidden | Editable safety days with live formula echo |
| No lead time concept | Global + per-SKU lead time with reorder date calc |
| No reorder date | Dates shown in table + reorder cards (with overdue highlighting) |
| Errors blocked all progress | Partial match allowed; unmatched rows shown as forecast-only |

---

## 8. Accessibility Notes

- All tabs use `role="tab"`, `aria-selected`, `aria-controls`
- Tab panels use `role="tabpanel"`, `aria-labelledby`
- Error messages use `role="alert"` for screen reader announcement
- All inputs have associated `<label>` elements
- Color is never the sole indicator — status text accompanies all colored pills
- Keyboard: tabs are keyboard-navigable; all interactive elements are focusable
- Focus ring: `box-shadow: 0 0 0 2px var(--accent-olive-20)` on `:focus-visible`

---

## 9. Files Modified

| File | Changes |
|------|---------|
| `try.html` | Replaced stock input section with tabbed panel, added Reorder By table column, updated formula display |
| `try-styles.css` | Added ~600 lines of CSS for stock panel, tabs, editor, paste, CSV mapping, lead time, safety stock |
| `try.js` | Full rewrite: tab switching, 3 input methods, lead time, safety stock, enhanced calculations, reorder dates |
