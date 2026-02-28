# Tier Leveling Test Oracle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current shadow-oracle tier-leveling tests with contract-driven boundary tests and explicit regression scenarios, then update `src/lib/tierLeveling.ts` only if the new tests expose a real behavior mismatch.

**Architecture:** Keep the existing yellow-branch fixture and low-level tier math helpers, but stop deriving expected branch state by replaying `applyLevelChange()` in test code. The new test oracle should be intentionally smaller: explicit boundary cases describe when the stable tier changes, role-based assertions verify ancestor versus wrapped-node behavior, and a short list of hand-authored scenarios preserves broader regression coverage without a second hidden implementation.

**Tech Stack:** TypeScript, `tsx` custom test runner, existing yellow-branch fixture from `src/config/baseTree.ts`

---

### Task 1: Add Role-Only Test Helpers

**Files:**
- Modify: `c:/Programming_Files/Shilocity/rg-backpack-planner/test/tierLeveling.shared.ts`
- Test: `c:/Programming_Files/Shilocity/rg-backpack-planner/test/tierLeveling.test.ts`

**Step 1: Write the failing test**

- In `test/tierLeveling.test.ts`, add a small helper call that does not exist yet:

```ts
const roles = partitionYellowBranchRoles(nodes, 3);
if (!roles.ancestors.has(0) || !roles.ancestors.has(1)) {
    throw new Error("Expected node 3 ancestors to include 0 and 1");
}
if (!roles.wrapped.has(2) || !roles.wrapped.has(9)) {
    throw new Error("Expected wrapped nodes to include non-ancestors in the branch");
}
```

**Step 2: Run test to verify it fails**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: FAIL with a missing symbol error for `partitionYellowBranchRoles`.

**Step 3: Write minimal implementation**

- In `test/tierLeveling.shared.ts`, add and export a helper that only partitions the yellow branch by role, without computing any stable-tier transitions:

```ts
export function partitionYellowBranchRoles(nodes: Node[], targetIndex: number) {
    const ancestors = collectAncestors(nodes, targetIndex);
    const wrapped = new Set<number>();

    nodes.forEach((_, index) => {
        if (index === targetIndex) return;
        if (ancestors.has(index)) return;
        wrapped.add(index);
    });

    return { ancestors, wrapped };
}
```

- Export `expectedTierUpper()` so the test file can use it directly for contract assertions.

**Step 4: Run test to verify it passes**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: PASS for the new role-partition assertion.

**Step 5: Commit**

```bash
git add test/tierLeveling.shared.ts test/tierLeveling.test.ts
git commit -m "test: add role-only tier helper"
```

### Task 2: Replace One Sweep With Boundary Contract Cases

**Files:**
- Modify: `c:/Programming_Files/Shilocity/rg-backpack-planner/test/tierLeveling.test.ts`
- Modify: `c:/Programming_Files/Shilocity/rg-backpack-planner/test/tierLeveling.shared.ts`

**Step 1: Write the failing test**

- Replace the current generated expectation path for one target (start with the tier-3 split node, index `3`) with explicit boundary cases that describe the contract:

```ts
const splitNodeBoundaryCases = [
    { from: 0, to: 1, event: "up", stableTier: 1 },
    { from: 20, to: 21, event: "up", stableTier: 2 },
    { from: 21, to: 20, event: "none", stableTier: 2 },
    { from: 20, to: 19, event: "down", stableTier: 1 },
] as const;
```

- Add an `assertBoundaryContract()` call that does not exist yet.

**Step 2: Run test to verify it fails**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: FAIL because `assertBoundaryContract()` is not implemented.

**Step 3: Write minimal implementation**

- Add `assertBoundaryContract()` in `test/tierLeveling.test.ts`.
- The helper should:
  - call `applyLevelChange()`
  - assert the target level matches `to`
  - when `event === "up"`:
    - ancestors equal `max(previous, assignedUpperBound)`
    - wrapped nodes equal `max(previous, wrappedUpperBound)`
  - when `event === "down"`:
    - ancestors equal `min(previous, assignedUpperBound)`
    - wrapped nodes equal `min(previous, wrappedUpperBound)`
  - when `event === "none"`:
    - all reactive nodes remain unchanged

- Use `partitionYellowBranchRoles()` and `expectedTierUpper()` for role grouping and assigned bounds.

**Step 4: Run test to verify it passes**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: PASS for the explicit split-node boundary cases.

**Step 5: Commit**

```bash
git add test/tierLeveling.test.ts test/tierLeveling.shared.ts
git commit -m "test: add tier boundary contract assertions"
```

### Task 3: Expand Boundary Coverage To Root, Merged, And Final Nodes

**Files:**
- Modify: `c:/Programming_Files/Shilocity/rg-backpack-planner/test/tierLeveling.test.ts`

**Step 1: Write the failing test**

- Add explicit boundary contract tables for:
  - root node `0`
  - merged `50`-cap node `7`
  - final `1`-cap node `9`

- Example root case:

```ts
const rootBoundaryCases = [
    { from: 20, to: 21, event: "up", stableTier: 2 },
    { from: 21, to: 20, event: "none", stableTier: 2 },
    { from: 20, to: 19, event: "down", stableTier: 1 },
] as const;
```

- For the root, assert that every non-target node is treated as wrapped.

**Step 2: Run test to verify it fails**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: Either:
- FAIL because one of the new role-specific assertions exposes a production mismatch, or
- FAIL because the new boundary tables are not wired into the runner correctly.

**Step 3: Write minimal implementation**

- Finish the boundary runner wiring so the same contract helper can evaluate:
  - 100-cap targets
  - 50-cap targets
  - 1-cap targets
- Keep the assertions role-based; do not reintroduce a generated full-state oracle.

**Step 4: Run test to verify it passes**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: PASS for all explicit boundary contract cases that do not expose a real production bug.

**Step 5: Commit**

```bash
git add test/tierLeveling.test.ts
git commit -m "test: cover tier boundary roles across node types"
```

### Task 4: Replace Shadow Scenarios With Explicit Regression Tables

**Files:**
- Modify: `c:/Programming_Files/Shilocity/rg-backpack-planner/test/tierLeveling.test.ts`
- Modify: `c:/Programming_Files/Shilocity/rg-backpack-planner/test/tierLeveling.shared.ts`

**Step 1: Write the failing test**

- Stop using `buildExpectedStateForScenario()` as the primary truth source for scenario tests.
- Replace the first few scenarios with explicit expected arrays written in the test data itself.
- Start with the user-approved cross-branch examples:

```ts
const explicitScenario = {
    name: "split node drops from tier 3 to tier 2",
    operations: [{ index: 3, targetLevel: 21 }],
    expectedStates: [[40, 40, 20, 21, 20, 20, 20, 10, 10, 1]],
};
```

- Add a second multi-step explicit case for decrement hysteresis:

```ts
const explicitHysteresis = {
    name: "split node holds tier on 21 to 20 and drops on 20 to 19",
    operations: [
        { index: 3, targetLevel: 21 },
        { index: 3, targetLevel: 20 },
        { index: 3, targetLevel: 19 },
    ],
    expectedStates: [
        [40, 40, 20, 21, 20, 20, 20, 10, 10, 1],
        [40, 40, 20, 20, 20, 20, 20, 10, 10, 1],
        [20, 20, 0, 19, 0, 0, 0, 0, 0, 0],
    ],
};
```

**Step 2: Run test to verify it fails**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: FAIL if the scenario runner still expects generated states, or FAIL if a real implementation mismatch is exposed.

**Step 3: Write minimal implementation**

- Rewrite `runScenarioCase()` so it consumes `expectedStates` provided by the scenario itself.
- Keep only a small set of explicit scenarios that target:
  - cross-branch interaction
  - merged-node unwind
  - decrement hysteresis
- Remove the current dependency on `buildExpectedStateForScenario()` and `buildSeededScenarioCase()` for primary correctness assertions.

**Step 4: Run test to verify it passes**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: PASS for the explicit scenario cases, unless one now reveals a real production bug.

**Step 5: Commit**

```bash
git add test/tierLeveling.test.ts test/tierLeveling.shared.ts
git commit -m "test: replace tier shadow scenarios with explicit tables"
```

### Task 5: Fix Production Logic If The New Tests Expose A Real Mismatch

**Files:**
- Modify: `c:/Programming_Files/Shilocity/rg-backpack-planner/src/lib/tierLeveling.ts` (only if required)
- Test: `c:/Programming_Files/Shilocity/rg-backpack-planner/test/tierLeveling.test.ts`

**Step 1: Write the failing test**

- Use the first real red case from Tasks 2 through 4 as the reproduction.
- Do not weaken the new contract test or the explicit scenario data.

**Step 2: Run test to verify it fails**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: FAIL with one specific contract or explicit-state mismatch that names the case and node index.

**Step 3: Write minimal implementation**

- Update `applyLevelChange()` in `src/lib/tierLeveling.ts` only enough to satisfy the failing behavior.
- Preserve these rules:
  - target level is exact
  - upward reactive changes use `max()`
  - downward reactive changes use `min()`
  - ancestors use the stable tier
  - wrapped nodes use `stable tier - 1`
  - `21 -> 20` does not drop the stable tier
  - `20 -> 19` does

**Step 4: Run test to verify it passes**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: PASS for the formerly failing case and all retained tier-leveling tests.

**Step 5: Commit**

```bash
git add src/lib/tierLeveling.ts test/tierLeveling.test.ts
git commit -m "fix: align tier leveling with contract tests"
```

### Task 6: Update Test Documentation And Run Full Verification

**Files:**
- Modify: `c:/Programming_Files/Shilocity/rg-backpack-planner/test/README.md`
- Verify: `c:/Programming_Files/Shilocity/rg-backpack-planner/test/tierLeveling.test.ts`
- Verify: `c:/Programming_Files/Shilocity/rg-backpack-planner/src/lib/tierLeveling.ts`

**Step 1: Write the failing test**

- Not applicable. Use the completed tier suite and repo test command as the verification target.

**Step 2: Run test to verify it fails**

- Not applicable.

**Step 3: Write minimal implementation**

- Update `test/README.md` to describe:
  - the boundary contract layer
  - the smaller explicit scenario layer
  - why the old shadow-oracle approach was removed

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: `npm run check` succeeds, `test/index.ts` completes, and the tier suite still passes with the new contract-first assertions.

**Step 5: Commit**

```bash
git add test/README.md
git commit -m "docs: update tier testing strategy"
```
