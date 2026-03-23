# Onboarding Pane Split Rules Design

## Goal

Refine onboarding pane layout so column behavior is step-driven instead of auto-derived, card ordering can be controlled per step, and onboarding shortcut hints render with the same parenthetical line-break treatment used by the controls page.

## Decisions

### 1. Step data owns column splits

- Add an optional `splitIndex` to onboarding step definitions.
- If a step provides `splitIndex`, the pane renders two columns universally on mobile and desktop.
- If a step omits `splitIndex`, the pane renders a single column.
- Pane layout should no longer infer two-column mode from viewport height, viewport width, or card count.

### 2. Explicit card order per step

- `nodes` should use `splitIndex: 2`, yielding a `2 | 3` layout.
- `tree` should use `splitIndex: 2`, yielding a `2 | 1` layout.
- `Tree Options` must be the final `tree` card so it appears as the single bottom card in the second column.

### 3. Column width behavior

- The pane should render two real flex columns inside a horizontal flex wrapper.
- Each `card-column` should shrink-wrap to its own widest card.
- Cards inside a column should stretch to the column width, so every card in that column matches the widest sibling.
- Column containers should size to cards and not overflow independently.

### 4. Input hint formatting

- Onboarding shortcut labels should mirror the controls page behavior for parenthetical hints.
- Parenthetical suffixes such as `(-1, -10, -Tier)` should be parsed out of the main label.
- The parenthetical portion should render as a muted hint line below the main chip row, not inline.

## Files To Touch

- `src/lib/onboarding/onboardingSteps.ts`
- `src/lib/onboarding/OnboardingPane.svelte`
- `src/lib/onboarding/OnboardingCard.svelte`
- `test/onboardingPaneLayout.test.ts`
- `test/onboardingStepsData.test.ts`

## Guardrails

- Do not reword existing English `controls.*` localization.
- Do not change established Japanese in-game terms.
- Keep locale edits out of this refinement unless strictly required.
- Preserve the existing onboarding step sequence.

## Verification

- Add source/data guards for `splitIndex`-driven pane rendering.
- Guard `nodes` as `2 | 3`.
- Guard `tree` as `2 | 1` with `Tree Options` last.
- Guard parenthetical hint parsing in onboarding card rendering.
- Run `npx tsx test/onboardingPaneLayout.test.ts`.
- Run `npx tsx test/onboardingStepsData.test.ts`.
- Run `npm run check`.
- Run `npx tsx test/index.ts`.
