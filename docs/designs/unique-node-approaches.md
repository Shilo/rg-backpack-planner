# Unique Node Differentiation — Design Approaches

**Date:** 2026-03-27
**Status:** Brainstorming (no approach selected yet)
**Visual reference:** [unique-node-approaches.html](unique-node-approaches.html) (open in browser)

## Problem

Each tree type (Guardian, Vanguard, Cannon) has 6 class-specific "unique" skill nodes that differ from the 9 common skills shared by all trees. Currently, all nodes render identically — same circle shape, same borders, same color system. The only differentiation is the icon and name badge, which doesn't communicate uniqueness at a glance.

### Unique skills per tree

| Tree | Unique Skills |
|------|--------------|
| Guardian | skill_crit, pierce_resistance, stun |
| Vanguard | pierce_damage, counterattack_resistance, critical_hit |
| Cannon | skill_crit_resistance, ignore_stun, damage_reflection_chance |

### Common skills (all trees)

attack_boost, hp_boost, defense_boost, dodge, ignore_dodge, global_atk, global_def, global_hp, final_damage_boost

### Where unique nodes appear in the tree

Tree indices 3, 5, 14, 16, 24, 26 — the Tier 3 "branch specialization" slots filled via `BranchSkillIds` in `createTree()`.

## Constraints

- Must NOT outshine the hexagon leaf node (final_damage_boost) — leaf is the apex visual
- Communicates "different class identity", NOT "more powerful"
- Works across all 4 node states: locked, available, active, maxed
- Works across all 3 branch regions: yellow, orange, blue
- Respects OKLCH dynamic theming (light/dark, colorblind modes)
- Respects `prefers-reduced-motion` where animations are involved

## Current visual hierarchy (for reference)

```
Common (locked) → Common (active) → Important (global_*) → Leaf (hexagon)
   circle            circle            circle (larger icon)    hexagon shape
   dim/gray          branch color      branch color            branch color
```

Unique nodes sit at the same tier as common active nodes — they should be distinguishable from common but not elevated above important/leaf.

## Approaches

### A. Dashed Border

**Technique:** `border-style: dashed` on unique nodes
**Pros:** Minimal change, zero extra DOM, works in all states, familiar visual vocabulary
**Cons:** Can feel utilitarian; dashes may read as "incomplete" to some users
**Impl complexity:** Trivial (1 CSS rule)

### B. Double Ring (Outer Ring)

**Technique:** `box-shadow: 0 0 0 3px <bg>, 0 0 0 5px <border-color>` creates a gap + outer ring
**Pros:** Clear visual signal, works across states, no shape change
**Cons:** Expands visual footprint — could imply power/importance over common nodes
**Impl complexity:** Low (box-shadow per region)

### C. Corner Diamond Mark

**Technique:** `::after` pseudo-element, small rotated square at top-right edge
**Pros:** Very subtle, doesn't alter the node itself
**Cons:** Feels like a UI notification badge — foreign to the design language
**Impl complexity:** Low (pseudo-element)

### D. Soft Glow / Aura

**Technique:** `box-shadow: 0 0 12px 3px rgba(<branch-color>, 0.35)`
**Pros:** Atmospheric, premium feel, no shape/border change
**Cons:** Can get noisy with 6 glowing nodes; conflicts with potential hover glow effects
**Impl complexity:** Low (box-shadow per region)

### E. Inner Concentric Ring

**Technique:** `::after` pseudo-element with `inset: 4px; border: 1.5px solid; opacity: 0.4`
**Pros:** Contained within node bounds, clean, no footprint change
**Cons:** Subtle enough that it might be missed; may conflict with icon rendering at small sizes
**Impl complexity:** Low (pseudo-element)

### F. Gradient Border

**Technique:** Pseudo-element gradient border (::before for gradient, ::after for inner fill)
**Pros:** Rich, premium feel; stays within the branch color system
**Cons:** More complex impl (pseudo-elements needed for circular gradient borders); uses ::before/::after which may conflict with existing node pseudo-elements
**Impl complexity:** Medium (pseudo-element layering, state management)

### G. Squircle Shape (recommended #1)

**Technique:** `border-radius: 30%` instead of `50%` (circle)
**Pros:** Clear shape hierarchy (circle → squircle → hexagon); instantly scannable; zero extra DOM/elements; communicates "different" not "better"; one CSS property change
**Cons:** Subtle — may not be noticeable enough for some users at small zoom levels
**Impl complexity:** Trivial (1 CSS rule)

### H. Pulsing Dot Indicator

**Technique:** `::after` pseudo-element with gentle CSS animation
**Pros:** Adds life and motion, clear indicator
**Cons:** Animation fatigue with 6 pulsing dots; violates "subtle" constraint; needs reduced-motion handling
**Impl complexity:** Low (pseudo-element + keyframe)

### I. Star / Sparkle Accent

**Technique:** `::after` with `content: '\2726'` (sparkle character)
**Pros:** Thematic, decorative
**Cons:** Text character renders inconsistently across platforms/fonts; risks reading as "rare/powerful"
**Impl complexity:** Low (pseudo-element)

### J. Subtle Tilt / Rotation

**Technique:** `transform: rotate(8deg)`
**Pros:** Playful, zero extra elements, unconventional
**Cons:** Chaotic in tree layout (misaligns with connection lines); makes level badges harder to read
**Impl complexity:** Trivial (1 CSS rule) but downstream layout complications

## Recommended ranking

1. **G — Squircle** — best "different not better" signal, clear shape language
2. **A — Dashed Border** — clean, familiar, minimal
3. **E — Inner Ring** — contained, subtle
4. **F — Gradient Border** — rich feel, stays in color system
5. **B — Double Ring** — clear but may imply importance
6. **D — Soft Glow** — pretty but noisy at scale
7. **C — Diamond Mark** — works but feels foreign
8. **H — Pulsing Dot** — too much motion
9. **I — Star Accent** — inconsistent rendering
10. **J — Tilt** — layout complications

## Implementation notes

- The `isUnique` boolean would be computed from the tree config's `BranchSkillIds` — checking if a node's `skillId` appears in the class-specific skill list
- Could also be derived structurally: indices 3, 5, 14, 16, 24, 26 are always the unique slots
- The prop would be passed from `Tree.svelte` to `Node.svelte` alongside existing props like `isLeaf`
- CSS class `.node-unique` (or similar) applied conditionally
