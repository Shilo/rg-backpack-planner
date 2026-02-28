# Tier Leveling Design

**Goal:** Redesign tier-based level propagation so `applyLevelChange` can bulk-adjust related yellow-branch nodes by ancestor, descendant, and wrapped traversal rules, with direction-aware threshold hysteresis and full branch verification in tests.

## Scope

- Reintroduce the missing `test/tierLevelig.test.ts` suite.
- Model every scenario against a simulated Yellow Branch sliced from `src/config/baseTree.ts`.
- Verify every step against all 10 yellow-branch nodes, including both `level` and derived `tier`.
- Update `applyLevelChange` in `src/lib/tierLeveling.ts` to propagate level changes across the branch using the approved rules.

## Test Design

- Use a `createYellowBranchFixture()` helper that returns the yellow branch nodes (`0..9`) and a fresh `levels` array initialized to zero.
- Use an `assertYellowBranchState()` helper that receives:
  - the yellow-branch nodes
  - the actual branch levels after a step
  - the expected level for each yellow node
  - the transition context (`previousLevel`, `nextLevel`) so failures can show the direction (`-1`, `0`, `1`)
- `assertYellowBranchState()` must validate all 10 nodes on every step:
  - exact level
  - exact tier via `tierIndex(level, node.maxLevel)`
- Use sequence-based tests instead of isolated calls:
  - root node round-trip `0 -> 100 -> 0`
  - second-tier node round-trip `0 -> 100 -> 0`
  - additional explicit cases for tier-3 split nodes, tier-4 merge nodes (`maxLevel 50`), and the final node (`maxLevel 1`)

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

## Risks

- The merged yellow nodes (`7`, `8`, `9`) can expose bugs if propagation revisits nodes through multiple parents.
- A helper that computes too much expected behavior can duplicate the implementation and hide defects, so merged-node expectations should stay explicit in the test data.
- The repo's test harness is custom and currently does not import the tier-leveling suite, so `test/index.ts` must be updated as part of reintroducing these tests.
