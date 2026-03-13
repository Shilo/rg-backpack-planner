# MD3 Expressive Motion Polish

Upgrade the animation system from commit `0f5331d` to align with Material Design 3 Expressive motion principles: faster modal animations, frosted-glass backdrops, and spring-inspired juice that feels creative yet professional.

## 1. Motion Token System

Replace easing tokens in `src/theme.css`:

| Token | Value | Purpose |
|---|---|---|
| `--ease` | `0.2s ease` | Unchanged, utility fallback |
| `--ease-spring` | `0.3s cubic-bezier(0.34, 1.56, 0.64, 1)` | Unchanged, toggle/small interactive bounce |
| `--ease-decel` | `0.2s cubic-bezier(0.05, 0.7, 0.1, 1)` | **New.** MD3 emphasized-decelerate. Primary enter curve. |
| `--ease-accel` | `0.15s cubic-bezier(0.3, 0, 0.8, 0.15)` | **New.** MD3 emphasized-accelerate. Exit curve. |
| `--ease-standard` | `0.2s cubic-bezier(0.2, 0, 0, 1)` | **New.** MD3 standard. Utility motion. |

**Removed:** `--ease-out-expo` (consumers migrated), `--ease-in-out` (unused, no consumers).

### Token usage policy

Tokens bake in both duration and curve (e.g., `--ease-decel` = `0.2s cubic-bezier(...)`). Use `var(--ease-decel)` when the component's desired duration matches the token's `0.2s`. When a component needs a different duration, hardcode the raw `cubic-bezier()` value with a custom duration — do not use `var()`. This keeps the token system simple while allowing per-component timing.

## 2. Backdrop Glass Effect

Update the `--backdrop-overlay` CSS variable in `app.css` from `rgba(0, 0, 0, 0.5)` to `rgba(0, 0, 0, 0.35)`. Both modal and side menu backdrops consume this variable, so updating it once covers both.

### Modal backdrop (`ModalHost.svelte`)
- Add `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px)`
- Background uses `var(--backdrop-overlay)` — inherits the updated `0.35` value

### Side menu backdrop (`SideMenu.svelte`)
- Add `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px)` on `.menu-backdrop`
- Remove inline fallback `var(--backdrop-overlay, rgba(0, 0, 0, 0.5))` → use `var(--backdrop-overlay)` — inherits the updated value

### Context menu backdrop (`ContextMenu.svelte`)
- Add `backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px)`
- Keep existing `--backdrop-overlay-context` opacity (`rgba(0,0,0,0.25)`)

## 3. Component Animation Changes

### Modals (`ModalHost.svelte`)
- Backdrop fade-in: `0.15s ease` (was `0.2s`)
- Shell enter: `0.2s cubic-bezier(0.05, 0.7, 0.1, 1)` — can use `var(--ease-decel)` (was `0.25s` with `var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1))`)
- Replace `var(--ease-out-expo, ...)` with `var(--ease-decel)` on the animation property
- Keep existing `modal-shell-in` keyframe shape: scale(0.92)→1 + translateY(6px)→0

### Context menu (`ContextMenu.svelte`)
- Target keyframe: `ctx-menu-enter` inside `ContextMenu.svelte` (not the dead `context-menu-in` in `app.css`)
- Enter: `0.15s cubic-bezier(0.05, 0.7, 0.1, 1)` (was `0.18s ease`)
- Backdrop: `0.12s ease` (was `0.15s`)
- Also remove dead `@keyframes context-menu-in` from `app.css`

### Toasts (`Toasts.svelte`)
- Enter: `0.25s cubic-bezier(0.05, 0.7, 0.1, 1)` — hardcode curve with custom duration (was `0.3s` with `var(--ease-out-expo, ...)`)
- Replace `var(--ease-out-expo, ...)` with raw `0.25s cubic-bezier(0.05, 0.7, 0.1, 1)`
- Update `toast-enter` keyframes in `app.css` to add scale overshoot:
  ```
  0%   { opacity: 0; transform: translateY(8px) scale(0.92); }
  70%  { opacity: 1; transform: translateY(0) scale(1.02); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
  ```

### FAB actions (`FabMenu.svelte`)
- Enter: `0.18s cubic-bezier(0.05, 0.7, 0.1, 1)` — hardcode curve with custom duration (was `0.2s ease`)
- Tighter stagger delays: 0, 25, 50, 75, 100ms (was 0, 35, 70, 105, 140ms)

### Side menu (`SideMenu.svelte`)
- Slide transition: `0.25s cubic-bezier(0.05, 0.7, 0.1, 1)` — hardcode curve with custom duration (was `0.2s cubic-bezier(0.16, 1, 0.3, 1)` raw value). Slightly longer for weight.
- Item stagger animation: `0.2s cubic-bezier(0.05, 0.7, 0.1, 1)` — can use `var(--ease-decel)` (was `0.25s ease`)
- Tighter delays: 15, 35, 55, 75, 95, 115ms (was 20, 50, 80, 110, 140, 170ms)

### Tooltips (`app.css`, `.tooltip` class)
- Update `animation` property on `.tooltip` to `tooltip-in 0.12s ease both` (was `0.15s`)
- No keyframe changes — just the duration on the animation shorthand

### Level-up splash (`LevelUpSplash.svelte`)
- Update `splash-float` animation curve from `cubic-bezier(0.16, 1, 0.3, 1)` to `cubic-bezier(0.05, 0.7, 0.1, 1)`
- Increase existing overshoot in `splash-float` keyframes from `scale(1.02)` to `scale(1.04)` at the 15% mark:
  ```
  0%   { opacity: 0; transform: scale(0.85) translateY(4px); }
  15%  { opacity: 1; transform: scale(1.04) translateY(0); }
  25%  { transform: scale(1) translateY(0); }
  65%  { opacity: 1; transform: scale(1) translateY(0); }
  100% { opacity: 0; transform: scale(0.97) translateY(-12px); }
  ```

### Node ring (`NodeFlash.svelte`)
- Update `node-ring-expand` keyframes to expand further with a slight overshoot via larger inset range:
  ```
  0%   { opacity: 0.7; inset: 0; }
  60%  { opacity: 0.3; inset: -12px; }
  100% { opacity: 0; inset: -10px; }
  ```
  The ring expands past its final size then settles back, creating a spring-like pulse.

### Toggle switch (`ToggleSwitch.svelte`)
- No changes needed — already uses `--ease-spring` which is unchanged

## 4. Reduced Motion

No changes needed. Existing `prefers-reduced-motion` media query in `app.css` globally collapses all animation/transition durations. Backdrop blur is visual (not motion) and stays active.

## 5. Files Changed

- `src/theme.css` — easing token additions and removals
- `src/app.css` — tooltip duration, toast-enter keyframe overshoot, remove dead `context-menu-in` keyframe
- `src/lib/ModalHost.svelte` — backdrop glass, replace `var(--ease-out-expo, ...)`, faster duration
- `src/lib/SideMenu.svelte` — backdrop glass, updated curve/duration/stagger delays
- `src/lib/ContextMenu.svelte` — subtle glass, faster enter with decel curve
- `src/lib/Toasts.svelte` — replace `var(--ease-out-expo, ...)`, custom duration
- `src/lib/FabMenu.svelte` — decel curve, tighter stagger
- `src/lib/LevelUpSplash.svelte` — updated curve, scale overshoot in splash-float
- `src/lib/NodeFlash.svelte` — overshoot in ring expand

**Note:** Agent skill reference files (`.agents/skills/animate/SKILL.md`, `.agents/skills/frontend-design/reference/motion-design.md`) reference `--ease-out-expo` and should be updated as a follow-up.

## Design Principles

1. **Spatial vs effects**: Position/scale may overshoot. Opacity/color never bounces.
2. **Size-aware speed**: Small elements (tooltips, toggles) ~120-150ms. Large surfaces (modals, side menu) ~200-250ms.
3. **Asymmetric enter/exit**: Enters use emphasized-decelerate (dramatic snap). Exits use emphasized-accelerate (fast, minimal).
4. **Glass layering**: Blur replaces opacity for depth — lighter backgrounds + stronger blur = frosted glass.
