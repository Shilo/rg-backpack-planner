# Tooltip Action Preview Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize the tooltip to render structured sections, and show total recursive cost + resulting level on node hover.

**Architecture:** Replace `TooltipContent`'s hardcoded cost fields with a `TooltipSection[]` discriminated union. Create a pure `getNodeActionPreview()` utility that reuses `applyLevelChange` + `getCostRange` to compute total cost across all propagated nodes and the target level. Tree.svelte provides node/level data via Svelte context; Node.svelte builds tooltip sections from the preview.

**Tech Stack:** Svelte 4, TypeScript, node:assert/strict (tests)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/tooltip.ts` | `TooltipSection` type, generic `TooltipContent`, `TooltipState` with `sections`, all internal functions updated |
| `src/lib/Tooltip.svelte` | Renders `sections` array, new `tooltip-level-line` style class |
| `src/app.css` | Add `.tooltip-level-line` CSS rule |
| `src/lib/nodeActionPreview.ts` | New — `getNodeActionPreview()` pure function + `NodeActionPreview` type |
| `src/lib/Node.svelte` | Use `getContext` for tree data, call `getNodeActionPreview`, build `TooltipSection[]` |
| `src/lib/Tree.svelte` | `setContext` with writable tree data store |
| `src/lib/nodePrimaryActionStore.ts` | Delete `getPrimaryActionCost` and its unused imports |
| `test/nodeActionPreview.test.ts` | Unit tests for `getNodeActionPreview` |
| `test/index.ts` | Register new test file |

---

## Chunk 1: Tooltip generalization + nodeActionPreview utility

### Task 1: Generalize `TooltipContent` type and tooltip internals

**Files:**
- Modify: `src/lib/tooltip.ts`

- [ ] **Step 1: Replace types and store shape**

Replace the `TooltipContent` type (lines 4-6), `TooltipState` type (lines 12-19), and initial store value (lines 26-33):

```ts
// Replace lines 4-6
export type TooltipSection =
    | { type: "text"; value: string }
    | { type: "crystal-cost"; value: string; refund: boolean }
    | { type: "level-preview"; from: number; to: number };

export type TooltipContent = string | TooltipSection[];

// Replace lines 8-10 (TooltipParam stays the same shape)
export type TooltipParam =
    | TooltipContent
    | { content: TooltipContent; hoverOnly?: boolean };

// Replace lines 12-19
type TooltipState = {
    isOpen: boolean;
    sections: TooltipSection[];
    x: number;
    y: number;
};

// Replace lines 26-33
export const tooltipStore = writable<TooltipState>({
    isOpen: false,
    sections: [],
    x: 0,
    y: 0,
});
```

- [ ] **Step 2: Update `showTooltip`, `updateTooltipText`, `hideTooltip`**

Replace `showTooltip` (lines 38-54) — takes `sections` instead of `text`/`costLine`/`costLineRefund`:

```ts
function showTooltip(
    owner: HTMLElement,
    sections: TooltipSection[],
    point: Point,
) {
    currentOwner = owner;
    tooltipStore.set({
        isOpen: true,
        sections,
        x: point.x,
        y: point.y,
    });
}
```

Replace `updateTooltipText` (lines 56-66):

```ts
function updateTooltipText(
    owner: HTMLElement,
    sections: TooltipSection[],
) {
    if (currentOwner !== owner) return;
    tooltipStore.update((state) =>
        state.isOpen ? { ...state, sections } : state,
    );
}
```

Replace `hideTooltip` (lines 68-79):

```ts
export function hideTooltip(owner?: HTMLElement) {
    if (owner && currentOwner !== owner) return;
    currentOwner = null;
    tooltipStore.set({
        isOpen: false,
        sections: [],
        x: 0,
        y: 0,
    });
}
```

- [ ] **Step 3: Update `normalizeContent` and `parseTooltipParam`**

Replace `normalizeContent` (lines 95-107):

```ts
function normalizeContent(value?: TooltipContent): TooltipSection[] {
    if (value == null) return [];
    if (typeof value === "string") {
        return value === "" ? [] : [{ type: "text", value }];
    }
    return value;
}
```

Replace `parseTooltipParam` (lines 109-121):

```ts
function parseTooltipParam(value?: TooltipParam): {
    sections: TooltipSection[];
    hoverOnly: boolean;
} {
    if (value == null) return { sections: [], hoverOnly: false };
    if (typeof value === "object" && "content" in value) {
        const { content, hoverOnly = false } = value;
        return { sections: normalizeContent(content), hoverOnly };
    }
    return { sections: normalizeContent(value as TooltipContent), hoverOnly: false };
}
```

- [ ] **Step 4: Update the `tooltip` action directive internals**

In the `tooltip` function (line 123 onwards), update the local state and all references:

Replace line 124:
```ts
let { sections, hoverOnly } = parseTooltipParam(value);
```

Replace `hasContent` (line 149):
```ts
const hasContent = () => sections.length > 0;
```

Replace the `showTooltip` calls in `scheduleHover` (line 158) and `schedulePress` (line 171):
```ts
// scheduleHover setTimeout callback
showTooltip(node, sections, lastPoint);

// schedulePress setTimeout callback
showTooltip(node, sections, lastPoint);
```

Replace the `update` method (lines 254-256):
```ts
update(nextValue?: TooltipParam) {
    ({ sections, hoverOnly } = parseTooltipParam(nextValue));
    updateTooltipText(node, sections);
},
```

- [ ] **Step 5: Verify no TypeScript errors**

Run: `npx svelte-check --threshold error 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add src/lib/tooltip.ts
git commit -m "refactor: generalize TooltipContent to structured sections array"
```

---

### Task 2: Update Tooltip.svelte rendering

**Files:**
- Modify: `src/lib/Tooltip.svelte`
- Modify: `src/app.css`

- [ ] **Step 1: Replace template rendering**

Replace the tooltip content block (lines 156-177 of Tooltip.svelte) with:

```svelte
{#each $tooltipStore.sections as section}
    {#if section.type === "text"}
        <div class="tooltip-line">{section.value}</div>
    {:else if section.type === "crystal-cost"}
        <div
            class="tooltip-cost-line"
            class:refund={section.refund}
        >
            <TechCrystalIcon
                size={14}
                weight="fill"
                class="tooltip-cost-icon"
            />
            <span class="tooltip-cost-value"
                >{section.refund
                    ? "+"
                    : "-"}{section.value}</span
            >
        </div>
    {:else if section.type === "level-preview"}
        <div class="tooltip-level-line">
            Lv. {section.from} → {section.to}
        </div>
    {/if}
{/each}
```

- [ ] **Step 2: Add `tooltip-level-line` CSS in app.css**

Add after the `.tooltip-cost-line.refund .tooltip-cost-value` rule (after line 204 in `src/app.css`):

```css
.tooltip-level-line {
    display: block;
    color: var(--text-muted);
    font-size: inherit;
    margin-top: var(--spacing-xs, 4px);
}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx svelte-check --threshold error 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/lib/Tooltip.svelte src/app.css
git commit -m "refactor: render tooltip sections array, add level-preview style"
```

---

### Task 3: Create `getNodeActionPreview` utility

**Files:**
- Create: `src/lib/nodeActionPreview.ts`

- [ ] **Step 1: Create the utility file**

```ts
import type { LevelsByIndex, Node, NodeIndex } from "../types/tree";
import { NodePrimaryAction } from "./nodePrimaryActionStore";
import { NodeLevelBehavior } from "./nodeLevelBehaviorStore";
import {
    applyLevelChange,
    nextTierTargetLevel,
    previousTierTargetLevel,
} from "./tierLeveling";
import { getCostRange } from "../config/skillMetadata";

export type NodeActionPreview = {
    targetLevel: number;
    totalCost: number;
    isRefund: boolean;
};

export function getNodeActionPreview(params: {
    nodes: Node[];
    levels: LevelsByIndex;
    index: NodeIndex;
    action: NodePrimaryAction;
    nodeLevelBehavior: NodeLevelBehavior;
    isRefund: boolean;
}): NodeActionPreview | null {
    const { nodes, levels, index, action, nodeLevelBehavior, isRefund } = params;
    const node = nodes[index];
    if (!node) return null;

    const currentLevel = levels[index] ?? 0;
    const maxLevel = node.maxLevel;

    let targetLevel: number;

    if (isRefund) {
        if (currentLevel <= 0) return null;
        if (action === NodePrimaryAction.IncrementOne) {
            targetLevel = Math.max(0, currentLevel - 1);
        } else if (action === NodePrimaryAction.IncrementTen) {
            targetLevel = Math.max(0, currentLevel - 10);
        } else {
            targetLevel = previousTierTargetLevel(currentLevel, maxLevel);
        }
    } else {
        if (currentLevel >= maxLevel) return null;
        if (action === NodePrimaryAction.IncrementOne) {
            targetLevel = Math.min(currentLevel + 1, maxLevel);
        } else if (action === NodePrimaryAction.IncrementTen) {
            targetLevel = Math.min(currentLevel + 10, maxLevel);
        } else {
            targetLevel = nextTierTargetLevel(currentLevel, maxLevel);
        }
    }

    if (targetLevel === currentLevel) return null;

    const { deltas } = applyLevelChange({
        nodes,
        levels,
        index,
        targetLevel,
        nodeLevelBehavior,
    });

    if (deltas.length === 0) return null;

    let totalCost = 0;
    for (const delta of deltas) {
        const deltaNode = nodes[delta.index];
        if (!deltaNode?.skillId) continue;
        const fromLevel = levels[delta.index] ?? 0;
        const toLevel = fromLevel + delta.delta;
        totalCost += getCostRange(
            deltaNode.skillId,
            Math.min(fromLevel, toLevel),
            Math.max(fromLevel, toLevel),
        );
    }

    return { targetLevel, totalCost, isRefund };
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx svelte-check --threshold error 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/lib/nodeActionPreview.ts
git commit -m "feat: add getNodeActionPreview utility for tooltip preview"
```

---

### Task 4: Write tests for `getNodeActionPreview`

**Files:**
- Create: `test/nodeActionPreview.test.ts`
- Modify: `test/index.ts`

- [ ] **Step 1: Write the test file**

Tests run at module scope (the test runner uses `await import()`, not function calls).

```ts
import assert from "node:assert/strict";
import { getNodeActionPreview } from "../src/lib/nodeActionPreview.ts";
import { NodePrimaryAction } from "../src/lib/nodePrimaryActionStore.ts";
import { NodeLevelBehavior } from "../src/lib/nodeLevelBehaviorStore.ts";
import { getCostRange } from "../src/config/skillMetadata.ts";
import type { LevelsByIndex, Node } from "../src/types/tree.ts";
import { createYellowBranchFixture, YELLOW_BRANCH_LENGTH } from "./tierLeveling.shared.ts";

function createLevels(length: number, fill = 0): LevelsByIndex {
    return new Array(length).fill(fill);
}

console.log("  nodeActionPreview");

// --- Basic increment with exact cost verification ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementOne,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });
    assert.ok(result, "IncrementOne at level 0 should return a preview");
    assert.equal(result.targetLevel, 1, "targetLevel should be 1");
    assert.equal(result.isRefund, false);
    // Verify exact cost matches getCostRange for the node's skillId
    const expectedCost = getCostRange(nodes[0]!.skillId, 0, 1);
    assert.equal(result.totalCost, expectedCost, `totalCost should be ${expectedCost}`);
    console.log("    ✓ IncrementOne at level 0 returns preview with targetLevel 1 and correct cost");
}

// --- Increment at maxLevel returns null ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = nodes[0]!.maxLevel;
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementOne,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });
    assert.equal(result, null, "IncrementOne at maxLevel should return null");
    console.log("    ✓ IncrementOne at maxLevel returns null");
}

// --- Refund at level 0 returns null ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementOne,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: true,
    });
    assert.equal(result, null, "Refund at level 0 should return null");
    console.log("    ✓ Refund at level 0 returns null");
}

// --- Out-of-bounds index returns null ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 999,
        action: NodePrimaryAction.IncrementOne,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });
    assert.equal(result, null, "Out-of-bounds index should return null");
    console.log("    ✓ Out-of-bounds index returns null");
}

// --- IncrementTen clamps to maxLevel ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 95;
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementTen,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });
    assert.ok(result, "IncrementTen near maxLevel should return a preview");
    assert.equal(result.targetLevel, nodes[0]!.maxLevel, "should clamp to maxLevel");
    console.log("    ✓ IncrementTen clamps to maxLevel");
}

// --- IncrementTier target level ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementTier,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });
    assert.ok(result, "IncrementTier at level 0 should return a preview");
    // Tier 1 upper for maxLevel 100 = 20
    assert.equal(result.targetLevel, 20, "should target tier 1 upper (20)");
    console.log("    ✓ IncrementTier targets tier upper");
}

// --- IncrementTier refund at level 50 ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 50;
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementTier,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: true,
    });
    assert.ok(result, "IncrementTier refund at level 50 should return a preview");
    // previousTierTargetLevel(50, 100) → tier 2 → tierUpper(1, 100) = 20
    assert.equal(result.targetLevel, 20, "should target previous tier upper (20)");
    assert.equal(result.isRefund, true);
    console.log("    ✓ IncrementTier refund targets previous tier upper");
}

// --- Sync mode: totalCost includes ancestor costs ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);

    // In the yellow branch, nodes have a chain: 0 -> 1 -> 2 -> ...
    // Leveling node at index 2 should propagate to ancestors 0 and 1
    const soloResult = getNodeActionPreview({
        nodes,
        levels,
        index: 2,
        action: NodePrimaryAction.IncrementTier,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });

    const syncResult = getNodeActionPreview({
        nodes,
        levels,
        index: 2,
        action: NodePrimaryAction.IncrementTier,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
        isRefund: false,
    });

    assert.ok(soloResult, "Solo result should exist");
    assert.ok(syncResult, "Sync result should exist");
    assert.ok(
        syncResult.totalCost > soloResult.totalCost,
        `Sync totalCost (${syncResult.totalCost}) should be > Solo totalCost (${soloResult.totalCost})`,
    );
    console.log("    ✓ Sync mode totalCost includes propagated ancestor costs");
}

// --- Solo mode: totalCost equals single-node cost ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementOne,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });
    assert.ok(result, "Solo IncrementOne should return a preview");
    assert.ok(result.totalCost > 0, "totalCost should be positive");
    console.log("    ✓ Solo mode totalCost is single-node cost");
}

// --- Refund with IncrementTen ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 25;
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementTen,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: true,
    });
    assert.ok(result, "Refund IncrementTen at level 25 should return a preview");
    assert.equal(result.targetLevel, 15, "should target level 15");
    assert.equal(result.isRefund, true);
    console.log("    ✓ Refund IncrementTen computes correct target level");
}

// --- maxLevel 1 node (final_damage_boost-like) ---
{
    const nodes: Node[] = [
        { skillId: "final_damage_boost", maxLevel: 1, radius: 0.8, x: 0, y: 0 },
    ];
    const levels = createLevels(1);

    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementTier,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });
    assert.ok(result, "IncrementTier on maxLevel=1 node should return a preview");
    assert.equal(result.targetLevel, 1, "should target level 1");

    const refundResult = getNodeActionPreview({
        nodes,
        levels: [1],
        index: 0,
        action: NodePrimaryAction.IncrementTier,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: true,
    });
    assert.ok(refundResult, "Refund on maxLevel=1 node at level 1 should return a preview");
    assert.equal(refundResult.targetLevel, 0, "should target level 0");

    console.log("    ✓ maxLevel=1 nodes work with all action types");
}

console.log("  ✓ nodeActionPreview\n");
```

- [ ] **Step 2: Register in test/index.ts**

Add `"nodeActionPreview.test.ts"` to the `TEST_FILES` array after `"tierTargetLevelFns.test.ts"` (line 21), in the "2. Core State & Logic" section:

```ts
    "tierTargetLevelFns.test.ts",
    "nodeActionPreview.test.ts",
```

- [ ] **Step 3: Run tests**

Run: `npm test 2>&1 | tail -20`

Expected: All tests pass, including the new `nodeActionPreview` tests.

- [ ] **Step 4: Commit**

```bash
git add test/nodeActionPreview.test.ts test/index.ts
git commit -m "test: add unit tests for getNodeActionPreview"
```

---

## Chunk 2: Integration (Tree context, Node.svelte, cleanup)

### Task 5: Add tree context in Tree.svelte

**Files:**
- Modify: `src/lib/Tree.svelte`

- [ ] **Step 1: Add context imports and setup**

Add `setContext` to the existing `svelte` import on line 12 (which already imports `onMount, tick`):

```ts
import { onMount, tick, setContext } from "svelte";
```

Add `writable` to the existing `svelte/store` import if not present (check first — if there is no `svelte/store` import, add one):

```ts
import { writable } from "svelte/store";
```

After line 77 (`let levels: LevelsByIndex = [];`), add:

```ts
const treeData = writable({ nodes, levels });
setContext("tree", treeData);
```

- [ ] **Step 2: Update treeData store on all three `levels =` assignment sites**

There are exactly three places where `levels` is reassigned. After each one, add `treeData.set({ nodes, levels });`:

**Site 1 — `updateLevels` function (line 186):**
```ts
function updateLevels(nextLevels: LevelsByIndex) {
    levels = nextLevels;
    treeData.set({ nodes, levels });
    onLevelsChange?.(nextLevels);
}
```

**Site 2 — reactive block, `levelsById` branch (line 193):**
```ts
$: if (levelsById) {
    const next: LevelsByIndex = nodes.map((_, i) => levelsById[i] ?? 0);
    levels = next;
    treeData.set({ nodes, levels });
} else {
```

**Site 3 — reactive block, pad/clamp branch (line 201):**
```ts
        if (
            next.length !== levels.length ||
            next.some((v, i) => v !== levels[i])
        ) {
            levels = next;
            treeData.set({ nodes, levels });
        }
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx svelte-check --threshold error 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/lib/Tree.svelte
git commit -m "feat: provide tree data via Svelte context for node components"
```

---

### Task 6: Update Node.svelte to use action preview

**Files:**
- Modify: `src/lib/Node.svelte`

- [ ] **Step 1: Update imports**

Replace the `nodePrimaryActionStore` import (lines 14-18):

```ts
import {
    nodePrimaryAction,
    shiftKeyHeld,
} from "./nodePrimaryActionStore";
```

(Remove `getPrimaryActionCost` from the import.)

Add new imports after the existing ones:

```ts
import { getContext } from "svelte";
import type { Writable } from "svelte/store";
import type { Node as NodeType, LevelsByIndex } from "../types/tree";
import { getNodeActionPreview } from "./nodeActionPreview";
import { nodeLevelBehavior } from "./nodeLevelBehaviorStore";
import type { TooltipSection } from "./tooltip";
```

- [ ] **Step 2: Get tree context**

After the `export let` props block (after line 46), add:

```ts
const treeData = getContext<Writable<{ nodes: NodeType[]; levels: LevelsByIndex }>>("tree");
```

- [ ] **Step 3: Replace tooltip computation**

Replace the existing reactive tooltip computation (lines 56-80) with:

```ts
$: isRefund = $shiftKeyHeld;
$: actionPreview = skillId != null
    ? getNodeActionPreview({
          nodes: $treeData.nodes,
          levels: $treeData.levels,
          index: id,
          action: $nodePrimaryAction,
          nodeLevelBehavior: $nodeLevelBehavior,
          isRefund,
      })
    : null;

/** When showSkillName is on, name is on the badge so tooltip omits it. */
$: tooltipLine1 = showSkillName ? "" : label || String(id);
$: tooltipSections = (() => {
    const sections: TooltipSection[] = [];
    if (tooltipLine1) {
        sections.push({ type: "text", value: tooltipLine1 });
    }
    if (
        actionPreview != null &&
        !(state === "locked" && isGlobalIncrementLocked)
    ) {
        sections.push({
            type: "level-preview",
            from: level,
            to: actionPreview.targetLevel,
        });
        sections.push({
            type: "crystal-cost",
            value: formatNumber(actionPreview.totalCost),
            refund: actionPreview.isRefund,
        });
    }
    return sections;
})();

$: tooltipParam =
    tooltipSections.length === 0
        ? undefined
        : { content: tooltipSections, hoverOnly: true };
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `npx svelte-check --threshold error 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/lib/Node.svelte
git commit -m "feat: show level preview and total recursive cost in node tooltip"
```

---

### Task 7: Delete `getPrimaryActionCost` from nodePrimaryActionStore.ts

**Files:**
- Modify: `src/lib/nodePrimaryActionStore.ts`

- [ ] **Step 1: Remove `getPrimaryActionCost` and unused imports**

Delete the `getCostRange` import (line 3) and the `nextTierTargetLevel`/`previousTierTargetLevel` imports (lines 4-7):

```ts
// DELETE these lines:
import { getCostRange } from "../config/skillMetadata";
import {
    nextTierTargetLevel,
    previousTierTargetLevel,
} from "./tierLeveling";
```

Delete the entire `getPrimaryActionCost` function (lines 58-92).

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx svelte-check --threshold error 2>&1 | head -30`

- [ ] **Step 3: Run full test suite**

Run: `npm test 2>&1 | tail -20`

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/nodePrimaryActionStore.ts
git commit -m "refactor: delete getPrimaryActionCost (replaced by nodeActionPreview)"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run svelte-check**

Run: `npx svelte-check --threshold error`

Expected: No errors.

- [ ] **Step 2: Run full test suite**

Run: `npm test`

Expected: All tests pass.

- [ ] **Step 3: Run dev server and manually verify**

Run: `npm run dev`

Verify in browser:
1. Hover a node — tooltip shows skill name (if not shown as badge), level preview ("Lv. 0 → 20"), and crystal cost
2. Hold shift and hover — tooltip shows refund direction ("Lv. 20 → 0") and refund cost with "+" prefix
3. Change primary action to +10 — tooltip updates accordingly
4. Change node level behavior to Solo — tooltip shows single-node cost only
5. Maxed nodes show no cost/level preview
6. Locked nodes with global increment lock show no cost/level preview
7. Non-node tooltips (buttons, tabs, etc.) still work with plain string content
