---
name: prune-tests
description: Use when the test suite has become bloated with trivial tests that lock down CSS, locale strings, component structure, or other implementation details rather than behavior. Use when tests break on routine UI, styling, or config changes. Use when CI is slow due to test volume.
---

# Prune Tests

## Overview

Delete tests that lock down **implementation details** instead of protecting **behavior**. Tests should catch bugs, not block routine changes to styling, locale strings, or component structure.

**Core principle:** If a test breaks because you changed something cosmetic, it's not protecting behavior — it's resisting change.

## When to Use

- Tests break when you change CSS, locale text, or component props
- Test suite has grown large and slows CI
- Many tests regex-match source files for specific strings instead of testing runtime behavior
- You find yourself updating tests just to "make them pass" after routine changes

## What to DELETE

### 1. CSS / Style Assertion Tests

Tests that regex-match source files for specific CSS properties.

```typescript
// ❌ DELETE — locks down implementation, not behavior
const source = readFileSync("src/lib/Node.svelte", "utf8");
if (!/font-weight:\s*bold;/.test(source)) {
    throw new Error("Node badge should use bold font weight.");
}
```

**Why:** CSS is presentation. If you change `bold` to `700`, or swap `inline-flex` for `grid`, these tests break with zero bugs introduced. The browser renders it — your eyes verify it.

**Includes:** flex rules, font-family stacks, display values, width/min-width guards, font-variant-numeric, text-size-adjust, focus outline suppression, container queries for icon visibility, modal background variables.

### 2. Locale String Snapshot Tests

Tests that assert exact translation text or enforce terminology across locale files.

```typescript
// ❌ DELETE — locks down translation content
assert.strictEqual(get(ja, "skills.attack_boost"), "攻撃力強化");
```

**Why:** Translations change during localization reviews, player feedback, and style updates. These tests turn every translation tweak into a test failure. Locale files are config, not logic.

**Includes:** Exact string matching per locale key, casing style enforcement, game terminology canonicalization, "Tech Crystal" prefix enforcement, short label length comparisons.

**Exception:** Keep tests that validate locale *structure* (all keys present across locales, no missing interpolation variables) — those catch real bugs.

### 3. Component Structure / Wiring Tests

Tests that read `.svelte` source files to verify specific imports, prop names, or component composition.

```typescript
// ❌ DELETE — testing wiring, not behavior
if (!/import\s+ComposeScreenshot/.test(source)) {
    throw new Error("AppHotkeys should import ComposeScreenshot");
}
```

**Why:** Component wiring is verified by the app working. If an import is missing, the build fails or the feature visibly breaks. These tests duplicate what the compiler already checks.

**Includes:** Import statement assertions, prop existence checks, aria-label exact values, data-attribute assertions, event handler wiring, icon import verification.

### 4. Typography / Badge Presentation Tests

Tests for font-size variables, font-weight, display mode, alignment, or font-family on specific components.

**Why:** Typography is visual. Changing a font stack or size variable isn't a bug — it's a design decision.

### 5. Duplicate Store Pattern Tests

When multiple stores follow an identical pattern (default value, persistence, reset) and each has its own test file asserting the same boilerplate.

**Keep ONE** canonical store test that validates the pattern works. Delete the copies that just swap the store name and key.

### 6. Source-Code Regex Tests for Implementation Approach

Tests that enforce a specific *implementation* by scanning source code.

```typescript
// ❌ DELETE — mandating an approach, not testing behavior
if (/cloneNode|offscreenParent/.test(source)) {
    throw new Error("Must use snapdom approach, not cloning");
}
```

**Why:** How something is implemented is a developer decision. If the behavior is correct, the approach doesn't matter.

## What to KEEP

| Category | Example | Why |
|----------|---------|-----|
| **Algorithms** | `calculateTechCrystalsSpent`, `budgetEnforcement` | Math can silently produce wrong results |
| **Encoding/decoding** | `encoder.test.ts`, `shareUrl.test.ts` | Serialization bugs corrupt user data |
| **State machines** | Undo/redo edge cases, tier leveling logic | Complex transitions have subtle bugs |
| **Data migrations** | `runMigrations.test.ts` | Migration bugs destroy saved data |
| **Business rules** | Global leaf cap, skill value calculations | Core game mechanics must be correct |
| **Keyboard/action mapping** | `keyboardAction.test.ts`, `resolveAction.test.ts` | Input mapping bugs block users |

**Rule of thumb:** If a human couldn't catch the bug by looking at the screen for 2 seconds, it needs a test. If they could, it probably doesn't.

## Workflow

### Step 1: Audit

List all test files and categorize each as DELETE or KEEP using the criteria above.

### Step 2: Delete Files

Remove the test files. Don't comment them out or archive them — delete.

### Step 3: Update Test Index

Remove deleted files from `test/index.ts` TEST_FILES array.

### Step 4: Run Remaining Tests

```bash
npm test
```

All remaining tests should still pass. If any fail due to shared imports from deleted files, fix or inline those imports.

### Step 5: Verify CI

Ensure `npm test` in CI still works with the reduced suite.

## Borderline Cases

**Locale structure validation** (all locales have same keys) → KEEP. Missing keys cause runtime errors.

**Hotkey mapping tests** → KEEP if testing the mapping logic. DELETE if just checking an import exists.

**Store persistence tests** → KEEP one canonical test. DELETE if 5+ stores test identical `localStorage.getItem` boilerplate.

**Layout calculation functions** → KEEP if testing a pure function with numeric inputs/outputs. DELETE if regex-matching CSS from a `.svelte` file.

**CI workflow config tests** → KEEP. These are cheap and catch real misconfigurations.

## What NOT to Do

- Don't replace deleted tests with "better" tests unless there's a real behavior to protect
- Don't add snapshot tests as a replacement — they have the same problem
- Don't feel obligated to maintain test count — fewer meaningful tests > many trivial ones
- Don't create tests for UI that you can verify by looking at the screen
