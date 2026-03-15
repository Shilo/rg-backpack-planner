---
name: sync-docs
description: Use when asked to update, refresh, or sync documentation files (AGENTS.md, CLAUDE.md, README.md, test/README.md) to reflect recent code changes. Trigger on phrases like "update docs", "sync docs", "update readme", "docs are out of date", or "reflect recent changes in docs".
---

# Sync Docs from Git

Update AGENTS.md, CLAUDE.md, README.md, and test/README.md so each reflects code changes made since it was last updated in git.

## Target Files and Their Scope

| Doc file | What to update | Diff scope |
|---|---|---|
| `AGENTS.md` | Project Structure, Commands, Notes, Design Context | `src/ config/ scripts/ package.json` |
| `CLAUDE.md` | Identical to AGENTS.md — always kept in sync | `src/ config/ scripts/ package.json` |
| `README.md` | User-facing features, Controls | `src/ config/ public/ package.json` |
| `test/README.md` | Running Tests examples, When to Update Tests | `test/ src/lib/ src/config/` |

**AGENTS.md and CLAUDE.md always have identical content.** Every edit applied to one must also be applied to the other. If they have different last-commit hashes, use the **earlier** hash so neither file misses changes.

## Workflow

### Step 1 — Find last commit per file

For each target file, run:
```bash
git log --follow -n 1 --pretty=format:"%H %ai %s" -- <file>
```

This gives the commit hash and date where each doc was last modified.

### Step 2 — Explore what changed

For each file, get only the code changes relevant to that doc:
```bash
git diff <hash> HEAD -- <scope>
```

Use the **Diff scope** column from the table above for `<scope>`. Always diff against `HEAD` (not the working tree) so the diff is clean and reproducible. For AGENTS.md / CLAUDE.md, use the **earlier** of their two hashes.

Before reading the diff, also scan these areas of the codebase directly for structural signals that a diff alone may not surface clearly:

- **`src/lib/`** — New, removed, or renamed components, stores, and modules
- **`src/config/`** — Tree definitions, shared metadata, constants
- **`package.json` scripts** — Added or removed commands
- **`src/theme.css`**, **`themeEngine.ts`**, **`themeApply.ts`** — Design token or theming changes
- **Brand assets, design tokens, CSS variables** — Any new color palettes, font stacks, or spacing scales

Note what you've learned before writing any updates.

### Step 3 — Analyze and update each doc

Read the current content of each doc file, then apply targeted edits.

#### AGENTS.md and CLAUDE.md — Project Structure, Commands, Notes

- New modules or files in `src/lib/`, `src/config/`, `scripts/` → add or extend bullet
- Removed or renamed modules → remove or rename bullet
- New commands in `package.json` scripts → add to Commands section
- Sections that remain accurate → leave untouched

#### AGENTS.md and CLAUDE.md — Design Context

Update this section **only** when the UX, brand, or design model itself has changed — not merely because new components were added. Signs that warrant an update:

- Changes to the theme system, OKLCH engine, color model, or design tokens → revise **Aesthetic Direction**
- Changes to the user-facing interaction model or target audience → revise **Users**
- New design constraints or principles emerging from recent work → revise **Design Principles**

The Design Context section follows this structure — preserve it exactly when editing:

```markdown
## Design Context

### Users
[Who they are, their context, the job to be done]

### Brand Personality
[Voice, tone, 3-word personality, emotional goals]

### Aesthetic Direction
[Visual tone, references, anti-references, theme]

### Design Principles
[3–5 principles that guide all design decisions]
```

If design intent behind a change is ambiguous from the diff alone, ask the user before updating this section rather than guessing.

#### README.md — Features and Controls

- New user-visible features → add to the relevant feature section
- Changed controls (keyboard shortcuts, gestures) → update the Controls section
- Internal implementation details (refactors, constants, store logic, new test files) → skip entirely
- Apply the player's lens: only include what a Run! Goddess player would notice or care about

#### test/README.md — Running Tests and Update Guidance

- New test files → add a `npx tsx test/<name>.test.ts` example **only** if it covers a major, independently runnable test area (e.g., share URL encoding, tier leveling — not small helpers or internal store tests)
- New behavior categories under test → add to "When to Update Tests"
- New expected console errors from intentional error-path tests → add to "Expected Console Errors"

### Step 4 — Write the updates

Edit each doc file in place using the Edit tool. Make minimal, targeted edits — don't rewrite sections that are still accurate.

After all edits, confirm which files were updated and summarize each change in one line.

## Common Mistakes

- **Over-updating README.md** — Only include user-facing changes. Ignore new constants, refactored internals, renamed functions, or test infrastructure.
- **Forgetting the other file** — Every edit to CLAUDE.md must also be applied to AGENTS.md and vice versa. Never update one without the other.
- **Using the wrong hash for AGENTS.md / CLAUDE.md** — Always use the earlier (older) of their two hashes as the diff base so neither file misses any changes.
- **Diffing working tree instead of HEAD** — Always `git diff <hash> HEAD`, not `git diff <hash>` (which includes uncommitted changes).
- **Guessing at design intent** — If it's unclear whether a code change reflects a shift in UX or brand direction, ask the user before touching the Design Context section.
- **Adding every new test file to the examples** — The `npx tsx` examples in test/README.md are curated. Only add a file if it covers a major, independently useful test area.
- **Rewriting accurate sections** — Only edit what has changed. If a section is still correct, leave it alone.
