# design.md — Reconcile Design Blueprint

**Status:** Source of truth for the Reconcile look and feel.
**Applies to:** All Reconcile frontend surfaces, demo and full product.
**Does NOT override:** PROJECT_SPEC.md, ARCHITECTURE.md, IMPLEMENTATION_PLAN.md, AGENTS.md,
AI_HANDOFF.md, RECONCILE_BLUEPRINT.md. It sits alongside them as the design source of truth.
**References:** design/reference-1.png, design/reference-2.png

---

## 1. Design north star

Reconcile should feel like a **premium finance product, not a spreadsheet**.

It should read as:
- calm and confident,
- editorial and typographic,
- slightly playful,
- trustworthy without being corporate,
- fast and responsive,
- honest and transparent.

It should never read as:
- a generic SaaS dashboard,
- a bank's legacy app,
- a crypto trading interface,
- a spreadsheet,
- a bootstrap template.

The primary design intention: **make financial data feel human, clear, and worth looking at.**

The reference images set the exact tone: high-contrast black/white with an acidic signal
yellow as the only saturated hero color, oversized numerals, rounded cards with generous
padding, floating pill navigation, and a small set of playful accent shapes (starbursts,
hatched chart fills, circular category tints) used with restraint.

## 2. Reference images

- `design/reference-1.png` — three-screen overview: Home (dark, "Hey, Salim"), Review
  Transactions (fully dark), Home Budget (light).
- `design/reference-2.png` — Home Budget close-up showing the alternating card stack and
  the chart primitives in detail.

These are **direction, not specification**. See §12 for what to adapt and what not to copy.

## 3. Color palette

These are the only colors used. Do not introduce new ones without updating this file.

### Core

| Token | Hex | Usage |
|---|---|---|
| Ink | `#0A0A0A` | Primary text, full dark screen backgrounds, solid chart fills, icon buttons on light screens |
| Paper | `#F6F6F1` | App background, light card surfaces |
| Signal Yellow | `#EAFF00` | Hero card backgrounds, primary buttons, selected nav state, key chart highlight |
| Line | `#DADAD2` | Borders, dividers, quiet separators |

### Secondary surfaces

| Token | Hex | Usage |
|---|---|---|
| Mist Blue | `#CDE5EC` | Secondary info cards (e.g., Budget Overview), cool accent surface |
| Mint | `#D5F2C4` | Positive/reassuring message cards, income indicators |
| Soft Coral | `#FFB0A8` | Card edge accents, warm callout surfaces |
| Lavender | `#A49BFF` | Category icon tint (transport, personal) |

### Emphasis

| Token | Hex | Usage |
|---|---|---|
| Alert Red | `#EF3D28` | Negative starburst badges, over-budget callouts. Never used for text. |

### Category icon tints (circular backgrounds on transaction rows)

| Category | Tint |
|---|---|
| Food | Soft Coral `#FFB0A8` |
| Transport | Lavender `#A49BFF` |
| Bills | Alert Red `#EF3D28` at 15% opacity over Ink, or a muted red |
| Shopping | Signal Yellow `#EAFF00` |
| Entertainment | Mist Blue `#CDE5EC` |
| Health | Mint `#D5F2C4` |
| Personal | Lavender `#A49BFF` |
| Education | Mist Blue `#CDE5EC` |
| Family | Soft Coral `#FFB0A8` |
| Income | Mint `#D5F2C4` |
| Internal Transfer | Paper on Ink (neutral) |

Rules:
- Signal Yellow is never used as a background for long-form body text.
- Signal Yellow is the dominant accent. It should appear on every primary screen at least once.
- Never more than one yellow hero surface per screen.
- Alert Red is used only inside starburst badges and over-budget indicators. Never for text, buttons, or borders.
- Mist Blue, Mint, Soft Coral, and Lavender are used on at most one card per screen, and never two of them side by side.
- Black-on-yellow and yellow-on-black are the only pairings for hero numbers.
- Body text is always Ink on Paper or Paper on Ink.

## 4. Typography

A geometric sans (Inter, or the closest Expo-safe equivalent) across the entire product.
No serifs. No display fonts. No mixing families.

| Role | Weight | Notes |
|---|---|---|
| Display number | 700–800 | Oversized, tabular figures, hero data |
| Title (paired) | 300 + 600 | Two-word titles alternate weight: first word lighter, second heavier (e.g., "Home **Budget**", "Review **Transactions**") |
| Heading | 600–700 | Section titles, card titles |
| Body | 400–500 | Paragraphs, labels, list content |
| Label / caption | 500–600 | Small labels, metadata, timestamps |

Rules:
- Financial numbers always use tabular figures to prevent layout shift.
- Currency symbol is rendered at a smaller size than the number.
- Never center body copy. Financial numbers in cards may be centered only when they are the sole hero element of that card.
- Never letterspace numbers.
- Negative amounts are shown with an explicit minus sign; color alone never conveys direction.
- Paired titles ("Home Budget") use the weight contrast to create editorial rhythm.

Suggested sizes (mobile-first):

| Role | Size | Line height |
|---|---|---|
| Hero display | 56–72 | 1.0 |
| Display | 40–48 | 1.05 |
| Paired title | 36–44 | 1.1 |
| Heading 1 | 28–32 | 1.15 |
| Heading 2 | 22–24 | 1.2 |
| Body | 15–16 | 1.45 |
| Label | 12–13 | 1.3 |

## 5. Spacing, radius, elevation

**Spacing scale (px):** 4, 8, 12, 16, 24, 32, 48. No arbitrary values.

**Radius scale (px):** 12 (chips, small badges), 20 (inputs, compact cards), 28 (main cards), 999 (pills, buttons, nav).

**Screen padding:** 20px horizontal on mobile.

**Card padding:** 20 or 24. Never mixed within the same card.

**Elevation:** shadows are minimal. Prefer surface contrast over heavy shadows.
When a shadow is used: soft, low-opacity, never colored.

**Borders:** 1px Line (`#DADAD2`) for quiet separation on light surfaces. No borders on dark
screens — separation is achieved via surface contrast and spacing.

## 6. Iconography

- Outline icons only. Never filled. Never duotone.
- Stroke width: consistent across the app (target 1.5–1.75).
- Size: 20, 24, 28. Never larger than 32 inside a card.
- Color: Ink by default. Signal Yellow for active nav state on light screens. Paper for
  icons on dark screens.
- **Circular tinted backgrounds** are used on transaction rows: a filled circle in the
  category's tint color, with the outline icon centered in Ink on top.
- Icon buttons (back, menu, edit, grid, card) are rendered as **circular light-gray buttons**
  on light screens and **circular dark-gray / 15%-white buttons** on dark screens.
- Prefer a single icon library (e.g., Lucide) throughout. Never mix icon libraries.

## 7. Component visual specs

### Button
- **Primary:** 56px height, pill radius, Signal Yellow background, Ink text, weight 600.
  Optional trailing icon (e.g., a grid/download icon) rendered in Ink at 20px.
- **Secondary:** 56px height, pill, Paper background, Ink 1px border, Ink text.
- **Ghost:** 48px height, pill, transparent, Ink text, no border.
- **Icon button (circular):** 44×44 minimum, circular, light-gray background on light screens
  (`#E8E8E3` on Paper) or 15%-white on dark screens, outline icon centered in Ink or Paper.
- Pressed state: 0.96 scale for 120ms + subtle haptic.
- Disabled: 40% opacity, no press animation.

### Card
- Radius 28 for main cards, 20 for compact cards.
- **Surface variants:**
  - **Paper** — Paper background, subtle Line border on Paper screens.
  - **Yellow** — Signal Yellow background, no border, Ink text, optional chevron or dropdown affordance top-right.
  - **Ink** — Ink background, Paper text, radius 28. Used for inline dark cards on light screens AND as the full background of the Review screen.
  - **Mist** — Mist Blue background, Ink text. Secondary information cards.
  - **Mint** — Mint background, Ink text. Positive / reassuring messages only.
  - **Coral** — Soft Coral background, Ink text. Warm callouts. Used sparingly.
- Padding: 20 or 24. Never mixed inside the same card.
- Cards never nest more than one level deep.
- A card stack on one screen may alternate surfaces (Paper → Yellow → Ink → Mint) to create
  visual rhythm. See Home Budget in the reference.

### Pill navigation (floating)
- Floats above the bottom safe area with 16px horizontal inset.
- Container: Paper (`#F6F6F1`) pill with soft shadow, or Ink pill on dark screens.
- Selected item: **Signal Yellow circular background** with Ink icon centered.
- Unselected: outline icon at Ink 70% (on light pill) or Paper 70% (on dark pill).
- Labels are not shown inside the pill; only icons.
- 4 items: Home, Activity, Budget, Insights.
- Ask Reconcile is not a pill item; it lives contextually on Home and Insights.

### Inputs
- 56px height, radius 20, Paper background, Line border.
- Focused: Ink 1.5px border, no glow.
- Error: Coral border, Ink error text below at Label size.
- Labels always above the input, never placeholder-only.

### Section header
- Heading 2 weight, Ink.
- Optional small right-aligned action at Label size, Ink 70%.

### Transaction row
- Leading: 40px circular tinted background with a 20px outline icon centered.
- Content: merchant name (Body 500), date below (Label, Ink 60%).
- Trailing: amount (Body 600, tabular, right-aligned).
- Row height: 64–72px. Separator: none; spacing does the work.
- On dark screens, rows use Paper text on Ink.

### Empty state
- Single outline icon (32) at Ink 40%.
- One sentence at Body size.
- Optional single Ghost or Secondary action.

### Loading state
- Skeletons use Line at 60% opacity, radius matching the shape they replace.
- No spinners on content cards. Spinners allowed only for full-screen blocking operations.

### Error state
- One sentence at Body size, Ink.
- One retry action (Secondary).
- Never expose error codes to the user; log them silently.

### Progress bar
- Track: Line at 60% opacity.
- Fill: Ink on light cards, Signal Yellow on Ink cards.
- Pill-shaped ends.
- Optional right-side label (e.g., "50%") in a small white pill over the filled portion.

### Chart primitives

Three chart types only:

**Donut**
- Two-arc donut (used for Summary).
- One arc filled with **diagonal hatch pattern** (45°, 2px lines at 4px spacing), one arc solid Ink.
- Center label: small gray "Total" + large black amount.
- Legend below: colored dot + label + amount, split left/right.
- No drop shadows. No 3D. No gradients.

**Bar chart**
- Bars are rounded rectangles with 8–12px radius.
- Fill options per bar: solid Ink, solid Signal Yellow, or **Signal Yellow with a diagonal
  hatch pattern in Ink**. Exactly one bar in a group uses the hatched fill; the rest are solid.
- Baseline and axis lines: Line at 40%.
- Axis labels: Label size, Ink 60%.
- Badge callout above a highlighted bar: **Alert Red starburst** with white text (e.g., "-$150.00").

**Line chart**
- Single yellow line at 2.5–3px stroke, with filled circle markers at data points (8px).
- Trailing segment rendered as a dashed line to indicate projection.
- Y-axis: 3–4 labels. X-axis: 3–4 date labels.
- No area fill, or area fill at ≤10% opacity of Signal Yellow.
- Corner badge: **white starburst** as a neutral accent.

All charts:
- Animate on mount over 240ms ease-out.
- Must have a text summary equivalent for accessibility (see §10).

### Starburst accent

A small SVG starburst shape used as an attention marker. Three colors:

| Color | Use |
|---|---|
| Signal Yellow | Emphasis next to titles, positive or neutral highlight |
| Alert Red | Negative callouts on charts (e.g., "you spent $150 more this month") |
| Paper / white | Neutral accent on Ink surfaces |

Rules:
- One starburst per screen, maximum.
- Never used purely decoratively.
- Never animated on a loop. Only an entrance pop (180ms) if used as a reveal.

## 8. Screen design direction

### Welcome / Privacy / Country / Auth
- Paper background.
- One paired title (e.g., "Get **Started**"), one short paragraph, one primary action.
- No imagery beyond one restrained starburst.
- Privacy screen shows an explicit two-column table: "What Reconcile can see" / "can't see".

### Home (dark, per reference-1 screen 1)
- Full Ink background.
- Top row: circular avatar left (48px), two circular icon buttons right (grid, card).
- Greeting: "👋 Hey, <Name>" in Display weight 600, Paper text.
- **Yellow Summary card:** "Summary" label + "December 2023" dropdown top-right.
  Donut chart center with hatched + solid arcs. Center label "Total" + large amount.
  Below donut: split legend — left "● Income" + amount, right "◎ Expenses" + amount.
- **Mist card:** "Budget Overview" label + "Today" black pill badge.
  Horizontal progress bar with "50%" white pill on the filled left portion and hatched
  pattern on the remaining right portion. Date range labels below ("Sept 1, 2023" / "Sept 30, 2023").
- Below: recent activity rows (3–5) and an Ask Reconcile ghost/entry.
- Floating pill nav at the bottom, Ink pill with yellow selected circle.

### Review Transactions (fully dark, per reference-1 screen 2)
- Full Ink background. Paper text throughout.
- Top row: circular back arrow left, circular edit/pencil right.
- Paired title: "Review" in Paper 300 + "Transactions" in Paper 700, with a Signal Yellow
  starburst to the right of the title block.
- Transaction list rows: 40px circular tinted icon + merchant + date + right-aligned amount.
- Bottom: full-width Signal Yellow pill button "Import Transactions" with a trailing grid icon.
- This is the only fully-dark screen in the app (apart from Home, which is dark by reference).
- Confirm/chip interactions: 180ms chip scale pulse + haptic + row exits left.
- Progress indicator "3 of 12" in Label size top-right of the list.

### Home Budget (light, per reference-1 screen 3 and reference-2)
- Paper background.
- Top row: circular back arrow left, circular hamburger menu right.
- Paired title: "Home" in Ink 300 + "Budget" in Ink 700.
- **Yellow Expenses card:** "Expenses - Last 4 months" + chevron dropdown.
  Alert-red starburst badge with the delta amount (e.g., "-$150.00").
  Bar chart with 4 bars: one solid Ink small, one Signal Yellow with Ink hatch (tallest,
  highlighted), two solid Ink. Y-axis: $200 / $100 / $0. X-axis: Jun / July / August / Sept.
- **Ink card:** large "$308.00" in Paper at Display weight, "Spent out of $5,000" below in
  Paper 60%. White starburst accent top-right. Line chart with Signal Yellow line + dashed
  projection segment. Y-axis: $400 / $300 / $0. X-axis: Sept 1 / Sept 10 / Sept 20 / Sept 30.
- **Mint card:** "Keep spending. You can spend $500 each day for the rest of the period."
  Ink text, Body size, radius 20.
- Coral edge accent may appear on the bottom edge of the card stack as a subtle detail.

### Activity
- Paper background.
- Timeline grouped by day, day header at Label weight 600.
- Row: category tinted circle (32) + merchant (Body 500) + account (Label) + amount
  (Body 600, tabular right-aligned).
- Filters as horizontal pill scroller: All, New, category, account, month.
- Never more than 50 rows without virtualized list.

### Transaction Detail
- Amount as Display, centered top on Paper.
- Immutable facts in a Paper card: bank, account, date, narration.
- Review state in a separate Paper card: category, note, confirm/edit actions.
- Never blur the line between immutable facts and user state.

### Budget Setup
- Single screen, Paper background.
- Monthly total at top as an editable Display number.
- Optional category caps below, each as a row with an inline number input.
- One Save action, Secondary.
- No charts on setup.

### Budget (light, following Home Budget pattern)
- Paired title "Monthly **Budget**".
- Yellow card: total budget as Display, progress bar with percentage pill.
- Ink card: forecast line chart (Signal Yellow).
- Paper card: category list — each row: tinted icon, category, spent, limit, mini progress bar.
- Coral used only when a category is over its cap.

### Insights
- Paired title "This **Month**".
- Yellow card: this month vs last month total, paired Display numbers.
- Ink card: biggest category change, with a starburst accent.
- Paper card: top merchant.
- Ask Reconcile entry at the bottom.
- No more than 4 insight cards visible.

### Ask Reconcile
- Paper background.
- Conversational list, user messages right-aligned in Ink bubbles, answers left-aligned in Paper cards.
- Suggested prompts above the input on first open.
- Answer cards include a small "based on: <data>" line for grounding transparency.
- Input: 56px pill, Ink border on Paper, Ink text, send icon.

### Settings
- Paper background. List of rows. No hero.
- Sign out as a Coral-tinted row (not destructive-red; Alert Red is reserved for starbursts).
- Privacy controls, accounts, subscription rows grouped.

## 9. Motion and haptics

Motion principles:
- Motion clarifies, never decorates.
- Standard duration: 180–280ms.
- Chart transitions: 240ms ease-out.
- Screen transitions: platform default unless a specific transition clarifies hierarchy.
- Reduced motion: all animations become instant or fade-only. Respect the OS setting.

Haptic principles:
- Confirm success: light impact.
- Destructive action confirmation: medium impact.
- Selection change: selection haptic.
- Never haptic on scroll, hover, or passive state.

## 10. Accessibility

- Touch targets: 44×44 minimum.
- Contrast: WCAG AA minimum on all text and interactive elements.
  - Ink on Signal Yellow: verify with the actual yellow chosen. If contrast fails, darken
    the text or add a subtle Ink outline.
  - Paper on Ink: passes.
  - Ink on Mist / Mint / Coral / Lavender: verify each pairing.
- Color is never the only signal for meaning (direction, status, category).
- Type scales with OS settings; no fixed pixel heights on text containers.
- Screen reader labels on every icon-only button.
- Reduced motion respected system-wide.
- Charts must have a text summary equivalent (e.g., a hidden accessibility label describing
  the data and the trend).
- The donut, bar, and line charts must expose their values in an accessibility-friendly list
  format, not just as a visual.

## 11. Anti-patterns

Do not:
- add gradients (including on buttons),
- add glassmorphism,
- add drop shadows to text,
- add more than one yellow hero card per screen,
- use more than three accent colors on one screen,
- center body copy,
- use all-caps for anything except two-letter currency codes,
- use decorative dividers,
- add illustrations beyond the starburst and the hatched chart pattern,
- animate anything longer than 300ms,
- use red for text, buttons, or borders (Alert Red is for starburst badges only),
- nest cards,
- put charts inside cards smaller than 240px wide,
- show more than one chart of the same type on one screen,
- use hatched chart fills on more than one bar in a group,
- use Signal Yellow as a text color on Paper,
- use Paper as a text color on Signal Yellow (use Ink),
- render a paired title without the weight contrast.

## 12. Reference image notes

The reference images are **direction, not specification**.

### Adapt from them
- the black / off-white / signal-yellow dominance,
- the oversized numeric hierarchy,
- the rounded card language (radius 20–28),
- the floating pill navigation with a yellow selected circle,
- the circular tinted icon backgrounds on transaction rows,
- the paired-title weight contrast,
- the alternating card stack on one screen (Paper → Yellow → Ink → Mint),
- the donut / bar / line chart primitives,
- the hatched chart fill pattern,
- the starburst accent in yellow / red / white,
- the restrained coral / mist / mint accent surfaces,
- the editorial feel.

### Do not
- copy layouts literally,
- copy specific screens one-to-one,
- copy any branding,
- reproduce any illustration or illustration style from the images,
- lift typography families that conflict with §4,
- reproduce the visible typos ("th rest of the period") — write correct copy,
- reproduce the exact dummy data (Salim, December 2023, $500.00, $1,747.00, $1,070.00,
  Internet-wifi, Ticket, Electrical bill, Gym, $54, $35, $50, $50, $308.00, $5,000, $150.00),
- reproduce the exact bar values (Jun / July / August / Sept) or the exact axis labels.

When the reference and this document disagree, **this document wins**.

## 13. Currency and locale

- Currency symbol is rendered smaller than the number (e.g., `$` at 60% size, `308.00` at full).
- Decimal separator and grouping follow the user's locale.
- NGN is the default for the Nigeria-first launch.
- Amounts are always stored as integer minor units (kobo for NGN, cents for USD)
  and formatted only at the presentation boundary.
- Tabular figures are required on all financial values, everywhere, without exception.

## 14. Dark surface rules

The reference uses full-dark surfaces on Home and Review Transactions.
Rules for dark surfaces:

- Background is Ink `#0A0A0A`, never pure black `#000000`.
- Text is Paper `#F6F6F1`, never pure white `#FFFFFF`.
- Icon buttons on dark surfaces use a subtle 12–15% Paper overlay as the circular background.
- Charts on dark surfaces invert: the line/bar is Signal Yellow, axes are Paper at 40% opacity.
- The floating pill nav on dark screens is Ink with a Signal Yellow selected circle.
- Yellow hero cards still appear on dark screens, preserving the yellow-as-hero rule.
- Only the Review Transactions and Home screens use full-dark backgrounds in the MVP.

---

## 15. Reference adoption checklist

Before any screen is considered visually complete, verify against this checklist:

- [ ] Yellow hero appears at least once
- [ ] No more than one yellow hero card
- [ ] Financial numbers are tabular
- [ ] Paired title uses weight contrast
- [ ] Card stack alternates surfaces if more than two cards
- [ ] Circular tinted icon on any transaction row
- [ ] One chart type per card, no duplicates
- [ ] Hatched fill on at most one bar per chart
- [ ] Starburst used at most once, and only with a purpose
- [ ] Floating pill nav has a yellow selected circle
- [ ] No gradients, no glassmorphism, no text shadows
- [ ] No red used for text, buttons, or borders
- [ ] Body copy is never centered
- [ ] All touch targets ≥44×44
- [ ] Reduced-motion fallback present
- [ ] Accessibility labels on every icon-only element
- [ ] Chart has a text equivalent