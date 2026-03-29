# Test Suite

Hand-written Node/TS test runners for Backpack Planner.

## Running Tests

```bash
npm test                         # Type checks + curated CLI suite from test/index.ts
npx tsx test/index.ts            # Curated CLI test runner only (skip type checks)
npx tsx test/tierLeveling.test.ts   # Tier contract CLI suite
npx tsx test/tierTargetLevelFns.test.ts  # Tier math helpers
npx tsx test/compareStats.test.ts  # Compare statistics mapping suite
npx tsx test/encoder.test.ts     # Build-data codec suite
npx tsx test/shareUrl.test.ts    # Share URL encoding/decoding suite
npm run test:ui:undo             # Headless undo/redo browser smoke test (only when requested)
npm run test:ui:locale           # Headless missing-locale-keys sweep (only when requested)
npm run test:ui:tier             # Headed Playwright tier UI suite (only when requested)
npm run test:ui:capture          # Preview-build screenshot regression suite (only when requested)
```

## Test Runner Behavior

`test/index.ts` orchestrates a curated CLI test list sequentially:

- Each file prints pass/fail status
- Output is mirrored to `test/index.output.log`
- A final summary always prints
- Exit code is `1` if any listed suite fails
- Playwright UI suites run separately via `npm run test:ui:*` and are not part of `npm test`

## Tier Leveling Contract

Tier expectations are centralized in:

- `docs/behavior-contracts.md` — Full behavior contract
- `test/tierLeveling.shared.ts` — Shared expected scenarios and helpers

Two suites validate the same contract:

- **CLI** (`tierLeveling.test.ts`) — Logic assertions against the engine directly
- **UI** (`tierLeveling.ui.test.ts`) — Headed Playwright driving the production app on `http://127.0.0.1:4173/rg-backpack-planner/`

Contract coverage includes target clamping, directional reachability, boundary hysteresis, same-tier guardrails, zero-rebase rules, cross-branch isolation, and exact delta validation.

## Logs and Artifacts

- `test/index.output.log` — Global suite mirror
- `test/tierLeveling.output.log` — CLI tier suite mirror
- `test/tierLeveling.ui.output.log` — UI tier suite mirror
- `test/captureScreenshot.ui.output.log` — Screenshot capture UI suite mirror
- `test/missingLocaleKeys.ui.output.log` — Missing locale keys UI sweep mirror
- `test/artifacts/tier-leveling-ui/` — Failure screenshots from UI suite

## Expected Console Errors

Some tests intentionally exercise error paths (e.g. invalid encoder payloads). Messages like `Failed to parse array format` or `Invalid RLE format` are expected. Use suite summaries and exit code to determine pass/fail.

## When to Update Tests

Update tests when changing:

- Tier propagation, clamping, or hysteresis behavior
- Ancestor/descendant traversal or branch isolation
- Node level behavior mode semantics in `src/lib/tierLeveling.ts`
- Build-data serialization format
- Share URL encoding/decoding or recommended build links
- Comparison statistics or active-side value mapping
- Build-name encoding/decoding or malformed input handling
- Tech crystal cost calculations
- Tree branch reset or partial reset behavior
- Onboarding step definitions or pane layout logic
- Data migration logic in `src/lib/migrations/`
- Reduce motion setting or animation guard behavior
- Controls page data, input labels, or action resolution logic
- Locale/i18n keys, term mappings, or casing conventions

When behavior changes intentionally, update `docs/behavior-contracts.md` and keep expectations explicit in `test/tierLeveling.shared.ts`.
