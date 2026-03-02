# Stackwise — Design System

## Color Palette

### Primary Neutrals
| Token              | Hex       | Usage                                      |
|--------------------|-----------|---------------------------------------------|
| `--bg-cream`       | `#F5F0EB` | Page background                             |
| `--bg-warm-white`  | `#FAF7F4` | Card backgrounds, elevated surfaces         |
| `--bg-sand`        | `#EDE7DF` | Section alternation, subtle dividers         |
| `--bg-dark`        | `#1A1915` | Dark sections (CTA, footer)                 |

### Text Colors
| Token              | Hex       | Usage                                      |
|--------------------|-----------|---------------------------------------------|
| `--text-primary`   | `#1A1915` | Headlines, primary body                     |
| `--text-secondary` | `#6B6560` | Subheadings, supporting copy                |
| `--text-tertiary`  | `#9C9590` | Labels, captions, metadata                  |
| `--text-inverse`   | `#FAF7F4` | Text on dark backgrounds                    |

### Accent Colors
| Token              | Hex       | Usage                                      |
|--------------------|-----------|---------------------------------------------|
| `--accent-olive`   | `#5C6B4F` | Primary CTA, active states                  |
| `--accent-olive-light` | `#7A8B6D` | Hover states                           |
| `--accent-terra`   | `#C4845C` | Warning indicators, stockout risk           |
| `--accent-rust`    | `#B85C3A` | Critical alerts, high-risk SKU indicators   |

### Data Visualization
| Token              | Hex       | Usage                                      |
|--------------------|-----------|---------------------------------------------|
| `--chart-line`     | `#5C6B4F` | Forecast trend lines                        |
| `--chart-fill`     | `#5C6B4F1A` | Area fill under forecast curves           |
| `--chart-risk-low` | `#5C6B4F` | Low risk indicator                          |
| `--chart-risk-mid` | `#C4845C` | Medium risk indicator                       |
| `--chart-risk-high`| `#B85C3A` | High risk indicator                         |
| `--chart-grid`     | `#EDE7DF` | Gridlines                                   |

---

## Typography

### Font Pairing
- **Headlines:** `'DM Serif Display', Georgia, serif`
- **Body / UI:** `'Inter', -apple-system, sans-serif`
- **Mono (data):** `'JetBrains Mono', 'SF Mono', monospace`

### Type Scale

| Element                | Font           | Size     | Weight | Line Height | Letter Spacing |
|------------------------|----------------|----------|--------|-------------|----------------|
| Hero headline          | DM Serif Display | 72px / 4.5rem | 400 | 1.05        | -0.02em        |
| Section headline       | DM Serif Display | 48px / 3rem   | 400 | 1.1         | -0.01em        |
| Sub-section headline   | Inter            | 24px / 1.5rem | 600 | 1.3         | -0.01em        |
| Body large             | Inter            | 20px / 1.25rem| 400 | 1.6         | 0              |
| Body                   | Inter            | 16px / 1rem   | 400 | 1.6         | 0              |
| Body small             | Inter            | 14px / 0.875rem | 400 | 1.5       | 0              |
| Caption / Label        | Inter            | 13px / 0.8125rem | 500 | 1.4       | 0.02em         |
| Data / Metric          | JetBrains Mono   | 14px / 0.875rem | 400 | 1.4       | 0              |
| Metric large           | JetBrains Mono   | 32px / 2rem    | 500 | 1.2       | -0.02em        |

### Responsive Scale Multipliers
| Breakpoint | Multiplier |
|------------|-----------|
| ≤ 480px    | 0.65      |
| ≤ 768px    | 0.75      |
| ≤ 1024px   | 0.85      |
| ≤ 1280px   | 0.95      |
| > 1280px   | 1.0       |

---

## Spacing System

Base unit: `8px`

| Token   | Value  | Usage                          |
|---------|--------|--------------------------------|
| `--s-1` | 4px    | Tight internal padding         |
| `--s-2` | 8px    | Icon gaps, inline spacing      |
| `--s-3` | 16px   | Card internal padding          |
| `--s-4` | 24px   | Between related elements       |
| `--s-5` | 32px   | Between content blocks         |
| `--s-6` | 48px   | Section internal padding       |
| `--s-7` | 64px   | Between major sections         |
| `--s-8` | 96px   | Hero vertical padding          |
| `--s-9` | 128px  | Section gaps (desktop)         |

### Layout

| Property            | Value          |
|---------------------|---------------|
| Max content width   | 1200px        |
| Content padding     | 24px (mobile) / 48px (desktop) |
| Column grid         | 12 columns, 24px gutter |
| Card border radius  | 12px          |
| Button border radius| 8px           |

---

## Components

### Buttons

**Primary CTA**
- Background: `--accent-olive`
- Text: `--text-inverse`
- Padding: 16px 32px
- Font: Inter 16px/500
- Border radius: 8px
- Hover: background shifts to `--accent-olive-light`, subtle Y translate -1px
- Transition: 200ms ease

**Secondary CTA**
- Background: transparent
- Border: 1.5px solid `--text-primary`
- Text: `--text-primary`
- Same sizing as primary
- Hover: background fills to `--text-primary`, text inverts

**Ghost / Text Link**
- No background or border
- Text: `--text-primary`
- Underline offset: 4px
- Hover: underline color shifts to `--accent-olive`

### Cards

**Feature Card**
- Background: `--bg-warm-white`
- Border: 1px solid `--bg-sand`
- Padding: 32px
- Border radius: 12px
- Hover: subtle border darkens to `#D5CFC7`, box shadow `0 2px 12px rgba(26,25,21,0.04)`

**Pricing Card**
- Same base as feature card
- Highlighted card gets border: 2px solid `--accent-olive`
- Badge: small pill in `--accent-olive` with inverse text

### Navigation

- Fixed top, transparent initially
- On scroll (>80px): background fills `--bg-cream` with `backdrop-filter: blur(12px)`
- Height: 64px
- Logo left, links center, CTA right
- Mobile: hamburger → slide-in panel from right

---

## Motion Principles

### General Rules
- Duration: 300–500ms for reveals, 150–200ms for micro-interactions
- Easing: `cubic-bezier(0.25, 0.1, 0.25, 1)` for entrances
- No bounce. No overshoot. No playful motion.
- Everything enters from stillness. Calm, precise, intentional.

### Scroll Animations (IntersectionObserver)
- Elements fade in from `opacity: 0; transform: translateY(20px)` → `opacity: 1; translateY(0)`
- Stagger children by 80ms
- Threshold: 0.15 (trigger when 15% visible)

### Data Diagram Animations
- SVG path draw: `stroke-dasharray` / `stroke-dashoffset` animation over 1.2s
- Chart bars grow from bottom with stagger
- Numbers count up with eased interpolation over 800ms
- Forecast line draws left-to-right with trailing opacity gradient

### Parallax
- Hero background subtle Y shift at 0.3x scroll rate
- Section illustrations at 0.15x scroll rate
- Never aggressive. Maximum 30px displacement.

### Hover Micro-interactions
- Cards: translateY(-2px) + shadow deepen, 200ms
- Buttons: background transition 200ms
- Links: underline slide-in from left, 250ms
- Pricing toggle: smooth slide with spring-like ease

---

## Iconography

- Style: 1.5px stroke, rounded caps, rounded joins
- Size: 24×24 grid, with 20×20 and 16×16 variants
- Color: inherits text color by default
- No filled icons unless in active/selected state

---

## Accessibility

- All interactive elements have `:focus-visible` outline: 2px solid `--accent-olive`, offset 2px
- Color contrast ratios meet WCAG AA minimum
- Reduced motion: all animations respect `prefers-reduced-motion: reduce`
- Semantic HTML throughout (sections, headings, nav, main, footer)
- Skip-to-content link hidden until focused
