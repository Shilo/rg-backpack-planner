# MD3 Expressive Motion Polish Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the animation system to MD3 Expressive motion with faster modals, frosted-glass backdrops, and spring-inspired juice.

**Architecture:** Pure CSS changes across theme tokens, global keyframes, and component-scoped styles. No logic or state changes. Validation via `npm run check` (svelte-check + TypeScript) and `npm run build`.

**Tech Stack:** CSS custom properties, CSS animations, `backdrop-filter`, Svelte 5 scoped styles.

**Spec:** `docs/superpowers/specs/2026-03-12-md3-expressive-motion-polish-design.md`

---

## Chunk 1: Foundation (tokens + global styles)

### Task 1: Update motion tokens in theme.css

**Files:**
- Modify: `src/theme.css:31-35`

- [ ] **Step 1: Replace easing tokens**

Replace lines 31-35:
```css
    /* Transitions */
    --ease: 0.2s ease;
    --ease-spring: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    --ease-out-expo: 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    --ease-in-out: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
```

With:
```css
    /* Transitions */
    --ease: 0.2s ease;
    --ease-spring: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    --ease-decel: 0.2s cubic-bezier(0.05, 0.7, 0.1, 1);
    --ease-accel: 0.15s cubic-bezier(0.3, 0, 0.8, 0.15);
    --ease-standard: 0.2s cubic-bezier(0.2, 0, 0, 1);
```

- [ ] **Step 2: Run check**

Run: `npm run check`
Expected: PASS (existing consumers of `--ease-out-expo` use CSS fallbacks, so removal is safe before migration)

- [ ] **Step 3: Commit**

```bash
git add src/theme.css
git commit -m "feat: replace easing tokens with MD3 expressive motion curves"
```

### Task 2: Update global styles in app.css

**Files:**
- Modify: `src/app.css:22` (backdrop overlay opacity)
- Modify: `src/app.css:178` (tooltip animation duration)
- Modify: `src/app.css:236-239` (remove dead context-menu-in keyframe)
- Modify: `src/app.css:246-249` (toast-enter keyframe overshoot)

- [ ] **Step 1: Update backdrop overlay opacity**

Change line 22 from:
```css
    --backdrop-overlay: rgba(0, 0, 0, 0.5);
```
To:
```css
    --backdrop-overlay: rgba(0, 0, 0, 0.35);
```

- [ ] **Step 2: Update tooltip animation duration**

Change line 178 from:
```css
    animation: tooltip-in 0.15s ease both;
```
To:
```css
    animation: tooltip-in 0.12s ease both;
```

- [ ] **Step 3: Remove dead context-menu-in keyframe**

Delete lines 236-239:
```css
@keyframes context-menu-in {
    from { opacity: 0; transform: var(--ctx-transform) scale(0.96); filter: blur(2px); }
    to { opacity: 1; transform: var(--ctx-transform) scale(1); filter: blur(0); }
}
```

- [ ] **Step 4: Update toast-enter keyframe with scale overshoot**

Replace the `toast-enter` keyframe (was lines 246-249, shifted after deletion):
```css
@keyframes toast-enter {
    from { opacity: 0; transform: translateY(8px) scale(0.92); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}
```
With:
```css
@keyframes toast-enter {
    0% { opacity: 0; transform: translateY(8px) scale(0.92); }
    70% { opacity: 1; transform: translateY(0) scale(1.02); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
}
```

- [ ] **Step 5: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app.css
git commit -m "feat: update global animation tokens and keyframes for MD3 motion"
```

## Chunk 2: Backdrop glass + modal/menu animations

### Task 3: ModalHost — glass backdrop + faster animation

**Files:**
- Modify: `src/lib/ModalHost.svelte:322` (backdrop animation)
- Modify: `src/lib/ModalHost.svelte:345` (shell animation)
- Add glass properties to `.modal-backdrop`

- [ ] **Step 1: Add glass effect and update backdrop animation**

On `.modal-backdrop` (line 322), change:
```css
        animation: modal-backdrop-in 0.2s ease both;
```
To:
```css
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        animation: modal-backdrop-in 0.15s ease both;
```

- [ ] **Step 2: Update shell animation curve**

On `.modal-shell` (line 345), change:
```css
        animation: modal-shell-in 0.25s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
```
To:
```css
        animation: modal-shell-in var(--ease-decel) both;
```

- [ ] **Step 3: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/ModalHost.svelte
git commit -m "feat: add glass backdrop and MD3 decel curve to modals"
```

### Task 4: SideMenu — glass backdrop + updated curves/stagger

**Files:**
- Modify: `src/lib/SideMenu.svelte:187-188` (backdrop glass)
- Modify: `src/lib/SideMenu.svelte:215` (slide transition curve)
- Modify: `src/lib/SideMenu.svelte:297-317` (item stagger)

- [ ] **Step 1: Add glass effect to backdrop and remove fallback**

On `.menu-backdrop` (line 187-188), change:
```css
        background: var(--backdrop-overlay, rgba(0, 0, 0, 0.5));
```
To:
```css
        background: var(--backdrop-overlay);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
```

- [ ] **Step 2: Update slide transition curve**

On `.side-menu` (line 215), change:
```css
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
```
To:
```css
        transition: transform 0.25s cubic-bezier(0.05, 0.7, 0.1, 1);
```

- [ ] **Step 3: Update item stagger animation and delays**

Change line 298:
```css
        animation: side-menu-item-in 0.25s ease both;
```
To:
```css
        animation: side-menu-item-in var(--ease-decel) both;
```

Update the delay values (lines 300-317):
```css
    .side-menu.open .side-menu__content-inner > :global(:nth-child(1)) {
        animation-delay: 15ms;
    }
    .side-menu.open .side-menu__content-inner > :global(:nth-child(2)) {
        animation-delay: 35ms;
    }
    .side-menu.open .side-menu__content-inner > :global(:nth-child(3)) {
        animation-delay: 55ms;
    }
    .side-menu.open .side-menu__content-inner > :global(:nth-child(4)) {
        animation-delay: 75ms;
    }
    .side-menu.open .side-menu__content-inner > :global(:nth-child(5)) {
        animation-delay: 95ms;
    }
    .side-menu.open .side-menu__content-inner > :global(:nth-child(6)) {
        animation-delay: 115ms;
    }
```

- [ ] **Step 4: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/SideMenu.svelte
git commit -m "feat: add glass backdrop and MD3 motion to side menu"
```

### Task 5: ContextMenu — subtle glass + faster animation

**Files:**
- Modify: `src/lib/ContextMenu.svelte:378` (enter animation)
- Modify: `src/lib/ContextMenu.svelte:404-412` (backdrop animation + glass)

- [ ] **Step 1: Update context menu enter animation**

On `.context-menu` (line 378), change:
```css
        animation: ctx-menu-enter 0.18s ease both;
```
To:
```css
        animation: ctx-menu-enter 0.15s cubic-bezier(0.05, 0.7, 0.1, 1) both;
```

- [ ] **Step 2: Add glass to backdrop and update timing**

On `.context-menu-backdrop` (lines 407-412), change:
```css
        background: var(--backdrop-overlay-context);
        border: none;
        padding: 0;
        z-index: calc(var(--z-index-context-menu) - 1);
        cursor: default;
        animation: modal-backdrop-in 0.15s ease both;
```
To:
```css
        background: var(--backdrop-overlay-context);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: none;
        padding: 0;
        z-index: calc(var(--z-index-context-menu) - 1);
        cursor: default;
        animation: modal-backdrop-in 0.12s ease both;
```

- [ ] **Step 3: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/ContextMenu.svelte
git commit -m "feat: add subtle glass backdrop and faster animation to context menu"
```

## Chunk 3: Component juice (toasts, FAB, splash, ring)

### Task 6: Toasts — updated curve

**Files:**
- Modify: `src/lib/Toasts.svelte:103` (enter animation)

- [ ] **Step 1: Update toast enter animation**

On `.toast` (line 103), change:
```css
        animation: toast-enter 0.3s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
```
To:
```css
        animation: toast-enter 0.25s cubic-bezier(0.05, 0.7, 0.1, 1) both;
```

- [ ] **Step 2: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/Toasts.svelte
git commit -m "feat: update toast animation with MD3 decel curve and overshoot"
```

### Task 7: FabMenu — updated curve + tighter stagger

**Files:**
- Modify: `src/lib/FabMenu.svelte:86` (enter animation)
- Modify: `src/lib/FabMenu.svelte:89-93` (stagger delays)

- [ ] **Step 1: Update FAB enter animation**

On `.fab-menu__action` (line 86), change:
```css
        animation: fab-action-in 0.2s ease both;
```
To:
```css
        animation: fab-action-in 0.18s cubic-bezier(0.05, 0.7, 0.1, 1) both;
```

- [ ] **Step 2: Update stagger delays**

Change lines 89-93:
```css
    .fab-menu__action:nth-child(1) { animation-delay: 0ms; }
    .fab-menu__action:nth-child(2) { animation-delay: 35ms; }
    .fab-menu__action:nth-child(3) { animation-delay: 70ms; }
    .fab-menu__action:nth-child(4) { animation-delay: 105ms; }
    .fab-menu__action:nth-child(5) { animation-delay: 140ms; }
```
To:
```css
    .fab-menu__action:nth-child(1) { animation-delay: 0ms; }
    .fab-menu__action:nth-child(2) { animation-delay: 25ms; }
    .fab-menu__action:nth-child(3) { animation-delay: 50ms; }
    .fab-menu__action:nth-child(4) { animation-delay: 75ms; }
    .fab-menu__action:nth-child(5) { animation-delay: 100ms; }
```

- [ ] **Step 3: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/FabMenu.svelte
git commit -m "feat: update FAB animation with MD3 decel curve and tighter stagger"
```

### Task 8: LevelUpSplash — updated curve + increased overshoot

**Files:**
- Modify: `src/lib/LevelUpSplash.svelte:107` (animation curve)
- Modify: `src/lib/LevelUpSplash.svelte:149` (keyframe overshoot)

- [ ] **Step 1: Update splash animation curve**

On `.level-splash__anim` (line 107), change:
```css
        animation: splash-float 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
```
To:
```css
        animation: splash-float 1.2s cubic-bezier(0.05, 0.7, 0.1, 1) forwards;
```

- [ ] **Step 2: Increase scale overshoot**

In the `splash-float` keyframe (line 149), change:
```css
        15% { opacity: 1; transform: scale(1.02) translateY(0); }
```
To:
```css
        15% { opacity: 1; transform: scale(1.04) translateY(0); }
```

- [ ] **Step 3: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/LevelUpSplash.svelte
git commit -m "feat: increase splash overshoot and use MD3 decel curve"
```

### Task 9: NodeFlash — ring expand overshoot

**Files:**
- Modify: `src/lib/NodeFlash.svelte:61-70` (ring expand keyframe)

- [ ] **Step 1: Update node-ring-expand keyframe**

Replace lines 61-70:
```css
    @keyframes node-ring-expand {
        0% {
            opacity: 0.7;
            inset: 0;
        }
        100% {
            opacity: 0;
            inset: -10px;
        }
    }
```
With:
```css
    @keyframes node-ring-expand {
        0% {
            opacity: 0.7;
            inset: 0;
        }
        60% {
            opacity: 0.3;
            inset: -12px;
        }
        100% {
            opacity: 0;
            inset: -10px;
        }
    }
```

- [ ] **Step 2: Run check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/NodeFlash.svelte
git commit -m "feat: add spring-like overshoot to node ring expand"
```

## Chunk 4: Validation

### Task 10: Full build verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All checks pass, all tests pass

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors
