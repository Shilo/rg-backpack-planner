# Tier Leveling Simulation Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand `test/tierLeveling.test.ts` with mixed-path scripted simulations and seeded deterministic scenarios that stress decrement behavior inside already leveled paths, while preserving full-branch level and tier verification after every step.

**Architecture:** Keep the existing yellow-branch fixture and whole-branch assertion model, but add a reusable multi-operation scenario runner plus a test-only oracle that computes expected branch state independently of `applyLevelChange`. Build coverage in layers: first scripted regressions for known fragile transitions, then edge-biased seeded simulations, and only modify `src/lib/tierLeveling.ts` if the new tests expose a real propagation defect.

**Tech Stack:** TypeScript, custom `tsx` test harness, Svelte project utilities

---

### Task 1: Add Multi-Operation Scenario Infrastructure

**Files:**
- Modify: `test/tierLeveling.test.ts`

**Step 1: Write the failing test**

- Add a first mixed scenario that references new helpers which do not exist yet:
  - an operation type describing `{ index, targetLevel }`
  - a `runScenarioCase()` helper
  - a `buildExpectedStateForScenario()` or equivalent oracle entry point
- Use a simple two-step example:
  - increment node `1`
  - decrement node `2`

**Step 2: Run test to verify it fails**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: FAIL because the new scenario runner and oracle helpers are not implemented yet.

**Step 3: Write minimal implementation**

- Add only the new test-side infrastructure in `test/tierLeveling.test.ts`:
  - operation types
  - reusable scenario runner
  - shared per-step assertion plumbing
- Do not change `src/lib/tierLeveling.ts` in this task.

**Step 4: Run test to verify it passes**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: PASS for the new helper-backed scenario structure.

**Step 5: Commit**

```bash
git add test/tierLeveling.test.ts
git commit -m "test: add tier leveling scenario runner"
```

### Task 2: Add Independent Oracle Coverage For Mixed Scenarios

**Files:**
- Modify: `test/tierLeveling.test.ts`

**Step 1: Write the failing test**

- Replace any temporary direct expectation shortcuts with a real oracle path that computes expected full-branch state for multi-step scenarios.
- Add a case that exercises an internal decrement in a leveled path, for example:
  - increment node `9`
  - decrement node `8`

**Step 2: Run test to verify it fails**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: FAIL because the new oracle path is incomplete or because the mixed-path expectation does not yet match actual behavior.

**Step 3: Write minimal implementation**

- Implement the test-only oracle in `test/tierLeveling.test.ts` so it:
  - tracks prior branch state
  - applies the new target level
  - resolves direction-aware hysteresis
  - enforces ancestor/wrapped/decrement constraints across the branch
  - clamps each node to its own `maxLevel`
- Keep the oracle separate from `applyLevelChange`.

**Step 4: Run test to verify it passes**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: PASS for the new internal-decrement scenario and existing round-trip tests.

**Step 5: Commit**

```bash
git add test/tierLeveling.test.ts
git commit -m "test: add tier leveling oracle coverage"
```

### Task 3: Add Scripted Mixed-Path Regression Scenarios

**Files:**
- Modify: `test/tierLeveling.test.ts`

**Step 1: Write the failing test**

- Add a batch of explicit scripted scenarios that cover:
  - sibling interaction after an increment
  - merged-node backtracking
  - partial increments followed by internal decrements
  - alternating left/right path operations before shared merges
- Include the user-provided examples as seeds for the scripted list, adapted to exact target levels rather than vague "increment/decrement" wording.

**Step 2: Run test to verify it fails**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: Either:
- FAIL with a new assertion if a hidden propagation bug is exposed, or
- PASS immediately, proving the scripted coverage is compatible with the current implementation.

**Step 3: Write minimal implementation**

- If Step 2 fails because the new scenario data is incomplete, finish the scripted scenario definitions and expected-value plumbing in `test/tierLeveling.test.ts`.
- If Step 2 fails because of a real propagation mismatch, do not weaken the tests; leave the red case for Task 5.

**Step 4: Run test to verify it passes**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: PASS for all scripted scenarios that do not expose a production bug.

**Step 5: Commit**

```bash
git add test/tierLeveling.test.ts
git commit -m "test: add scripted tier leveling regressions"
```

### Task 4: Add Seeded Deterministic Simulation Scenarios

**Files:**
- Modify: `test/tierLeveling.test.ts`

**Step 1: Write the failing test**

- Add a seeded scenario generator and reference it from new test cases using fixed seeds.
- The generator should bias toward:
  - node indices `0`, `1`, `2`, `3`, `5`, `6`, `7`, `8`, `9`
  - threshold-adjacent levels for `100`-cap, `50`-cap, and `1`-cap nodes
  - repeated increment/decrement inside the same connected path

**Step 2: Run test to verify it fails**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: FAIL because the seeded generator or seed-driven scenario cases are not implemented yet.

**Step 3: Write minimal implementation**

- Implement in `test/tierLeveling.test.ts`:
  - a tiny deterministic PRNG
  - a seeded operation generator
  - 6-10 fixed-seed scenarios
  - 8-16 operations per seed
- Keep failure output readable by including the seed and operation index in assertion messages.

**Step 4: Run test to verify it passes**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: PASS for the seeded scenarios, unless one exposes a real production bug.

**Step 5: Commit**

```bash
git add test/tierLeveling.test.ts
git commit -m "test: add seeded tier leveling simulations"
```

### Task 5: Fix Any Newly Exposed Propagation Bugs

**Files:**
- Modify: `src/lib/tierLeveling.ts` (only if required)
- Test: `test/tierLeveling.test.ts`

**Step 1: Write the failing test**

- Use the first real red scripted or seeded scenario from Tasks 3 or 4 as the reproduction case.

**Step 2: Run test to verify it fails**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: FAIL with a specific mixed-path scenario mismatch that reproduces the bug consistently.

**Step 3: Write minimal implementation**

- Change only the production logic in `src/lib/tierLeveling.ts` needed to satisfy the failing scenario.
- Do not loosen or delete the new tests.

**Step 4: Run test to verify it passes**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: PASS for the formerly failing scenario and all existing tier-leveling cases.

**Step 5: Commit**

```bash
git add src/lib/tierLeveling.ts test/tierLeveling.test.ts
git commit -m "fix: handle mixed tier leveling regressions"
```

### Task 6: Final Verification

**Files:**
- Verify: `test/tierLeveling.test.ts`
- Verify: `test/index.ts`
- Verify: `src/lib/tierLeveling.ts`

**Step 1: Write the failing test**

- Not applicable; use the completed suite as the verification target.

**Step 2: Run test to verify it fails**

- Not applicable.

**Step 3: Write minimal implementation**

- None.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: `svelte-check` reports 0 errors and 0 warnings, and the full custom test harness passes.

**Step 5: Commit**

```bash
git status --short
```
