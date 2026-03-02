# Stackwise — Website Copy, Layout & Conversion Reference

## Table of Contents
1. [Section-by-Section Structure](#section-by-section-structure)
2. [Full Website Copy](#full-website-copy)
3. [Animation Descriptions Per Section](#animation-descriptions)
4. [Interaction Notes](#interaction-notes)
5. [Conversion Logic](#conversion-logic)
6. [Design System Summary](#design-system-summary)

---

## Section-by-Section Structure

### 1. Navigation
**Layout:** Fixed horizontal bar, 64px height.
- Left: Logo (SVG icon + "Stackwise" in DM Serif Display)
- Center: 4 anchor links — How it works, Features, Pricing, FAQ
- Right: Primary CTA button — "Start free trial"
- Mobile: Hamburger icon → slide-in panel from right, 280px wide

**Behavior:**
- Transparent on page load
- After 80px scroll: cream background with 12px blur, subtle bottom border
- Links have underline slide-in animation on hover (left → right, 250ms)

---

### 2. Hero Section
**Layout:** Two-column grid (1fr + 1fr) on desktop, single column on mobile. Minimum 90vh height, vertically centered.

**Left column:**
- Label: "Demand forecasting for small e-commerce" (uppercase, olive)
- Headline: "Know what to restock before you run out" (DM Serif Display, 72px clamp)
- Subtext: 1 sentence explaining the product
- Two CTAs: "Try free for 7 days" (primary) + "See how it works" (secondary)
- Microcopy: "No credit card required. Works with any CSV export."

**Right column:**
- Animated data flow diagram showing: CSV icon → Stackwise circle → Forecast chart + Reorder alert
- Contained in a warm-white card with sand border

**Animation:** Elements fade in sequentially (label → headline → sub → CTAs → note), 80ms stagger. Diagram animates step-by-step (step 1 → arrow → step 2 → arrows → outputs) over ~1.4s.

**Conversion logic:** Two CTAs: high-intent goes to pricing; lower-intent views how-it-works. Microcopy reduces friction (no CC, any CSV).

---

### 3. Problem Section
**Layout:** Centered header + 3-column card grid.

**Copy:**
- Label: "The problem"
- Headline: "Most small sellers manage inventory by gut feeling"
- Subtext: Describes reactive behavior

**Cards (3):**
1. **Stockouts you didn't see coming** — Lost sales, no visibility
2. **Spreadsheets that don't forecast** — Reactive, backward-looking tools
3. **Overstock tying up cash** — Capital locked in slow-moving SKUs

**Animation:** Header fades in, cards stagger in (80ms intervals).

**Conversion logic:** Problem-agitation. Names specific pain points the target audience already knows. No exaggeration — describes real behavior patterns.

---

### 4. "Understand Your Demand" Section
**Layout:** Two-column grid. Left: copy + checklist. Right: chart mockup.

**Copy:**
- Label: "Understand your demand"
- Headline: "Your past sales data already has the answer"
- Body explaining CSV patterns
- 3-item checklist:
  - SKU-level demand projections calculated from your sales history
  - Velocity metrics showing which SKUs are accelerating or slowing
  - Stockout risk and reorder timing when you provide current stock levels

**Visual:** Animated forecast chart mockup
- Grid lines, historical trend (solid line), forecast projection (dashed line)
- "~270 units" projected demand marker in olive
- Legend bar at bottom (Historical / Forecast / Projected demand)

**Animation:** Left content fades in. Chart line draws left-to-right (1.5s), reorder marker fades in after line completes.

**Conversion logic:** Bridges problem → solution. Shows that value comes from data they already have. Visual proof of the output format.

---

### 5. Product Previews Section
**Layout:** Centered header + vertical panel stack.

**Panels (3):**

**Panel A — SKU Demand Table (Forecast-Only Mode)**
- Badge: "Forecast-only mode · Sample data"
- Note: "Based on sales history only. No stock data required."
- Columns: SKU, Product, 30-day Forecast, Avg Daily, Velocity
- Shows demand projections and velocity — NO risk, NO stock, NO reorder

**Panel B — Inventory-Aware View (When stock levels are provided)**
- Badge: "When stock levels are provided · Sample data"
- Note: "Risk and reorder data appear only when you provide current stock levels."
- Columns: SKU, Product, Stock, 30-day Forecast, Days to Stockout, Risk
- Risk formula explanation below table:
  - On track — Stock covers > 60 days of forecasted demand
  - Watch — Stock covers 30–60 days
  - Reorder soon — Stock covers < 30 days
  - `days_to_stockout = current_stock ÷ avg_daily_sales`

**Panel C — Reorder Suggestions (Requires stock data)**
- Badge: "Requires stock data"
- Note explaining formula: `suggested_reorder = (forecast_demand + safety_buffer) − current_stock`
  where `safety_buffer = 7 × avg_daily_sales`
- Each item shows: days until stockout, avg daily rate, suggested reorder qty, formula breakdown

**Conversion logic:** Two states make the product logic transparent. Users see exactly what they get with and without stock data. No misleading implications about what the system knows.

---

### 6. How It Works (3 Steps)
**Layout:** Background: warm-white. Horizontal 3-step flow with connector arrows on desktop. Vertical stack on mobile.

**Steps:**
1. **Upload your sales CSV** — Export from Shopify/Amazon/etc, upload to Stackwise
2. **Get your demand forecast** — SKU-level projections generated from patterns
3. **Review results, optionally add stock** — See forecasts and velocity; provide stock levels to unlock risk and reorder

Each step: number (mono), SVG illustration, title, description.

**Animation:** Steps and connectors fade in with stagger. SVG icons are simple, stroke-based illustrations.

**Conversion logic:** Reduces perceived complexity. Three steps = low commitment. Step 3 explicitly shows stock is optional, not assumed.

---

### 7. Features / What You Get
**Layout:** Centered header + 3-column card grid (6 cards, 2 rows).

**Cards:**
1. SKU-level demand forecast
2. Stockout risk alerts *(only when stock data is provided)*
3. Reorder timing *(formula-based, requires stock data)*
4. SKU-level projections table *(stock & risk columns conditional)*
5. Scenario forecasting (Pro plan)
6. Multi-store view (Pro plan)

Each card: icon, title, 2-sentence description. Pro-only features are labeled.
Stock-dependent features include explicit copy: "Only shown when stock data is provided."

**Animation:** Cards stagger in from bottom. Hover: translateY(-2px) + shadow deepen.

**Conversion logic:** Concrete outputs with clear descriptions. No vague "insights" — each feature answers a specific question. Pro labels create natural upgrade logic.

---

### 8. Pricing
**Layout:** Background: warm-white. 3-column card grid, max-width 960px.

**Plans:**
| | Starter | Growth | Pro |
|---|---------|--------|-----|
| Price | $19/mo | $59/mo | $99/mo |
| Stores | 1 | 1 | Multiple |
| SKUs | 50 | 200 | 500 |
| Key diff | Base forecast | + Stockout alerts | + Scenarios |

Growth card is highlighted (olive border + "Most chosen" badge).

**Below cards:** Note about paid onboarding availability.

**Animation:** Cards stagger fade. Badge draws attention to Growth plan.

**Conversion logic:** Growth is anchored as default (middle position, visual emphasis). Starter provides low entry point. Pro justifies itself with multi-store + scenarios. All plans share 7-day free trial CTA.

---

### 9. Use Cases
**Layout:** Centered header + 3-column card grid.

**Personas:**
1. **Shopify seller** — Single store, 30–100 SKUs
2. **Marketplace seller** — Amazon/Etsy, CSV exports
3. **Multi-channel** — 2–3 channels, needs combined view

Each card: tag pill, title, description.

**Animation:** Cards stagger in.

**Conversion logic:** Self-selection. Visitors identify with one persona and understand the product is for people like them. Reinforces the "small seller" positioning.

---

### 10. FAQ
**Layout:** Background: warm-white. Centered accordion list, max-width 720px.

**Questions (6):**
1. What format does the CSV need to be in?
2. Does Stackwise connect directly to my store?
3. How much historical data do I need?
4. How accurate are the forecasts?
5. Can I cancel anytime?
6. What happens after the free trial?

**Key answer principles:**
- Question 2 explicitly states NO direct integrations (honest)
- Question 4 explicitly states no blanket accuracy claim (honest)
- Other answers are direct and short

**Animation:** Items fade in on scroll. Chevron rotates 180° on open. Answer slides open with max-height animation.

**Conversion logic:** Objection handling. Each question addresses a common hesitation. Honesty builds trust.

---

### 11. Final CTA
**Layout:** Dark background (nearly black). Centered text block, max 600px.

**Copy:**
- Headline: "Stop guessing. Start forecasting."
- Subtext: One sentence about uploading CSV and free trial
- Single CTA: "Start your free trial" (inverted colors — white button on dark)

**Animation:** Content fades in on scroll.

**Conversion logic:** High-contrast section breaks the page pattern and creates final urgency. Copy is short, action-oriented. Single CTA removes decision paralysis.

---

### 12. Footer
**Layout:** Dark background, matching CTA section. Two-column: brand info left, 3-column link grid right.

**Content:**
- Logo + tagline
- Product links, Company links, Legal links
- Copyright line at bottom with separator

---

## Animation Descriptions

| Section | Element | Animation | Duration | Trigger |
|---------|---------|-----------|----------|---------|
| All | `.anim-fade` elements | Fade up (opacity 0, Y+20px → visible) | 500ms | 15% visible in viewport |
| All | Grid children | Stagger fade (80ms delay per child) | 500ms + delay | Parent enters viewport |
| Nav | Background fill | Transparent → cream blur | 400ms | Scroll > 80px |
| Nav | Link underline | Width 0 → 100% (left to right) | 250ms | Hover |
| Hero | Diagram steps | Sequential appearance | 400ms each | Section visible |
| Hero | Diagram arrows | Fade in between steps | 300ms | After preceding step |
| Hero | Hero visual | Subtle Y parallax at 0.15x scroll | Continuous | Scroll (desktop) |
| Demand | Forecast line | SVG stroke-dashoffset draw | 1.5s | Chart 30% visible |
| Demand | Reorder marker | Fade in | 400ms | After line draws (1.5s delay) |
| Features | Cards | translateY(-2px) + shadow | 200ms | Hover |
| FAQ | Chevron | Rotate 180° | 200ms | Toggle open/close |
| FAQ | Answer | max-height expand + opacity | 400ms | Toggle open |
| Buttons | Primary | Background lighten + Y-1px | 200ms | Hover |
| Buttons | Secondary | Fill background, invert text | 200ms | Hover |

**Reduced motion:** All animations are disabled when `prefers-reduced-motion: reduce` is active. Elements render in their final state immediately.

---

## Interaction Notes

1. **Scroll-based reveals:** IntersectionObserver with 15% threshold. Elements are invisible by default and transition to visible state. Once revealed, observer disconnects (no re-animation on scroll back up).

2. **Mobile menu:** Hamburger toggles `aria-expanded` and `aria-hidden`. Body scroll is locked when menu is open. Menu slides from right with 400ms ease. Links close menu on click.

3. **Smooth scrolling:** All anchor links scroll with 80px offset for fixed nav. Uses native `scroll-behavior: smooth` with JS fallback.

4. **FAQ accordion:** Native `<details>` element used for accessibility and no-JS fallback. JS adds max-height animation layer on top.

5. **No auto-play video or audio.** No modal popups. No cookie banner interaction (handled separately if needed).

6. **Focus management:** All interactive elements have `:focus-visible` styles. Skip-to-content link appears on tab. Tab order follows document flow.

---

## Conversion Logic

### Page Flow Model

```
Attention → Problem Awareness → Solution Understanding → Feature Validation → Price Comparison → Self-Selection → Objection Handling → Action
```

| Section | Funnel Stage | Goal |
|---------|-------------|------|
| Hero | Attention | Capture with clear value prop + low-friction CTA |
| Problem | Problem awareness | Name specific pain points they recognize |
| Demand | Solution framing | Show the product addresses their existing data |
| Visibility Gap | Specificity | Name exact metrics they currently lack |
| How it Works | Complexity reduction | 3 steps = low effort narrative |
| Features | Validation | Concrete outputs, not abstract benefits |
| Pricing | Comparison | Clear tiers, highlighted default, free trial |
| Use Cases | Self-selection | "This is for someone like me" |
| FAQ | Objection handling | Honest answers to hesitation points |
| Final CTA | Action | Dark section breaks pattern, single clear CTA |

### CTA Strategy
- **Primary CTA appears 4 times:** Hero, pricing (x3 cards), final CTA
- **All CTAs lead to same action:** Start free trial
- **Every CTA includes friction reduction:** "No credit card", "7-day free trial", "Cancel anytime"

### Trust Signals (Without Fabrication)
- Honest FAQ answers (no integrations, no accuracy claims)
- No fake testimonials or metrics
- "Most chosen" badge on Growth plan (can be validated post-launch)
- Concrete feature descriptions, not vague promises
- Pricing transparency (no "Contact us" tier)

---

## Design System Summary

### Colors
| Role | Value |
|------|-------|
| Background | `#F5F0EB` (cream) |
| Surface | `#FAF7F4` (warm white) |
| Border | `#EDE7DF` (sand) |
| Dark sections | `#1A1915` |
| Primary text | `#1A1915` |
| Secondary text | `#6B6560` |
| Tertiary text | `#9C9590` |
| CTA / positive | `#5C6B4F` (olive) |
| Warning | `#C4845C` (terra cotta) |
| Critical | `#B85C3A` (rust) |

### Fonts
- **Headlines:** DM Serif Display (Google Fonts)
- **Body / UI:** Inter (Google Fonts)
- **Data:** JetBrains Mono (Google Fonts)

### Spacing
8px base unit. Scale: 4, 8, 16, 24, 32, 48, 64, 96, 128.

### Key Dimensions
- Max content width: 1200px
- Card radius: 12px
- Button radius: 8px
- Nav height: 64px
- Container padding: 24px (mobile), 48px (desktop)

### Breakpoints
| Name | Width |
|------|-------|
| Mobile | < 640px |
| Tablet | 640px–959px |
| Desktop | ≥ 960px |
| Wide | ≥ 1280px |
