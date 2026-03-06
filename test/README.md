# Test Suite

This folder contains the repo's hand-written Node/TS test runners.

Primary entry points:

- `test/index.ts` (full default suite)
- `test/tierLeveling.test.ts` (tier contract CLI suite)
- `test/tierLeveling.ui.test.ts` (headed Playwright tier contract UI suite)
- `test/encoder.test.ts` (build-data codec suite)

## Quick Start

Run the default full verification path:

```bash
npm test
```

That runs:

1. `npm run check`
2. `tsx test/index.ts`

Run only the test runner (skip `svelte-check`):

```bash
npx tsx test/index.ts
```

Run focused suites directly:

```bash
npx tsx test/tierLeveling.test.ts
npx tsx test/tierTargetLevelFns.test.ts
npx tsx test/encoder.test.ts
```

Run headed UI tier verification:

```bash
npm run test:ui:tier
```

## Test Runner Behavior

`test/index.ts` is the current global orchestrator. It imports all test files in
its `TEST_FILES` list and runs them sequentially.

Key behavior:

- every file prints pass/fail status
- if any file fails, the process exits with code `1`
- full console output is mirrored to `test/index.output.log`
- final success summary prints only when everything passes

## Tier Leveling Contract Coverage

Tier expectations are centralized in:

- `README.md` (behavior contract)
- `test/tierLeveling.shared.ts` (shared expected scenarios/helpers)

Tier suites validate the same contract in two ways:

- CLI logic assertions (`test/tierLeveling.test.ts`)
- real rendered UI assertions (`test/tierLeveling.ui.test.ts`)

Current contract coverage includes:

1. Target clamp behavior (`[0, maxLevel]`) and no-op stability.
2. Directional reachability:
   - increment affects ancestors only
   - decrement affects ancestors and descendants
3. Strict descendant traversal by child-direction links.
4. Topology boundaries:
   - root has no ancestors
   - leaf has no descendants
5. Boundary hysteresis checkpoints:
   - increment reacts at `X1`
   - decrement reacts at `X9`
   - `19 -> 20` hold, `20 -> 21` react, `21 -> 20` hold, `20 -> 19` react
6. Same-tier decrement guardrails (for example `100 -> 99` keeps ancestor
   support and avoids collapse).
7. Descendants do not cap increment progression.
8. Zero-rebase rule:
   - target lands at `0`
   - ancestors hold tier-1 support
   - descendants rebase to tier `0`
9. Cross-branch isolation and both-side branch interaction checks.
10. Exact `deltas` validation per step for deterministic changed-node sets.

`test/tierTargetLevelFns.test.ts` separately validates tier math helpers and
breakpoint behavior (`tierIndex`, `tierUpper`, next/previous tier target
functions).

## Logs and Artifacts

Generated outputs:

- `test/index.output.log` (global suite mirror)
- `test/tierLeveling.output.log` (CLI tier suite mirror)
- `test/tierLeveling.ui.output.log` (UI tier suite mirror)
- `test/artifacts/tier-leveling-ui/` (failure screenshots from UI suite)

On failure, tier logs include step-level expected/actual arrays so regressions
can be traced quickly.

## Notes on the UI Tier Suite

`test/tierLeveling.ui.test.ts`:

- boots Vite on `http://127.0.0.1:4173`
- opens Chromium in headed mode via Playwright
- drives the production app under `/rg-backpack-planner/`
- applies each scenario using `applyLevelChange()` absolute target levels
- compares rendered levels/tiers with the same shared scenario expectations

This suite is intentionally slower and visually interactive compared to the CLI
suite.

## Expected Console Errors

Some tests intentionally exercise error paths. For example, encoder tests feed
invalid payloads and may print parse failures such as:

- `Failed to parse array format`
- `Invalid RLE format`

These logs are expected for those cases. Use suite summaries and exit code to
determine pass/fail.

## When to Update Tests

Update this folder when you change:

- tier propagation, clamping, or hysteresis behavior
- ancestor/descendant traversal or branch isolation behavior
- node level behavior mode semantics in `src/lib/tierLeveling.ts`
- build-data serialization format
- build-name encoding/decoding behavior
- accepted/rejected malformed input cases

When behavior changes intentionally, keep expectations explicit in
`test/tierLeveling.shared.ts` so regressions are obvious.
