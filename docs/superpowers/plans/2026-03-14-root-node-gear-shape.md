# Root Node Gear Shape Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the root node's transparent button + floating GearSix icon with a gear-shaped CSS button that matches the hex leaf node visual language (solid fill, border outline, drop shadow).

**Architecture:** Pure CSS gear shape via `clip-path: polygon()` on a native `<button>`, with `::before`/`::after` pseudo-elements for border and fill layers — identical mechanism to hex nodes. Removes the `Button` component wrapper and `GearSix` icon import entirely. Fixes nested interactive element accessibility violation.

**Tech Stack:** Svelte 5, CSS custom properties, CSS `clip-path`

---

## Chunk 1: Tests and Implementation

### Task 1: Write root node gear structure test

**Files:**
- Create: `test/rootNodeGearStructure.test.ts`
- Modify: `test/index.ts`

This test verifies the new RootNode structure: no nested interactive elements, gear clip-path present, correct size constant, proper accessibility attributes on the button, and no Button/GearSix imports.

- [ ] **Step 1: Write the test file**

```typescript
// test/rootNodeGearStructure.test.ts
import { readFileSync } from "node:fs";

const src = readFileSync(
    new URL("../src/lib/RootNode.svelte", import.meta.url),
    "utf8",
);

// 1. No Button component import (removes nested interactive element)
if (/import\s+Button\b/.test(src)) {
    throw new Error(
        "RootNode should not import the Button component — the gear shape uses a native <button>.",
    );
}

// 2. No GearSix icon import (gear is pure CSS)
if (/import.*GearSix/.test(src)) {
    throw new Error(
        "RootNode should not import GearSix — the gear shape is pure CSS clip-path.",
    );
}

// 3. ROOT_SIZE updated to 44
if (!/ROOT_SIZE\s*=\s*44/.test(src)) {
    throw new Error(
        "ROOT_SIZE should be 44 (up from 32).",
    );
}

// 4. Uses --gear-clip custom property
if (!/--gear-clip/.test(src)) {
    throw new Error(
        "RootNode should define a --gear-clip custom property for the gear polygon.",
    );
}

// 5. Button element has data-node-id="root"
if (!/<button[^>]*data-node-id="root"/.test(src) && !/<button[^>]*data-node-id=\{"root"\}/.test(src)) {
    throw new Error(
        'The <button> element should have data-node-id="root" for Tree.svelte pointer detection.',
    );
}

// 6. root-wrapper div should NOT have role="button" (no nested interactive)
if (/class="root-wrapper"[^>]*role="button"/.test(src)) {
    throw new Error(
        'root-wrapper should not have role="button" — it is a plain positioning div.',
    );
}

// 6b. Button element has tabindex="0" for keyboard focus
if (!/<button[^>]*tabindex="0"/.test(src)) {
    throw new Error(
        'The <button> should have tabindex="0" for keyboard focus.',
    );
}

// 6c. Button element has aria-label for accessibility
if (!/<button[^>]*aria-label/.test(src)) {
    throw new Error(
        "The <button> should have an aria-label for accessibility.",
    );
}

// 7. Gear button uses clip-path: var(--gear-clip)
if (!/clip-path:\s*var\(--gear-clip\)/.test(src)) {
    throw new Error(
        "The gear button should use clip-path: var(--gear-clip).",
    );
}

// 8. Has ::before and ::after pseudo-elements for border/fill layers
if (!/::before/.test(src) || !/::after/.test(src)) {
    throw new Error(
        "RootNode should use ::before (border) and ::after (fill) pseudo-elements.",
    );
}

// 9. Uses drop-shadow with --shadow-node-hex token
if (!/drop-shadow\(var\(--shadow-node-hex\)\)/.test(src)) {
    throw new Error(
        "Gear button resting state should use drop-shadow(var(--shadow-node-hex)).",
    );
}

// 10. Imports triggerHaptic for keyboard handler
if (!/import.*triggerHaptic.*from/.test(src)) {
    throw new Error(
        "RootNode should import triggerHaptic from hapticsStore for the keyboard handler.",
    );
}
```

- [ ] **Step 2: Register the test in index.ts**

Add `"rootNodeGearStructure.test.ts"` to the test list in `test/index.ts`, in the "5. UI & Interaction" section, after `"nodeFocusStyle.test.ts"`:

```typescript
    "nodeFocusStyle.test.ts",
    "rootNodeGearStructure.test.ts",
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `rootNodeGearStructure.test.ts` fails because RootNode.svelte still has the old structure.

- [ ] **Step 4: Commit failing tests**

```bash
git add test/rootNodeGearStructure.test.ts test/index.ts
git commit -m "test: add root node gear shape structure tests (red)"
```

---

### Task 2: Write capture styles test

**Files:**
- Create: `test/rootNodeGearCaptureStyles.test.ts`
- Modify: `test/index.ts`

This test verifies that `captureStyles.css` pins `--gear-border-width` for snapdom capture, following the same pattern as `--hex-border-width`.

- [ ] **Step 1: Write the test file**

```typescript
// test/rootNodeGearCaptureStyles.test.ts
import { readFileSync } from "node:fs";

const css = readFileSync(
    new URL("../src/lib/buildImageExport/captureStyles.css", import.meta.url),
    "utf8",
);
const normalized = css.replace(/\s+/g, " ");

// Verify --gear-border-width is pinned for snapdom capture
if (!/html\.snapdom-capture\s+\.root-node-gear\s*\{[^}]*--gear-border-width:\s*2px\s*!important/.test(normalized)) {
    throw new Error(
        "captureStyles.css should pin --gear-border-width: 2px !important on .root-node-gear under html.snapdom-capture.",
    );
}
```

- [ ] **Step 2: Register the test in index.ts**

Add `"rootNodeGearCaptureStyles.test.ts"` to the test list in `test/index.ts`, after `"rootNodeGearStructure.test.ts"`:

```typescript
    "rootNodeGearStructure.test.ts",
    "rootNodeGearCaptureStyles.test.ts",
```

- [ ] **Step 3: Run tests to verify it fails**

Run: `npm test`
Expected: FAIL — `rootNodeGearCaptureStyles.test.ts` fails because the rule doesn't exist yet.

- [ ] **Step 4: Commit failing test**

```bash
git add test/rootNodeGearCaptureStyles.test.ts test/index.ts
git commit -m "test: add root node gear capture styles test (red)"
```

---

### Task 3: Implement the RootNode gear shape

**Files:**
- Modify: `src/lib/RootNode.svelte`

Completely rework the component: new imports, updated constant, new HTML structure, new CSS.

- [ ] **Step 1: Rewrite RootNode.svelte**

Replace the entire contents of `src/lib/RootNode.svelte` with:

```svelte
<script lang="ts">
    import { t } from "svelte-whisper";
    import { triggerHaptic } from "./hapticsStore";

    const ROOT_SIZE = 44;

    export let x = 0;
    export let y = 0;
    export let onRootNodeClick: ((x: number, y: number) => void) | null = null;
    export let onFocusView: (() => void) | null = null;

    function handleKeydown(e: KeyboardEvent) {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        const el = e.currentTarget as HTMLElement;
        triggerHaptic();
        if (onRootNodeClick) {
            const r = el.getBoundingClientRect();
            onRootNodeClick(r.left + r.width / 2, r.top + r.height / 2);
        } else {
            onFocusView?.();
        }
    }
</script>

<div
    class="root-wrapper"
    style="left: {x}px; top: {y}px; width: {ROOT_SIZE}px; height: {ROOT_SIZE}px"
>
    <button
        class="root-node-gear"
        data-node-id="root"
        tabindex="0"
        aria-label={$t("quickSettings.ariaLabel")}
        on:keydown={handleKeydown}
    ></button>
</div>

<style>
    .root-wrapper {
        position: absolute;
        transform: translate(-50%, -50%);
        cursor: pointer;
    }

    .root-node-gear {
        --gear-clip: polygon(
            79.67% 38.01%, 94.32% 42.19%, 94.32% 57.81%, 79.67% 61.99%,
            75.22% 69.70%, 78.93% 84.47%, 65.39% 92.29%, 54.45% 81.69%,
            45.55% 81.69%, 34.61% 92.29%, 21.07% 84.47%, 24.78% 69.70%,
            20.33% 61.99%,  5.68% 57.81%,  5.68% 42.19%, 20.33% 38.01%,
            24.78% 30.30%, 21.07% 15.53%, 34.61%  7.71%, 45.55% 18.31%,
            54.45% 18.31%, 65.39%  7.71%, 78.93% 15.53%, 75.22% 30.30%
        );
        --gear-fill: var(--surface);
        --gear-border-color: var(--border);
        --gear-border-width: 2px;

        width: 100%;
        height: 100%;
        padding: 0;
        clip-path: var(--gear-clip);
        position: relative;
        overflow: visible;
        isolation: isolate;
        background: transparent;
        border: none;
        box-shadow: none;
        filter: drop-shadow(var(--shadow-node-hex));
        outline: none;
        cursor: pointer;
    }

    .root-node-gear::before {
        content: "";
        position: absolute;
        inset: 0;
        clip-path: var(--gear-clip);
        background: var(--gear-border-color);
        z-index: 0;
        pointer-events: none;
    }

    .root-node-gear::after {
        content: "";
        position: absolute;
        inset: var(--gear-border-width);
        clip-path: var(--gear-clip);
        background: var(--gear-fill);
        z-index: 0;
        pointer-events: none;
    }

    @media (hover: hover) {
        .root-node-gear:hover {
            filter: var(--brightness-hover);
        }
    }

    .root-node-gear:active {
        filter: var(--brightness-hover);
        transform: scale(0.96);
    }
</style>
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test`
Expected: PASS for `rootNodeGearStructure.test.ts`. FAIL still expected for `rootNodeGearCaptureStyles.test.ts`.

- [ ] **Step 3: Run type check**

Run: `npm run check`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/RootNode.svelte
git commit -m "feat: replace root node with gear-shaped CSS button"
```

---

### Task 4: Add gear capture styles rule

**Files:**
- Modify: `src/lib/buildImageExport/captureStyles.css`

Add the `--gear-border-width` pin rule for snapdom capture, following the existing pattern for `--hex-border-width`.

- [ ] **Step 1: Add the capture rule**

Append the following rule block at the end of `captureStyles.css` (before the closing of the file), after the `.node-flash` rule:

```css

/* Pin --gear-border-width on the root node gear so the ::after inset survives
   snapdom's DOM cloning — same mechanism as --hex-border-width on .node-wrapper. */
html.snapdom-capture .root-node-gear {
    --gear-border-width: 2px !important;
}
```

- [ ] **Step 2: Run tests to verify all pass**

Run: `npm test`
Expected: ALL PASS — both `rootNodeGearStructure.test.ts` and `rootNodeGearCaptureStyles.test.ts` now pass.

- [ ] **Step 3: Run type check**

Run: `npm run check`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/buildImageExport/captureStyles.css
git commit -m "fix: pin --gear-border-width in capture styles for snapdom"
```

---

### Task 5: Visual verification

- [ ] **Step 1: Start dev server and verify visually**

Run: `npm run dev`

Open `http://localhost:5173/rg-backpack-planner/` and verify:
1. The root node renders as a 6-tooth gear shape (not a floating icon)
2. It has a solid fill (`--surface`) with a visible border outline
3. It has a drop shadow matching other hex nodes
4. Hover brightens/darkens the gear (depending on light/dark theme)
5. Active state scales down to 0.96
6. Clicking opens the quick settings menu
7. Keyboard (Enter/Space) opens the quick settings menu
8. The gear shape is visible across different themes

- [ ] **Step 2: Verify image export**

Export a build screenshot and confirm the gear node renders correctly in the exported image (border and fill intact).

- [ ] **Step 3: Commit any fixes if needed**

If visual verification reveals issues, fix and commit with descriptive message.
