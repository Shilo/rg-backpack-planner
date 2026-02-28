# Tier Leveling Design

**Goal:** Redesign tier-based level propagation so `applyLevelChange` can bulk-adjust related yellow-branch nodes by ancestor, descendant, and wrapped traversal rules, with direction-aware threshold hysteresis and full branch verification in tests.

## Scope

- Reintroduce the missing `test/tierLeveling.test.ts` suite.
- Model every scenario against a simulated Yellow Branch sliced from `src/config/baseTree.ts`.
- Verify every step against all 10 yellow-branch nodes, including both `level` and derived `tier`.
- Update `applyLevelChange` in `src/lib/tierLeveling.ts` to propagate level changes across the branch using the approved rules.

## Test Design

- Keep `createYellowBranchFixture()` as the single source for a clean yellow branch (`0..9`) and a zeroed `levels` array.
- Keep `assertYellowBranchState()` as the final assertion gate for every step:
  - validate all 10 nodes on every operation
  - validate exact `level`
  - validate derived `tier` via `tierIndex(level, node.maxLevel)`
  - include transition metadata (`previousLevel`, `nextLevel`, direction) in failures
- Split coverage into two complementary layers:
  - deterministic scripted scenarios for readability and targeted regressions
  - seeded pseudo-random scenarios for broader interaction coverage

### Deterministic Scenario Layer

- Preserve the existing round-trip sweeps:
  - root node round-trip `0 -> 100 -> 0`
  - second-tier node round-trip `0 -> 100 -> 0`
  - representative tier-3 split node round-trip
  - representative tier-4 merged node round-trip (`maxLevel 50`)
  - final node round-trip (`maxLevel 1`)
- Add a second scenario runner that accepts ordered multi-node operations, for example:
  - increment one node, then decrement a sibling in the same unlocked region
  - increment a deep merged node, then decrement an inner ancestor-side node
  - partially increment several connected nodes, then partially decrement one internal node
  - interleave left-side and right-side operations before touching shared merged nodes
- Focus these scripted scenarios on fragile cases the current full sweeps do not cover:
  - decrementing within an already leveled path instead of always at the leaf
  - backtracking from shared-parent states
  - hysteresis transitions just below and just above tier boundaries

### Seeded Simulation Layer

- Add a deterministic pseudo-random generator with fixed seeds so every failure is reproducible.
- Each seed should generate a short, debuggable scenario rather than a giant fuzz run.
- Bias generated operations toward edge cases instead of uniform randomness:
  - nodes commonly involved in fragile transitions: `0`, `1`, `2`, `3`, `5`, `6`, `7`, `8`, `9`
  - boundary-adjacent target levels per node:
    - `100`-cap nodes: `0`, `1`, `19`, `20`, `21`, `39`, `40`, `41`, `59`, `60`, `61`, `79`, `80`, `81`, `99`, `100`
    - `50`-cap nodes: `0`, `1`, `9`, `10`, `11`, `19`, `20`, `21`, `29`, `30`, `31`, `39`, `40`, `41`, `49`, `50`
    - `1`-cap nodes: `0`, `1`
  - alternating increment/decrement operations inside the same connected path
- Target an initial baseline of:
  - 8-12 scripted scenarios
  - 6-10 seeded scenarios
  - 8-16 operations per seeded scenario
  This is enough to broaden coverage materially without making failures unreadable.

## Propagation Rules

- Incrementing to a new effective tier:
  - target node reaches the requested level
  - ancestors must be at least the target node's current tier
  - wrapped ancestors (continuing past the root toward the leaf) must be at least one tier lower than the current tier
- Decrementing to a lower effective threshold:
  - target node reaches the requested level
  - descendants must be at most one tier lower than the target node's current tier
- Threshold hysteresis is direction-sensitive:
  - increasing at an exact tier cap does not propagate
  - increasing one level beyond the cap propagates
  - decreasing back to the exact cap does not roll back
  - decreasing one level below the cap rolls back

## Implementation Shape

- Keep `tierSize`, `tierIndex`, and `tierUpper` as the shared tier primitives.
- Restore branch traversal helpers to walk:
  - direct parents
  - direct children
  - wrapped root-to-leaf traversal when increasing past the root
- Distinguish the target node's current tier from its completed tier boundary so propagation reacts correctly at `20/21`, `40/41`, and the reverse transitions.
- Clamp every propagated level to each node's own `maxLevel`, so `50`-cap and `1`-cap nodes use their own tier boundaries instead of the starter examples' `100`-only assumption.

## Oracle Model

- Add a test-only reference model that does not call `applyLevelChange`.
- The oracle should:
  - apply the requested target node level
  - derive sticky tier changes from prior branch state plus operation direction
  - enforce ancestor minimums, wrapped-node tiers, and decrement caps across the branch
  - clamp every node to its own `maxLevel`
- Use this same oracle for both scripted scenarios and seeded simulations so every new test path shares one expectation source.
- Keep the oracle separate from production helpers to reduce the risk of tests simply restating the implementation.

## Failure Output

- Every scenario failure should report:
  - scenario name or random seed
  - operation index
  - target node index
  - previous level, requested level, and direction
  - the node index that mismatched
- Seeded runs must remain small enough that a single failing step is practical to diagnose from console output alone.

## Risks

- The merged yellow nodes (`7`, `8`, `9`) can expose bugs if propagation revisits nodes through multiple parents.
- A helper that computes too much expected behavior can duplicate the implementation and hide defects, so the oracle must stay constraint-based rather than mirroring `applyLevelChange` line-for-line.
- The repo's test harness is custom and currently does not import the tier-leveling suite, so `test/index.ts` must be updated as part of reintroducing these tests.
- Overly large random runs would reduce debuggability, so seeded scenarios must stay intentionally short and edge-biased.
