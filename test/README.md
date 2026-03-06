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

1. Explicit directional propagation scenarios using fixed expected arrays
2. Directional reachability checks (ancestor-only on increment, ancestor+descendant on decrement)
3. Role partition checks for ancestor, descendant, and unrelated node sets
4. Root/leaf topology checks (`root` has no ancestors, `leaf` has no descendants)
5. README hysteresis checkpoints (`X1` up-react, `X9` down-react, with `21 -> 20` hold and `20 -> 19` drop)
6. Same-tier decrement guardrails (for example `100 -> 99` keeps ancestor support at tier 5)
7. Increment-through-tier coverage with low descendants (descendants do not cap level-up progression)
8. Target-to-zero behavior (`ancestors` keep tier-1 support, descendants rebase to zero)
9. Delta validation for every step to ensure only expected nodes change
10. Per-step output mirrored to `test/tierLeveling.output.log`

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
under the existing `/rg-backpack-planner/` base path, applies each directional
scenario step by calling `applyLevelChange()` with that operation's absolute
target level, then compares rendered yellow-branch levels/tiers against the
same explicit scenario expectations used by the CLI tier suite.

The rewritten UI suite no longer runs a cross-target matrix preflight; it
focuses on deterministic directional scenarios.

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
- tier tests print each expected step as `step N [index X] (A -> B)`
- tier tests print aligned `levels` arrays for each step
- tier tests mirror their full output to `test/tierLeveling.output.log`
- the Playwright tier UI run writes its output to `test/tierLeveling.ui.output.log`
- the Playwright tier UI log records expected vs actual levels for each step
- the Playwright tier UI run drives the production UI in a headed browser window
- the Playwright tier UI run compares DOM-derived `levels` and `tiers` against
  shared directional expectations after every step
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
