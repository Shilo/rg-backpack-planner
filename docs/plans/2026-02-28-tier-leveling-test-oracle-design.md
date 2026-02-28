# Tier Leveling Test Oracle Design

**Goal:** Replace the current false-pass-prone tier-leveling test oracle with contract-driven tests that independently verify reactive bulk leveling behavior before any production changes.

## Problem

- The current tier suite passes, but `test/tierLeveling.shared.ts` duplicates the same stable-tier transition logic used by `src/lib/tierLeveling.ts`.
- Because the tests and implementation share the same reasoning, they can both be wrong in the same way and still pass.
- The next round of work must keep strict TDD: write failing tests first, then adjust production code only if the new tests expose a real mismatch.

## Approved Behavior

### Target Node

- The target node always moves to the exact requested level, clamped to its own `maxLevel`.
- For `maxLevel = 100`, the target enters a new tier at `1`, `21`, `41`, `61`, and `81`.
- Reaching `20`, `40`, `60`, or `80` does not advance the target tier.

### Reactive Groups

- Ancestors react at the target node's stable tier.
- All other connected nodes in the same branch that are not the target and not ancestors are treated as wrapped nodes.
- Wrapped nodes react at `stable tier - 1`.
- This rule also applies when the target is the root: every other connected node is treated as wrapped.

### Reactive Levels

- Reactive nodes use the upper bound of their assigned tier, scaled to each node's own `maxLevel`.
- Example for a `100`-cap node:
  - target at `1` means ancestors are assigned `20`
  - target at `21` means ancestors are assigned `40`
  - target at `41` means ancestors are assigned `60`
- Example for a `50`-cap node:
  - wrapped tier `1` means `10`
  - wrapped tier `2` means `20`
- Example for a `1`-cap node:
  - any positive assigned tier means `1`

### Directional Hysteresis

- Stable-tier changes are direction-sensitive.
- On increment:
  - crossing from `20 -> 21` advances the stable tier
  - reactive nodes move using `max(currentLevel, assignedUpperBound)`
- On decrement:
  - moving from `21 -> 20` does not reduce the stable tier
  - moving from `20 -> 19` reduces the stable tier
  - reactive nodes move using `min(currentLevel, assignedUpperBound)`

### Valid State Assumption

- The system does not need to preserve arbitrary invalid desynced states as a compatibility guarantee.
- The implementation should still use the directional `min()` / `max()` rules, but tests can assume they start from valid states produced by the system.

## Recommended Test Strategy

### Replace The Shadow Oracle

- Stop using a test helper that replays the same stable-tier algorithm as `applyLevelChange`.
- The test oracle should verify the contract, not restate the implementation.

### Add Contract-Driven Boundary Tests

- Add explicit tests at the meaningful threshold transitions:
  - `0 -> 1`
  - `20 -> 21`
  - `21 -> 20`
  - `20 -> 19`
- Cover root, non-root, merged-node, and final-node targets.
- For each step, assert:
  - target exact level
  - ancestor assignment
  - wrapped-node assignment
  - unchanged reactive nodes when no stable-tier change occurs

### Keep A Smaller Explicit Scenario Layer

- Retain a few hand-authored multi-step scenarios for cross-branch and merged-node regressions.
- Do not use generated scenarios as the primary source of truth unless they are checking simple invariants rather than derived full-state expectations.

## TDD Workflow

1. Replace the current shadow-oracle expectations with new contract-driven tests.
2. Run the tier suite and confirm the new tests fail for the intended mismatch.
3. Change `src/lib/tierLeveling.ts` only enough to satisfy the failing test.
4. Re-run the tier suite after each small change.
5. Keep the explicit scenario layer after the contract tests pass to guard against broader regressions.

## Risks

- If any helper derives too much behavior, the suite can regress back into a shadow implementation.
- Boundary tests must stay focused on contract rules, not another full-state simulator.
- Merged-node paths need explicit coverage because they are the easiest place to hide branch-wide propagation mistakes.
