# Tier Leveling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add direction-aware tier propagation to `applyLevelChange` and cover it with exhaustive yellow-branch sequence tests that validate every node's level and tier.

**Architecture:** Reintroduce the tier-leveling test suite with a yellow-branch fixture, ordered threshold sequences, and full-branch assertions. Then implement the minimal propagation logic in `src/lib/tierLeveling.ts`, using existing tier helpers plus branch traversal for ancestors, descendants, and wrapped nodes.

**Tech Stack:** TypeScript, custom `tsx` test harness, Svelte project utilities

---

### Task 1: Reintroduce The Tier-Leveling Test Harness

**Files:**
- Modify: `test/index.ts`
- Modify: `test/tierLevelig.test.ts`

**Step 1: Write the failing test**

- Replace the placeholder in `test/tierLevelig.test.ts` with:
  - a yellow-branch fixture helper based on `src/config/baseTree.ts`
  - a whole-branch assertion helper for levels and tiers
  - the first root-node round-trip sequence covering `0 -> 21 -> 20 -> 19`
- Import `test/tierLevelig.test.ts` from `test/index.ts`.

**Step 2: Run test to verify it fails**

Run: `npx tsx test/index.ts`
Expected: tier-leveling assertions fail because `applyLevelChange` still only updates the target node.

**Step 3: Write minimal implementation**

- Do not change production code in this task.

**Step 4: Run test to verify it passes**

- Not applicable until Task 3.

**Step 5: Commit**

```bash
git add test/index.ts test/tierLevelig.test.ts
git commit -m "test: add initial tier leveling coverage"
```

### Task 2: Expand Red Coverage Across Yellow-Branch Shapes

**Files:**
- Modify: `test/tierLevelig.test.ts`

**Step 1: Write the failing test**

- Add more sequence tests covering:
  - full root round-trip `0 -> 100 -> 0`
  - full second-node round-trip `0 -> 100 -> 0`
  - representative tier-3 split node cases
  - representative tier-4 merged node cases (`maxLevel 50`)
  - representative final-node cases (`maxLevel 1`)
- Keep merged/final expectations explicit rather than algorithmically generated.

**Step 2: Run test to verify it fails**

Run: `npx tsx test/index.ts`
Expected: multiple tier-leveling failures that reflect missing propagation and incorrect clamping.

**Step 3: Write minimal implementation**

- Do not change production code in this task.

**Step 4: Run test to verify it passes**

- Not applicable until Task 3.

**Step 5: Commit**

```bash
git add test/tierLevelig.test.ts
git commit -m "test: expand tier leveling sequence coverage"
```

### Task 3: Implement Minimal Tier Propagation

**Files:**
- Modify: `src/lib/tierLeveling.ts`
- Test: `test/tierLevelig.test.ts`

**Step 1: Write the failing test**

- Use the failing tests from Tasks 1 and 2 as the red state.

**Step 2: Run test to verify it fails**

Run: `npx tsx test/index.ts`
Expected: failures point to unchanged ancestors, descendants, and wrapped nodes.

**Step 3: Write minimal implementation**

- Restore propagation logic in `applyLevelChange`:
  - determine direct parents and children
  - identify the yellow-branch component root and leaf for wrapped traversal
  - calculate current tier and completed-tier boundaries
  - on increment, raise ancestors to the current tier and wrapped nodes to one tier lower
  - on decrement, lower descendants to at most one tier lower using the completed-tier threshold
  - clamp propagated levels to each node's `maxLevel`
- Keep delta tracking accurate for all adjusted nodes.

**Step 4: Run test to verify it passes**

Run: `npx tsx test/index.ts`
Expected: tier-leveling tests pass along with the existing encoder suite.

**Step 5: Commit**

```bash
git add src/lib/tierLeveling.ts test/tierLevelig.test.ts test/index.ts
git commit -m "feat: restore tier-based level propagation"
```

### Task 4: Refine Edge Cases And Verify

**Files:**
- Modify: `test/tierLevelig.test.ts` (if edge-case gaps are found)
- Modify: `src/lib/tierLeveling.ts` (only if required by failing tests)

**Step 1: Write the failing test**

- Add any missing threshold-edge assertions discovered during implementation, especially around `50`-cap nodes and the `1`-cap final node.

**Step 2: Run test to verify it fails**

Run: `npx tsx test/index.ts`
Expected: failure reproduces the missing edge case.

**Step 3: Write minimal implementation**

- Adjust only the logic needed to satisfy the new failing edge case.

**Step 4: Run test to verify it passes**

Run: `npx tsx test/index.ts`
Expected: all tests pass cleanly.

**Step 5: Commit**

```bash
git add src/lib/tierLeveling.ts test/tierLevelig.test.ts
git commit -m "test: cover tier propagation edge cases"
```

### Task 5: Final Verification

**Files:**
- Verify: `src/lib/tierLeveling.ts`
- Verify: `test/tierLevelig.test.ts`
- Verify: `test/index.ts`

**Step 1: Write the failing test**

- Not applicable; use the full suite as verification.

**Step 2: Run test to verify it fails**

- Not applicable.

**Step 3: Write minimal implementation**

- None.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: `svelte-check`, TypeScript, and the custom test suite all pass.

**Step 5: Commit**

```bash
git status --short
```
