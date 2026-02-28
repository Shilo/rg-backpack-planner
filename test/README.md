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
