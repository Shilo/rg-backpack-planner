# InputChip Design: Unified Combo Chips

## Problem

The original `Kbd.svelte` renders each key as a separate badge with `+` and `/` text separators between them. For shortcuts with multiple alternatives (e.g. `Tab / Shift + Tab / ← / →`), this creates visual noise — the `+` combos split across badges and the `/` separators add further confusion. It's also keyboard-only, hiding on touch devices.

## Goal

- Render an entire combo (e.g. `Ctrl + Z`) as **one cohesive chip**
- Display multiple alternatives as **separate chips with no text separators** — spacing and pill boundaries alone make it obvious
- Support **all input types**: keyboard, mouse, touch
- Visual companion: [design-companion-input-chips.html](../design-companion-input-chips.html)

---

## Approaches Explored

### A. Segmented Pill (Baseline)

The current `KbdChip.svelte`. One pill per combo, faint `+` glyph between segments. Modifiers slightly dimmed.

```
[Ctrl + Z]  [Shift + Tab]  [Tab]
```

| Strengths | Weaknesses |
|---|---|
| Clean, minimal, already proven | `+` glyph inside pill can still read as two things |
| Each chip reads as one unit | No visual hierarchy between modifier and action |
| Familiar `+` symbol | |

---

### B. Inset Divider (Selected)

Same pill, but a thin inset border replaces the `+` glyph. Segments become visual compartments — like a segmented control.

```
[Ctrl│Z]  [Shift│Tab]  [Tab]
```

| Strengths | Weaknesses |
|---|---|
| Divider reads as "part of the same thing" | Slightly heavier visual weight than A |
| Excellent scannability — each pill is one atomic unit | Divider line adds small visual noise |
| Scales cleanly to 3-part combos (⌘│Shift│Z) | |
| No extra symbols needed | |

---

### C. Gradient Modifier Zone

Modifier segments get a darker background that blends into the action segment. No dividers, no `+`. Background shift alone signals hierarchy.

```
[▓Ctrl ›  Z]  [▓Shift ›  Tab]  [Tab]
```

| Strengths | Weaknesses |
|---|---|
| Very smooth, unified feel | Background difference is subtle — may not work in all themes |
| Lightest visual weight of combo approaches | `›` chevron is unusual for shortcuts |
| No separators at all | |

---

### D. Accent-Tinted Modifier

Modifier segments pick up a hint of the theme accent color, with an accent-tinted divider. Clear "modifier zone" vs "action zone".

```
[🔵Ctrl│Z]  [🔵Shift│Tab]  [Tab]
```

| Strengths | Weaknesses |
|---|---|
| Strong visual hierarchy — modifiers instantly identifiable | Busiest option, may fight surrounding UI |
| Ties into theme accent, feels native | Color complexity could clash in dense lists |
| Accent divider is a nice micro-detail | |

---

### E. Compact Prefix Notation

Modifiers render as smaller, lighter prefix text within one pill. Typography hierarchy only — no dividers or extra elements.

```
[ᶜᵗʳˡ+Z]  [ˢʰⁱᶠᵗ+Tab]  [Tab]
```

| Strengths | Weaknesses |
|---|---|
| Most compact, great for tooltips | Less visually distinct combos |
| Typography alone creates hierarchy | Modifier and action can blur together |
| No extra visual elements | Harder to scan in long lists |

---

### F. Input-Type Color Coding (Implemented, opt-in)

Each chip gets a subtle tint based on input type: blue for keyboard, green for mouse, amber for touch. Combined with B's inset dividers.

```
🔵[Ctrl│Z]  🟢[Left Click]  🟠[Tap]
```

| Strengths | Weaknesses |
|---|---|
| Maximum info density — input type instantly readable | Most complex (requires knowing input type) |
| Works beautifully on the controls page | Color system must be learned |
| Natural pairing with approach B | May add too many colors to themed UI |

---

## Decision

**Approach B (Inset Divider)** as the base, with **F (Color Coding)** as an opt-in enhancement.

- Best balance of clarity, scannability, and visual weight
- The divider unambiguously communicates "these segments are one combo" without symbols
- Works equally well for keyboard (`Ctrl│Z`), mouse (`Ctrl│Click`), and touch (`Long Press`) inputs
- Color coding via the `tint` prop — omit for neutral, pass `"keyboard"` / `"mouse"` / `"touch"` for tinted

## Components

- **`InputChip.svelte`** — Single combo chip. Parses `" + "` into segments, renders with inset dividers. Optional `tint` prop for color coding.
- **`InputChips.svelte`** — Multi-chip wrapper. Parses `" / "` into alternatives, renders each as an `InputChip`. No text separators — gap spacing only. Passes `tint` through.

## API

```svelte
<!-- Neutral (no color) -->
<InputChip keys="Ctrl + Z" />
<InputChips keys="Tab / Shift + Tab / ← / →" />

<!-- Color-coded by input type -->
<InputChip keys="Ctrl + Z" tint="keyboard" />
<InputChips keys="Left Click / Right Click" tint="mouse" />
<InputChips keys="Tap / Long Press" tint="touch" />
```

## Color Palette (OKLCH)

| Input Type | Tint | OKLCH |
|---|---|---|
| Keyboard | Cool blue | `oklch(0.72 0.14 260)` |
| Mouse | Green | `oklch(0.75 0.12 145)` |
| Touch | Warm amber | `oklch(0.75 0.12 75)` |

Colors are applied at 6% background mix and 20% border mix — subtle enough to not clash with the theme accent, but distinct enough to differentiate at a glance.
