# Unify Cost/Refund Calculation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract shared `sumDeltaCosts` and `computeTotalCost` functions so all three cost-displaying surfaces (tooltip, context menu, splash) use the same Sync-aware cost calculation.

**Architecture:** Two new exports in `nodeActionPreview.ts`: `sumDeltaCosts` (pure cost summing from deltas) and `computeTotalCost` (calls `applyLevelChange` + `sumDeltaCosts`). `getNodeActionPreview` and `NodeContentMenu` call `computeTotalCost`. `Tree.svelte` splash calls `sumDeltaCosts` directly since it already has deltas.

**Tech Stack:** Svelte 5, TypeScript, Node.js test runner

**Spec:** `docs/superpowers/specs/2026-03-12-unify-cost-refund-calculation-design.md`

---

## Chunk 1: Extract shared functions and tests

### Task 1: Add `sumDeltaCosts` and `computeTotalCost` with tests

**Files:**
- Modify: `src/lib/nodeActionPreview.ts`
- Modify: `test/nodeActionPreview.test.ts`

- [ ] **Step 1: Write failing tests for `sumDeltaCosts` and `computeTotalCost`**

Append to `test/nodeActionPreview.test.ts` (before the final success log):

```typescript
import { sumDeltaCosts, computeTotalCost } from "../src/lib/nodeActionPreview.ts";

// --- sumDeltaCosts: empty deltas returns 0 ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const cost = sumDeltaCosts(nodes, levels, []);
    assert.equal(cost, 0, "empty deltas should return 0");
    console.log("    ✓ sumDeltaCosts returns 0 for empty deltas");
}

// --- sumDeltaCosts: returns unsigned cost for positive deltas ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const deltas = [{ index: 0, delta: 1 }];
    const cost = sumDeltaCosts(nodes, levels, deltas);
    const expected = getCostRange(nodes[0]!.skillId, 0, 1);
    assert.equal(cost, expected, "sumDeltaCosts should return single-node cost");
    assert.ok(cost > 0, "cost should be positive");
    console.log("    ✓ sumDeltaCosts returns correct single-node cost");
}

// --- sumDeltaCosts: returns unsigned cost for negative deltas (refund) ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 10;
    const deltas = [{ index: 0, delta: -5 }];
    const cost = sumDeltaCosts(nodes, levels, deltas);
    const expected = getCostRange(nodes[0]!.skillId, 5, 10);
    assert.equal(cost, expected, "sumDeltaCosts should return unsigned cost for refund");
    assert.ok(cost > 0, "refund cost should still be positive (unsigned)");
    console.log("    ✓ sumDeltaCosts returns unsigned cost for negative deltas");
}

// --- sumDeltaCosts: sums across multiple deltas ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const deltas = [{ index: 0, delta: 20 }, { index: 1, delta: 20 }];
    const cost = sumDeltaCosts(nodes, levels, deltas);
    const expected =
        getCostRange(nodes[0]!.skillId, 0, 20) +
        getCostRange(nodes[1]!.skillId, 0, 20);
    assert.equal(cost, expected, "sumDeltaCosts should sum costs across all deltas");
    console.log("    ✓ sumDeltaCosts sums across multiple deltas");
}

// --- sumDeltaCosts: skips nodes without skillId ---
{
    const nodes = [
        { skillId: undefined, maxLevel: 100, radius: 1, x: 0, y: 0 },
    ] as unknown as Node[];
    const levels = createLevels(1);
    const deltas = [{ index: 0, delta: 10 }];
    const cost = sumDeltaCosts(nodes, levels, deltas);
    assert.equal(cost, 0, "should return 0 for nodes without skillId");
    console.log("    ✓ sumDeltaCosts skips nodes without skillId");
}

// --- computeTotalCost: matches getNodeActionPreview for Solo ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = computeTotalCost({
        nodes,
        levels,
        index: 0,
        targetLevel: 20,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    const expected = getCostRange(nodes[0]!.skillId, 0, 20);
    assert.equal(result.totalCost, expected, "computeTotalCost Solo should match single-node cost");
    assert.equal(result.deltas.length, 1, "Solo should produce 1 delta");
    console.log("    ✓ computeTotalCost Solo matches single-node cost");
}

// --- computeTotalCost: Sync includes ancestor costs ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const solo = computeTotalCost({
        nodes,
        levels,
        index: 2,
        targetLevel: 20,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    const sync = computeTotalCost({
        nodes,
        levels,
        index: 2,
        targetLevel: 20,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    });
    assert.ok(
        sync.totalCost > solo.totalCost,
        `Sync cost (${sync.totalCost}) should exceed Solo cost (${solo.totalCost})`,
    );
    assert.ok(sync.deltas.length > 1, "Sync should produce multiple deltas");
    console.log("    ✓ computeTotalCost Sync includes ancestor costs");
}

// --- computeTotalCost: no-op returns empty deltas and zero cost ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 20;
    const result = computeTotalCost({
        nodes,
        levels,
        index: 0,
        targetLevel: 20,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    assert.equal(result.totalCost, 0, "no-op should return 0 cost");
    assert.equal(result.deltas.length, 0, "no-op should return empty deltas");
    console.log("    ✓ computeTotalCost no-op returns zero cost and empty deltas");
}

// --- computeTotalCost: refund returns unsigned (positive) cost ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 20;
    const result = computeTotalCost({
        nodes,
        levels,
        index: 0,
        targetLevel: 10,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    const expected = getCostRange(nodes[0]!.skillId, 10, 20);
    assert.equal(result.totalCost, expected, "refund computeTotalCost should return unsigned cost");
    assert.ok(result.totalCost > 0, "refund cost should be positive (unsigned)");
    console.log("    ✓ computeTotalCost refund returns unsigned cost");
}
```

Also add to the imports at the top of the file:

```typescript
import { sumDeltaCosts, computeTotalCost } from "../src/lib/nodeActionPreview.ts";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `sumDeltaCosts` and `computeTotalCost` are not exported from `nodeActionPreview.ts`.

- [ ] **Step 3: Implement `sumDeltaCosts` and `computeTotalCost`**

Add to `src/lib/nodeActionPreview.ts`, before `getNodeActionPreview`:

```typescript
export function sumDeltaCosts(
    nodes: Node[],
    levels: LevelsByIndex,
    deltas: LevelDelta[],
): number {
    let total = 0;
    for (const delta of deltas) {
        const node = nodes[delta.index];
        if (!node?.skillId) continue;
        const fromLevel = levels[delta.index] ?? 0;
        const toLevel = fromLevel + delta.delta;
        total += getCostRange(
            node.skillId,
            Math.min(fromLevel, toLevel),
            Math.max(fromLevel, toLevel),
        );
    }
    return total;
}

export function computeTotalCost(params: {
    nodes: Node[];
    levels: LevelsByIndex;
    index: NodeIndex;
    targetLevel: number;
    nodeLevelBehavior: NodeLevelBehavior;
}): { totalCost: number; deltas: LevelDelta[] } {
    const { nodes, levels, index, targetLevel, nodeLevelBehavior } = params;
    const { deltas } = applyLevelChange({
        nodes,
        levels,
        index,
        targetLevel,
        nodeLevelBehavior,
    });
    const totalCost = sumDeltaCosts(nodes, levels, deltas);
    return { totalCost, deltas };
}
```

Also add the `LevelDelta` import at the top:

```typescript
import {
    applyLevelChange,
    nextTierTargetLevel,
    previousTierTargetLevel,
} from "./tierLeveling";
```

Change to:

```typescript
import type { LevelDelta } from "./tierLeveling";
import {
    applyLevelChange,
    nextTierTargetLevel,
    previousTierTargetLevel,
} from "./tierLeveling";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS including the new `sumDeltaCosts` and `computeTotalCost` tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nodeActionPreview.ts test/nodeActionPreview.test.ts
git commit -m "feat: add sumDeltaCosts and computeTotalCost shared functions"
```

### Task 2: Refactor `getNodeActionPreview` to use `computeTotalCost`

**Files:**
- Modify: `src/lib/nodeActionPreview.ts`

- [ ] **Step 1: Replace inline delta-summing loop with `computeTotalCost`**

In `src/lib/nodeActionPreview.ts`, replace lines 56-79 (from `const { deltas }` through `return { targetLevel, totalCost, isRefund };`):

```typescript
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
```

With:

```typescript
    const { totalCost, deltas } = computeTotalCost({
        nodes,
        levels,
        index,
        targetLevel,
        nodeLevelBehavior,
    });

    if (deltas.length === 0) return null;

    return { targetLevel, totalCost, isRefund };
```

Then remove the `getCostRange` import since it is now only used inside `sumDeltaCosts`:

Check if `getCostRange` is still imported elsewhere in the file — it is only used in `sumDeltaCosts`, so keep the import (it's still needed by `sumDeltaCosts` in the same file).

- [ ] **Step 2: Run tests to verify no regression**

Run: `npm test`
Expected: All tests PASS — behavior is identical, just refactored.

- [ ] **Step 3: Commit**

```bash
git add src/lib/nodeActionPreview.ts
git commit -m "refactor: use computeTotalCost inside getNodeActionPreview"
```

## Chunk 2: Update consumers

### Task 3: Update `NodeContentMenu.svelte` to use `computeTotalCost`

**Files:**
- Modify: `src/lib/NodeContentMenu.svelte`
- Modify: `test/nodeContentMenuTierAction.test.ts`

- [ ] **Step 1: Add tree context and `nodeLevelBehavior` imports to `NodeContentMenu.svelte`**

In `src/lib/NodeContentMenu.svelte`, add new imports:

```typescript
import { getContext } from "svelte";
import type { Writable } from "svelte/store";
import { computeTotalCost } from "./nodeActionPreview";
import { nodeLevelBehavior } from "./nodeLevelBehaviorStore";
```

Modify the existing `"../types/tree"` import (line 16) to add `LevelsByIndex`:

```typescript
import type { Node, NodeIndex, SkillId } from "../types/tree";
```

Change to:

```typescript
import type { Node, NodeIndex, SkillId, LevelsByIndex } from "../types/tree";
```

Add the context retrieval after the last `export let` prop (after line 35 `export let skillId`):

```typescript
const treeData = getContext<Writable<{ nodes: Node[]; levels: LevelsByIndex }>>("tree");
```

- [ ] **Step 2: Replace `getCostRange` calls in `actionCosts` reactive block**

Replace the entire `$: actionCosts` reactive block (lines 55-77):

```typescript
    $: actionCosts = (() => {
        if (!skillId) return null;
        const canUp = level < maxLevel;
        const canDown = level > 0;
        return {
            increment1: canUp
                ? getCostRange(skillId, level, Math.min(level + 1, maxLevel))
                : null,
            increment10: canUp
                ? getCostRange(skillId, level, Math.min(level + 10, maxLevel))
                : null,
            incrementTier: canUp
                ? getCostRange(skillId, level, tierTargetLevel)
                : null,
            decrement1: canDown
                ? getCostRange(skillId, Math.max(level - 1, 0), level)
                : null,
            decrement10: canDown
                ? getCostRange(skillId, Math.max(level - 10, 0), level)
                : null,
            reset: canDown ? getCostRange(skillId, 0, level) : null,
        };
    })();
```

With:

```typescript
    $: actionCosts = (() => {
        if (!skillId || nodeIndex === null) return null;
        const { nodes, levels } = $treeData;
        const behavior = $nodeLevelBehavior;
        const canUp = level < maxLevel;
        const canDown = level > 0;
        return {
            increment1: canUp
                ? computeTotalCost({ nodes, levels, index: nodeIndex, targetLevel: Math.min(level + 1, maxLevel), nodeLevelBehavior: behavior }).totalCost
                : null,
            increment10: canUp
                ? computeTotalCost({ nodes, levels, index: nodeIndex, targetLevel: Math.min(level + 10, maxLevel), nodeLevelBehavior: behavior }).totalCost
                : null,
            incrementTier: canUp
                ? computeTotalCost({ nodes, levels, index: nodeIndex, targetLevel: tierTargetLevel, nodeLevelBehavior: behavior }).totalCost
                : null,
            decrement1: canDown
                ? computeTotalCost({ nodes, levels, index: nodeIndex, targetLevel: Math.max(level - 1, 0), nodeLevelBehavior: behavior }).totalCost
                : null,
            decrement10: canDown
                ? computeTotalCost({ nodes, levels, index: nodeIndex, targetLevel: Math.max(level - 10, 0), nodeLevelBehavior: behavior }).totalCost
                : null,
            reset: canDown
                ? computeTotalCost({ nodes, levels, index: nodeIndex, targetLevel: 0, nodeLevelBehavior: behavior }).totalCost
                : null,
        };
    })();
```

- [ ] **Step 3: Remove the `getCostRange` import**

In the imports, change:

```typescript
import { getSkillLevelInfo, getCostRange } from "../config/skillMetadata";
```

To:

```typescript
import { getSkillLevelInfo } from "../config/skillMetadata";
```

- [ ] **Step 4: Update `test/nodeContentMenuTierAction.test.ts` line 14**

Replace the regex assertion that matches the old `getCostRange` call pattern:

```typescript
if (!/incrementTier: canUp \? getCostRange\(skillId, level, tierTargetLevel\) : null,/.test(nodeMenuNormalized)) {
    throw new Error(
        "NodeContentMenu should compute tier action cost to the tier target level.",
    );
}
```

With a regex that matches the new `computeTotalCost` call pattern:

```typescript
if (!/incrementTier: canUp \? computeTotalCost\(/.test(nodeMenuNormalized)) {
    throw new Error(
        "NodeContentMenu should compute tier action cost via computeTotalCost.",
    );
}
```

- [ ] **Step 5: Run tests to verify**

Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/NodeContentMenu.svelte test/nodeContentMenuTierAction.test.ts
git commit -m "feat: NodeContentMenu uses computeTotalCost for Sync-aware costs"
```

### Task 4: Update `Tree.svelte` `applyChange` splash to use `sumDeltaCosts`

**Files:**
- Modify: `src/lib/Tree.svelte`

- [ ] **Step 1: Add `sumDeltaCosts` import**

In `src/lib/Tree.svelte`, add to the imports:

```typescript
import { sumDeltaCosts } from "./nodeActionPreview";
```

- [ ] **Step 2: Replace inline cost computation in `applyChange`**

**Invariant**: Within a single `applyLevelChange` call, all deltas share the same sign direction (increments produce all-positive deltas, decrements produce all-negative). This is why applying sign via `targetLevel > currentLevel` is safe — see spec's "Key invariant" section.

Replace lines 527-535 (the splash cost loop inside `applyChange`):

```typescript
                let totalCrystalDelta = 0;
                for (const d of deltas) {
                    const node = getNodeAt(d.index);
                    if (node?.skillId) {
                        const prevInfo = getSkillLevelInfo(node.skillId, getLevelFrom(prevLevels, d.index), node.maxLevel);
                        const nextInfo = getSkillLevelInfo(node.skillId, getLevelFrom(nextLevels, d.index), node.maxLevel);
                        totalCrystalDelta += nextInfo.totalCostSpent - prevInfo.totalCostSpent;
                    }
                }
```

With:

```typescript
                const totalCrystalDelta = targetLevel > currentLevel
                    ? sumDeltaCosts(nodes, prevLevels, deltas)
                    : -sumDeltaCosts(nodes, prevLevels, deltas);
```

- [ ] **Step 3: Run tests to verify**

Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/Tree.svelte
git commit -m "refactor: Tree applyChange splash uses sumDeltaCosts"
```

### Task 5: Update `Tree.svelte` `resetAllNodes` splash to use `sumDeltaCosts`

**Files:**
- Modify: `src/lib/Tree.svelte`

- [ ] **Step 1: Replace inline cost computation in `resetAllNodes`**

Replace lines 632-643 (inside `resetAllNodes`, the splash cost loop):

```typescript
            let totalCrystalDelta = 0;
            let hadLevels = false;
            for (let i = 0; i < nodes.length; i++) {
                const prev = prevLevels[i] ?? 0;
                if (prev === 0) continue;
                hadLevels = true;
                const node = nodes[i];
                if (node?.skillId) {
                    const info = getSkillLevelInfo(node.skillId, prev, node.maxLevel);
                    totalCrystalDelta -= info.totalCostSpent;
                }
            }
            if (hadLevels) {
```

With:

```typescript
            const resetDeltas = [];
            for (let i = 0; i < nodes.length; i++) {
                const prev = prevLevels[i] ?? 0;
                if (prev > 0) resetDeltas.push({ index: i, delta: -prev });
            }
            const hadLevels = resetDeltas.length > 0;
            const totalCrystalDelta = hadLevels
                ? -sumDeltaCosts(nodes, prevLevels, resetDeltas)
                : 0;
            if (hadLevels) {
```

- [ ] **Step 2: Remove `getSkillLevelInfo` import from Tree.svelte**

Since `getSkillLevelInfo` is no longer used in Tree.svelte (both usage sites have been replaced), remove the import:

```typescript
import { getSkillLevelInfo } from "../config/skillMetadata";
```

- [ ] **Step 3: Run tests to verify**

Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/Tree.svelte
git commit -m "refactor: Tree resetAllNodes splash uses sumDeltaCosts"
```

### Task 6: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: No type errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit any remaining fixes if needed**
