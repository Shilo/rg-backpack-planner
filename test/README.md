# Test Suite

This folder contains the repo's hand-written test runners. The current entry
point is `test/index.ts`, which imports both `test/tierLeveling.test.ts` and
`test/encoder.test.ts`. Each file auto-runs when it is imported or executed.

## Files

### `test/index.ts`

Loads the current CLI test suite in this order:

1. `test/encoder.test.ts`
2. `test/tierLeveling.test.ts`

Use this when you want the same application-level test flow that `npm test`
uses after type-checking.

### `test/tierLeveling.test.ts`

Exercises `applyLevelChange()` against the simulated yellow branch from
`src/config/baseTree.ts`.

Current coverage includes:

1. Round-trip sweeps from level `0` to max level and back down for key yellow
   branch nodes (root, early branch, split node, merged node, and final node)
2. Scripted multi-step scenarios that mix increments and decrements across
   related nodes to catch ancestor, descendant, and wrapped-node propagation
3. Seeded deterministic simulations for additional edge-biased path coverage
4. Per-step validation of every node in the branch, asserting both expected
   level and derived tier state
5. Per-step output that prints the target node index, the level transition,
   aligned `levels` and `tiers` arrays, and mirrors the same output to
   `test/tierLeveling.output.log`

These tests are intended to catch the fragile threshold behavior around tier
boundaries and branch hysteresis.

### `test/encoder.test.ts`

Exercises the share-link build-data encoder and decoder.

Current coverage includes:

1. Invalid-input handling for malformed share strings
2. Encode/decode round-trip coverage for many build shapes
3. Decoder compatibility cases for explicit serialized strings
4. Build-name space encoding and decoding helpers
5. Build-name extraction from encoded share strings

The encoder tests also print compression stats so format changes are easy to
spot while reviewing output.

## Recommended Commands

Run the full local verification path:

```bash
npm test
```

That runs:

1. `npm run check`
2. `tsx test/index.ts`

Run the test files without `svelte-check`:

```bash
npx tsx test/index.ts
```

Run a single suite directly:

```bash
npx tsx test/tierLeveling.test.ts
npx tsx test/encoder.test.ts
```

When you run the tier suite directly, it also writes a full mirror of the tier
output to `test/tierLeveling.output.log`.

Run the headed production-UI verification path:

```bash
npm run test:ui:tier
```

That launches a visible Chromium window through Playwright, drives the real app
under the existing `/rg-backpack-planner/` base path, applies each test step by
calling `applyLevelChange()` directly with that operation's absolute target
level, and compares the rendered yellow-branch runtime state against the shared
tier expectations after every step.

While the Playwright run is active, the app also shows the current test label
inside the preview indicator area. That indicator is loaded from a dev-only
module path and is intentionally excluded from the production `npm run build`
bundle.

In VS Code, the `.vscode/launch.json` profile `Test UI: Node Level` runs the
same command.

## Running In The Browser

You can also run the test entry from the browser console through Vite.

1. Start the dev server:

    ```bash
    npm run dev
    ```

2. Open the app at:

    `http://localhost:5173/rg-backpack-planner/`

3. Import the test entry in the browser console:

    ```js
    import("./test/index.ts");
    ```

If you are not already on the app page, use an absolute path instead:

```js
import("/rg-backpack-planner/test/index.ts");
```

## Reading The Output

The tests are intentionally verbose:

- each suite prints its own header and summary
- tier tests report pass/fail counts across sweep, scenario, and seeded cases
- tier tests print each expected step as `step N expected [index X] (A -> B)`
- tier tests print aligned `levels` and `tiers` arrays for each step
- tier tests mirror their full output to `test/tierLeveling.output.log`
- the Playwright tier UI run writes its output to `test/tierLeveling.ui.output.log`
- the Playwright tier UI log reuses the same expected-step format as the CLI
  tier log, then adds `actual levels` and `actual tiers`, so the two logs can
  be compared directly
- the Playwright tier UI run drives the production UI in a headed browser window
- the Playwright tier UI run shows the active case label in the app while it is
  running
- the Playwright tier UI run compares DOM-derived `levels` and `tiers` against
  the shared tier expectations after every step
- on a Playwright tier UI failure, a screenshot is saved under
  `test/artifacts/tier-leveling-ui/`
- both tier log files are already ignored by git through the repo-wide `*.log`
  rule in `.gitignore`
- tier tests end by printing the absolute log-file path so it can be opened
  directly from terminals that support clickable `path:line` output
- encoder tests print round-trip details and serialized-size comparisons
- the overall run completes only if both imported suites finish without
  throwing

### Expected Error Logs

Some encoder tests intentionally feed invalid strings into `decodeBuildData()`.
During those cases, parser errors such as `Failed to parse array format` or
`Invalid RLE format` are expected and do not mean the suite failed by
themselves.

Rely on the per-suite summaries and the final process exit status to determine
whether the run passed.

## When To Update These Tests

Update or extend this folder when you change:

- tier propagation or level-clamping behavior
- yellow-branch traversal or parent/merge handling
- the serialized share format
- build-name encoding rules
- decoder compatibility behavior
- accepted or rejected malformed input cases

When format or tier behavior changes intentionally, keep the expectations
explicit so regressions are easy to identify.
