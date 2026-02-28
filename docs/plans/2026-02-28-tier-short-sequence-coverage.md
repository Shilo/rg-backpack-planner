# Tier Short Sequence Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand tier-leveling test coverage with exact short-sequence regressions and generated 2-step boundary-adjacent cases, while documenting reactive threshold behavior clearly in `README.md`.

**Architecture:** Keep the test oracle independent by using exact expected states for hand-authored support-transfer sequences and rule-driven exact assertions for generated 2-step cases. Do not add a second full simulator. Keep coverage on the yellow branch fixture only because all branches share the same topology.

**Tech Stack:** TypeScript, hand-written CLI test runner, `tsx`, `apply_patch`

---

### Task 1: Update Root README Tier Notes

**Files:**
- Modify: `README.md`

**Step 1: Add README wording that yellow-only tests are representative because all branches share the same shape**

Update the `## Testing` section so it no longer implies yellow-only coverage is a limitation. Add a short tier-leveling explanation section that describes:
- target level changes always apply exactly to the target
- stable-tier thresholds for `100`, `50`, and `1` cap nodes
- upward reactive propagation uses `max(...)`
- downward reactive propagation uses `min(...)`
- same-tier decrements can still rebase neighbors

**Step 2: Review wording for consistency with current behavior**

Make sure the text matches the actual thresholds:
- `100` cap stable-tier rises at `1, 21, 41, 61, 81`
- `50` cap stable-tier rises at `1, 11, 21, 31, 41`
- `1` cap stable-tier rises at `1`

### Task 2: Add Failing Short-Sequence Regression Tests

**Files:**
- Modify: `test/tierLeveling.test.ts`

**Step 1: Add exact 3-step support-transfer scenarios before any production changes**

Add new explicit scenario cases that target the bug class:
- `A unlocks`, `B partially levels`, `A decrements`
- include both same-tier decrement rebasing and handoff-preserving cases
- keep exact expected arrays hand-authored

**Step 2: Add a generated 2-step boundary-adjacent matrix**

Add a new test layer that:
- starts from a zeroed yellow fixture
- picks a curated set of node indices that represent the branch roles
- applies two operations drawn from boundary-adjacent values (`0`, low bound, upper bound, next-tier low bound)
- uses exact rule-driven expectations per step, not invariant-only assertions

**Step 3: Run the tier suite to verify at least one new test fails before changing implementation**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: fail only if a real uncovered bug exists

### Task 3: Add Minimal Shared Helpers If Needed

**Files:**
- Modify: `test/tierLeveling.shared.ts`

**Step 1: Add only helper primitives needed by the new generated short-sequence layer**

Possible additions:
- boundary-adjacent level generator per `maxLevel`
- small tuple definitions for operation matrices

Do not add any helper that reconstructs full final branch state from operations.

### Task 4: Fix Production Only If New Tests Expose a Bug

**Files:**
- Modify: `src/lib/tierLeveling.ts` (only if required)

**Step 1: If the new tests fail, change the smallest production path needed**

Follow TDD:
- keep the new failing test
- change only the logic directly responsible
- avoid unrelated refactors

**Step 2: Re-run the targeted tier suite**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: PASS

### Task 5: Update Test Docs

**Files:**
- Modify: `test/README.md`

**Step 1: Document the new short-sequence layer**

Add concise notes covering:
- generated 2-step boundary-adjacent matrix
- explicit 3-step support-transfer regressions
- why this layer exists (to catch operation-order bugs manual testing kept finding)

### Task 6: Verify Everything

**Files:**
- None

**Step 1: Run full repo verification**

Run: `npm test`
Expected: `svelte-check` clean, all CLI suites pass

**Step 2: Review `git status --short`**

Confirm only intended files changed.
