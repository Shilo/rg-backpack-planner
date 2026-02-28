# Test Suite

This folder contains the automated tests for the build-data encoder / decoder used by the share-link system.

The current entry point is `test/index.ts`, which imports `test/encoder.test.ts`. The suite auto-runs when imported or executed.

## What Is Covered

`test/encoder.test.ts` currently exercises five areas:

1. Invalid-input handling for malformed share strings
2. Encode/decode round-trip coverage for many build shapes
3. Decoder compatibility cases for explicit serialized strings
4. Build-name space encoding / decoding helpers
5. Build-name extraction from encoded share strings

The tests focus on correctness first, but they also print compression stats so changes to the encoding format are easy to spot.

## Recommended Way To Run

Run the full suite from the CLI:

```bash
npm test
```

That runs:

1. `npm run check`
2. `tsx test/index.ts`

Use this path when you want the same result CI-style local verification should use.

## Running Only The Test File

If you have already run type checks and only want the test runner itself:

```bash
npx tsx test/index.ts
```

This skips the `svelte-check` / TypeScript validation done by `npm test`.

## Running In The Browser

You can also run the suite from the browser console through Vite.

1. Start the dev server:

    ```bash
    npm run dev
    ```

2. Open the app at:

    `http://localhost:5173/rg-backpack-planner/`

3. In the browser console, import the test entry:

    ```js
    import("./test/index.ts");
    ```

If you are not already on the app page, use an absolute path instead:

```js
import("/rg-backpack-planner/test/index.ts");
```

## Reading The Output

The suite prints verbose logs by design:

- each test group has its own header and summary
- successful round-trip tests print original data, decoded data, and serialized output
- encoding tests also print JSON length vs serialized length
- the final section prints a combined total across all test groups

### Expected Error Logs

Some tests intentionally feed invalid strings into the decoder. During those cases, `decodeBuildData()` logs parser errors such as:

- `Failed to parse array format`
- `Invalid RLE format`

Those logs are expected. They do **not** mean the suite failed by themselves. The actual result is the per-section summary and the final combined summary.

If the summaries show zero failed tests, the suite passed.

## When To Update These Tests

Update or extend this suite whenever you change:

- the serialized share format
- the build-name encoding rules
- decoder compatibility behavior
- accepted or rejected malformed input cases

If you change the encoder format intentionally, keep compatibility cases explicit so regressions are easy to detect.
