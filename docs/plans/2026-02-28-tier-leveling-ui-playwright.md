# Tier Leveling UI Playwright Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a headed Playwright browser runner that drives the production UI, reuses the existing tier-leveling scenarios, logs expected vs actual UI state after every step, and fails on any mismatch.

**Architecture:** First extract the shared tier-case definitions and expected-state helpers from `test/tierLeveling.test.ts` into a reusable test module so the Node suite and UI suite share one source of truth. Then add a standalone `tsx`-driven Playwright script that boots the real app in a visible Chromium window, performs deterministic context-menu interactions, reads DOM-rendered node state, and writes a dedicated UI log plus failure screenshots.

**Tech Stack:** TypeScript, `tsx`, Playwright, Node child-process utilities, existing Svelte/Vite app UI

---

### Task 1: Extract Shared Tier Cases And Oracle Helpers

**Files:**
- Create: `test/tierLeveling.shared.ts`
- Modify: `test/tierLeveling.test.ts`

**Step 1: Write the failing test**

- In `test/tierLeveling.test.ts`, replace the in-file case data and pure helper declarations with imports that do not exist yet:

```ts
import {
    createYellowBranchFixture,
    buildExpectedStateForScenario,
    buildSeededScenarioCase,
    formatTierStepState,
    tierSweepCases,
    tierScenarioCases,
    tierSeededScenarioCases,
    YELLOW_BRANCH_LENGTH,
} from "./tierLeveling.shared.ts";
```

- Leave `runTierLevelingTests()` and file logging in place.

**Step 2: Run test to verify it fails**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: FAIL with `Cannot find module './tierLeveling.shared.ts'` or missing export errors.

**Step 3: Write minimal implementation**

- Create `test/tierLeveling.shared.ts` and move only the pure reusable pieces into it:
  - fixture builders
  - node traversal helpers
  - expected tier math
  - scripted case arrays
  - seeded case generation
  - step formatter
- Keep the Node test file responsible for:
  - log file reset and append
  - suite summaries
  - calling `applyLevelChange()`
  - auto-running on import

- Export a formatter that preserves the current step output shape:

```ts
export function formatTierStepState(params: {
    nodes: Node[];
    expectedLevels: number[];
    previousLevel: number;
    nextLevel: number;
    stepIndex: number;
    targetIndex: number;
}): string[] {
    // returns the existing 3-line block plus trailing blank line
}
```

**Step 4: Run test to verify it passes**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: PASS, and `test/tierLeveling.output.log` still uses the same per-step format as before the refactor.

**Step 5: Commit**

```bash
git add test/tierLeveling.shared.ts test/tierLeveling.test.ts
git commit -m "refactor: share tier leveling test fixtures"
```

### Task 2: Add Playwright Dependency And A UI Runner Entry Point

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `test/tierLeveling.ui.test.ts`

**Step 1: Write the failing test**

- Create a minimal UI runner stub that imports Playwright and shared test data, but do not install Playwright yet:

```ts
import { chromium } from "playwright";
import { tierSweepCases } from "./tierLeveling.shared.ts";

console.log(`Tier UI stub: ${tierSweepCases.length} cases loaded`);
await chromium.launch({ headless: false });
```

- Add a new script to `package.json`:

```json
"test:ui:tier": "tsx test/tierLeveling.ui.test.ts"
```

**Step 2: Run test to verify it fails**

Run: `npm run test:ui:tier`
Expected: FAIL with `Cannot find package 'playwright'`.

**Step 3: Write minimal implementation**

- Install `playwright` as a dev dependency and update `package-lock.json`.
- Keep the stub script simple for now:
  - launch Chromium headed
  - print a short header
  - close immediately in a `finally` block
- Do not add `@playwright/test` or a Playwright config file for this task; keep the runner as a plain `tsx` script.

**Step 4: Run test to verify it passes**

Run: `npm run test:ui:tier`
Expected: PASS, with a visible Chromium window opening and closing cleanly.

**Step 5: Commit**

```bash
git add package.json package-lock.json test/tierLeveling.ui.test.ts
git commit -m "test: add tier leveling ui runner entry point"
```

### Task 3: Build Deterministic Browser Session Bootstrap

**Files:**
- Modify: `test/tierLeveling.ui.test.ts`

**Step 1: Write the failing test**

- Expand the stub to call bootstrap helpers that do not exist yet:

```ts
const session = await bootTierUiSession();
const { browser, context, page, stopServer } = session;
await page.goto("http://127.0.0.1:4173/rg-backpack-planner/");
await ensureTierUiReady(page);
```

- Add a single smoke run for the first shared case (`tierSweepCases[0]`).

**Step 2: Run test to verify it fails**

Run: `npm run test:ui:tier`
Expected: FAIL because the new bootstrap helpers are not implemented yet, or because the script cannot reach a local app server.

**Step 3: Write minimal implementation**

- Implement a local app bootstrap inside `test/tierLeveling.ui.test.ts`:
  - spawn `npm run dev -- --host 127.0.0.1 --port 4173 --strictPort`
  - wait until the port responds before launching the browser
  - launch Chromium with a visible window and `slowMo` so the run is watchable
- Before navigation, force deterministic local storage in `page.addInitScript()`:

```ts
await context.addInitScript((version: string) => {
    localStorage.setItem("rg-backpack-planner-latest-used-version", version);
    localStorage.setItem("rg-backpack-planner-single-level-up", "false");
}, packageInfo.version);
```

- Import `package.json` version once so the “new version” side menu does not auto-open and block the tree.
- Ensure the script always closes the browser and kills the dev server in `finally`.

**Step 4: Run test to verify it passes**

Run: `npm run test:ui:tier`
Expected: PASS, with the app loading at `http://127.0.0.1:4173/rg-backpack-planner/` in a visible browser and the UI ready for interaction.

**Step 5: Commit**

```bash
git add test/tierLeveling.ui.test.ts
git commit -m "test: add deterministic tier ui bootstrap"
```

### Task 4: Add A Production-UI Node Driver And DOM State Reader

**Files:**
- Modify: `test/tierLeveling.ui.test.ts`
- Test: `src/lib/Node.svelte`
- Test: `src/lib/NodeContentMenu.svelte`

**Step 1: Write the failing test**

- Add one scripted UI assertion that uses helper calls which do not exist yet:

```ts
await setNodeToLevel(page, 1, 100);
const actual = await readYellowBranchState(page);
assertUiStateEqual("Yellow sibling decrement handoff", expectedStates[0], actual);
```

- Base the case on the first scripted scenario from the shared module.

**Step 2: Run test to verify it fails**

Run: `npm run test:ui:tier`
Expected: FAIL because the menu driver, DOM parser, or equality assertion helpers are not implemented yet.

**Step 3: Write minimal implementation**

- Implement helpers in `test/tierLeveling.ui.test.ts` that use the real production UI:
  - locate nodes via `[data-node-id="<index>"]`
  - open the production node menu with `page.click(selector, { button: "right" })`
  - scope actions to `[role="menu"][aria-label="Node actions"]`
  - read current level from `.node-level`, treating a missing badge as `0`
  - apply deterministic actions:
    - `Reset` for target `0`
    - `Max` for target `maxLevel`
    - repeated `+10` or `-10`
    - finish with `+1` or `-1`
- Read actual UI state for indices `0` through `9` by parsing:

```ts
type UiBranchState = {
    levels: number[];
    tiers: number[];
};
```

- Throw descriptive errors if:
  - a node is missing
  - the menu cannot be opened
  - a menu button is missing or disabled unexpectedly
  - a badge contains non-numeric text

**Step 4: Run test to verify it passes**

Run: `npm run test:ui:tier`
Expected: PASS for the first scripted case, with visible right-click menu interactions and exact DOM-derived state capture.

**Step 5: Commit**

```bash
git add test/tierLeveling.ui.test.ts
git commit -m "test: add tier ui node driver"
```

### Task 5: Expand The UI Runner To The Full Shared Suite With Logs And Artifacts

**Files:**
- Modify: `test/tierLeveling.ui.test.ts`
- Generate: `test/tierLeveling.ui.output.log`
- Generate: `test/artifacts/tier-leveling-ui/`

**Step 1: Write the failing test**

- Replace the single-case smoke path with the full shared case inventory:
  - `tierSweepCases`
  - `tierScenarioCases`
  - generated seeded cases from `tierSeededScenarioCases`
- Add strict logging calls before the loop that expect helpers which do not exist yet:

```ts
resetUiTierLogFile();
logUiTierLine("===");
logUiTierStep({
    expectedLevels,
    expectedTiers,
    actualLevels: actual.levels,
    actualTiers: actual.tiers,
});
```

- Fail fast on the first mismatch.

**Step 2: Run test to verify it fails**

Run: `npm run test:ui:tier`
Expected: FAIL on the first missing log helper, missing artifact directory handling, or the first unhandled case shape.

**Step 3: Write minimal implementation**

- Add a dedicated UI log writer in `test/tierLeveling.ui.test.ts` that writes `test/tierLeveling.ui.output.log`.
- Reuse the shared formatter for expected lines, then add matching actual lines:

```ts
function formatUiActualStepState(params: {
    actualLevels: number[];
    actualTiers: number[];
}): string[] {
    // returns aligned actual arrays
}
```

- Reset case state between runs by reloading the page and waiting for the tree, rather than trying to undo every prior mutation.
- On mismatch:
  - create `test/artifacts/tier-leveling-ui/<case-name>/` recursively
  - save a screenshot for the failing step
  - log the first divergent node index and both values
  - exit with a non-zero status

**Step 4: Run test to verify it passes**

Run: `npm run test:ui:tier`
Expected: PASS for all shared sweep, scripted, and seeded cases; the browser stays visible during the run; `test/tierLeveling.ui.output.log` is written.

**Step 5: Commit**

```bash
git add test/tierLeveling.ui.test.ts
git commit -m "test: add full tier ui suite logging"
```

### Task 6: Document The New UI Verification Flow

**Files:**
- Modify: `test/README.md`

**Step 1: Write the failing test**

- Use a simple doc-gap check before editing:

```bash
rg -n "test:ui:tier|tierLeveling.ui.output.log|Playwright" test/README.md
```

- The file should not mention the new UI flow yet.

**Step 2: Run test to verify it fails**

Run: `rg -n "test:ui:tier|tierLeveling.ui.output.log|Playwright" test/README.md`
Expected: no matches, proving the new browser workflow is undocumented.

**Step 3: Write minimal implementation**

- Update `test/README.md` to document:
  - the new `npm run test:ui:tier` command
  - that it launches a headed browser you can watch
  - the dedicated UI log path
  - screenshot artifact behavior on failure
  - that it compares DOM-derived runtime state against the shared tier expectations

**Step 4: Run test to verify it passes**

Run: `rg -n "test:ui:tier|tierLeveling.ui.output.log|Playwright" test/README.md`
Expected: matches for the new command and output references.

**Step 5: Commit**

```bash
git add test/README.md
git commit -m "docs: add tier ui test instructions"
```

### Task 7: Final Verification

**Files:**
- Verify: `package.json`
- Verify: `package-lock.json`
- Verify: `test/tierLeveling.shared.ts`
- Verify: `test/tierLeveling.test.ts`
- Verify: `test/tierLeveling.ui.test.ts`
- Verify: `test/README.md`

**Step 1: Write the failing test**

- Not applicable; use the completed verification commands as the acceptance gate.

**Step 2: Run test to verify it fails**

- Not applicable.

**Step 3: Write minimal implementation**

- None.

**Step 4: Run test to verify it passes**

Run: `npx tsx test/tierLeveling.test.ts`
Expected: PASS, and `test/tierLeveling.output.log` is written.

Run: `npm run test:ui:tier`
Expected: PASS, a visible browser run completes, and `test/tierLeveling.ui.output.log` is written.

Run: `npm run check`
Expected: `svelte-check` reports 0 errors and `tsc -p tsconfig.node.json` passes.

**Step 5: Commit**

```bash
git status --short
```
