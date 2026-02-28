# Tier Leveling UI Playwright Design

**Problem:** The repo has strong Node-side coverage for `applyLevelChange()`, but it does not currently prove that the visible production UI drives the same behavior when a real browser interacts with the rendered tree.

**Goal:** Add a headed browser verification path that uses the production UI, runs the same tier-leveling scenarios as `test/tierLeveling.test.ts`, logs the live runtime results after every step, and fails if the DOM-derived state differs from the shared expected test bed.

## Scope

- Reuse the current tier-leveling case definitions and expected-state logic as the source of truth.
- Drive the actual app UI under the existing GitHub Pages base path.
- Run in a visible browser so the user can watch each scenario execute.
- Capture a separate UI log with expected vs actual state at every step.
- Stop on the first mismatch and save failure artifacts for inspection.

## Non-Goals

- Replacing the existing Node-side tier suite.
- Folding browser automation into the default `npm test` path.
- Adding a fake test-only harness page that bypasses the production UI.
- Testing all trees immediately; the first pass only needs to cover the yellow-branch scenarios already modeled by the current suite.

## Recommended Approach

Use Playwright, running Chromium in headed mode, to automate the existing production UI. Keep the core tier oracle in shared test utilities so the Node suite and the UI suite consume the same scenario data and expected-state generation.

This is the most reliable option because it keeps assertions deterministic, supports screenshots and traces on failure, and still allows the browser window to stay visible during the run.

## Architecture

### 1. Shared Tier Test Module

Extract the reusable parts of `test/tierLeveling.test.ts` into a shared module under `test/`:

- case definitions for sweep, scripted scenario, and seeded scenario runs
- expected-state generation
- step formatting helpers
- utility functions needed to build exact expected `levels` and `tiers`

The Node suite remains the logic verifier, but it should import from the shared module rather than owning the only copy of the cases.

### 2. Playwright UI Runner

Add a new headed Playwright-driven script that:

- starts or connects to the local Vite app
- opens the real app route under `/rg-backpack-planner/`
- selects the correct tree tab
- performs the equivalent user interactions for each scenario step
- reads runtime state from the DOM after each step
- compares those values to the shared expected state
- mirrors the result to a dedicated log file

### 3. Separate Verification Outputs

Keep the existing Node log unchanged. Add a separate UI log file so the two runs can be compared side by side without overwriting each other.

Recommended new output:

- `test/tierLeveling.ui.output.log`

Recommended failure artifacts:

- `test/artifacts/tier-leveling-ui/<case>/<step>.png`
- optional trace or video files if Playwright tracing is enabled

## Runtime Interaction Model

The automation should use the context-menu path, not normal left-click leveling.

Reason:

- plain clicks depend on the persisted `singleLevelUp` preference
- the context menu exposes fixed explicit actions (`+1`, `+10`, `-1`, `-10`, `Max`, `Reset`)
- the context menu is already part of the production mouse interaction path

For each operation:

1. Locate the node by `data-node-id`.
2. Open its production context menu with a right-click.
3. Determine the current visible level from the DOM.
4. Translate the target level into a deterministic sequence of menu actions:
   - `Reset` when target is `0`
   - `Max` when target equals the node max
   - otherwise apply as many `+10` or `-10` clicks as possible, then finish with `+1` or `-1`
5. Close and reopen the menu as needed between actions if the UI requires it.
6. After the operation completes, read all yellow-branch nodes from the DOM and compare.

This preserves the real user path while keeping runtime short and reproducible.

## DOM Data Capture

Use only rendered DOM state, not internal stores, for the UI assertion layer.

For each visible node:

- identify the node via `[data-node-id="<index>"]`
- read `.node-level` text; if missing, treat as `0`
- read `.node-tier` text; if missing, treat as `0`

This ensures the UI test verifies both the state transition and the rendered badges the user actually sees.

## Logging And Failure Rules

The UI log should intentionally resemble the existing tier log format, but add actual values:

- suite header
- per-case header
- per-step expected header
- expected `levels`
- expected `tiers`
- actual UI `levels`
- actual UI `tiers`
- pass/fail summary

Failure rules:

- missing node element is a failure
- missing required menu action is a failure
- malformed numeric badge text is a failure
- any mismatch between actual and expected `levels` arrays is a failure
- any mismatch between actual and expected `tiers` arrays is a failure

On failure, the runner should:

- log the first divergence precisely
- save a screenshot
- stop the suite immediately

## Package And Command Shape

Keep browser automation separate from the default fast suite.

Recommended additions:

- add `playwright` as a dev dependency
- add a dedicated script such as `npm run test:ui:tier`

Do not add the UI run to `npm test` initially. The Node suite should stay fast and non-browser by default.

## Risks And Mitigations

### UI Selector Fragility

Risk: text-only selectors can drift.

Mitigation: use `data-node-id` as the primary node locator and keep menu-button locators narrow and explicit.

### Local Storage State Leakage

Risk: persisted preferences can change click behavior.

Mitigation: create a fresh Playwright browser context for each run and avoid normal click-leveling as the primary interaction path.

### Divergent Sources Of Truth

Risk: the Node suite and UI suite could drift if each owns its own cases.

Mitigation: move shared cases and expected-state generation into one test utility module used by both.

### Slow Feedback

Risk: headed browser runs are slower than `tsx` tests.

Mitigation: keep the UI suite opt-in and focused on the current yellow-branch scenarios.

## Success Criteria

The design is successful when:

- the existing Node suite still runs and uses shared tier-case data
- a new headed Playwright run visibly exercises the production UI
- the UI run writes a dedicated detailed log
- the UI log proves the rendered runtime state exactly matches the shared expected state after every scenario step
- failures produce actionable visual artifacts
