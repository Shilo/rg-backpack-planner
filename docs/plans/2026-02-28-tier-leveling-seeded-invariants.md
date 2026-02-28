# Tier Leveling Seeded Invariants Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add seeded invariant-based tier leveling tests for partial-level branch changes and remove dead shadow-oracle scenario code.

**Architecture:** Keep the current boundary-contract and explicit regression tests as the primary oracle. Add a small seeded operation generator that drives `applyLevelChange()` through mixed partial-level states, then assert invariants after each step instead of comparing against a fully generated expected branch state.

**Tech Stack:** TypeScript, `tsx` CLI tests, existing `applyLevelChange()` tier logic.

---

### Task 1: Add failing seeded invariant tests

**Files:**
- Modify: `test/tierLeveling.test.ts`

**Steps:**
1. Add a seeded invariant case list and runner that reuses seeded operations.
2. Assert only stable invariants after each operation.
3. Run `npx tsx test/tierLeveling.test.ts`.
4. Confirm the new tests fail before helper changes.

### Task 2: Keep only reusable seeded helpers

**Files:**
- Modify: `test/tierLeveling.shared.ts`

**Steps:**
1. Remove shadow-oracle scenario state builders that compute full expected arrays.
2. Remove unused exported scenario lists that are no longer executed.
3. Keep and expose only the seeded operation generator plus the helpers it depends on.
4. Re-run `npx tsx test/tierLeveling.test.ts` until green.

### Task 3: Verify full suite

**Files:**
- No code changes expected

**Steps:**
1. Run `npm test`.
2. If green, commit the relevant test-file changes.
