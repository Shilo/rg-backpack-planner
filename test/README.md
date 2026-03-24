# Test Suite

Hand-written Node/TS test runners for Backpack Planner.

## Running Tests

```bash
npm test                         # Full suite: svelte-check + tsc + all tests
npx tsx test/index.ts            # Test runner only (skip type checks)
npx tsx test/tierLeveling.test.ts   # Tier contract CLI suite
npx tsx test/tierTargetLevelFns.test.ts  # Tier math helpers
npx tsx test/encoder.test.ts     # Build-data codec suite
npx tsx test/shareUrl.test.ts    # Share URL encoding/decoding suite
npm run test:ui:tier             # Headed Playwright tier UI suite (only when requested)
```

## Test Runner Behavior

`test/index.ts` orchestrates all test files sequentially:

- Each file prints pass/fail status
- First failure exits immediately with code `1`
- Output is mirrored to `test/index.output.log`
- Success summary prints only when all tests pass

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
- Build-name encoding/decoding or malformed input handling
- Tech crystal cost calculations
- Tree branch reset or partial reset behavior
- Onboarding step definitions or pane layout logic
- Data migration logic in `src/lib/migrations/`
- Reduce motion setting or animation guard behavior
- Controls page data, input labels, or action resolution logic
- Locale/i18n keys, term mappings, or casing conventions

When behavior changes intentionally, update `docs/behavior-contracts.md` and keep expectations explicit in `test/tierLeveling.shared.ts`.
