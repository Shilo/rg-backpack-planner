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

This gives the commit hash where each doc was last modified.

### Step 2 — Get the diff for each file

Using the hash from Step 1, get only the code changes relevant to that doc:
```bash
git diff <hash> HEAD -- <scope>
```

Use the **Diff scope** column from the table above for `<scope>`. Always diff against `HEAD` (not the working tree) so the diff is clean and reproducible.

For AGENTS.md / CLAUDE.md, exclude other doc files from the diff to avoid noise:
```bash
git diff <hash> HEAD -- src/ config/ scripts/ package.json
```

### Step 3 — Analyze changes per doc

Read the current content of each doc file, then review the diff to identify:

**For AGENTS.md / CLAUDE.md (Project Structure section):**
- New modules or files in `src/lib/`, `src/config/`, `scripts/` → add or extend bullet
- Removed or renamed modules → remove or rename bullet
- New commands in `package.json` scripts → add to Commands section

**For AGENTS.md and CLAUDE.md (Design Context section):**
- Changes to theme system, OKLCH engine, color model, or design tokens → update Aesthetic Direction
- Changes to user-facing interaction model → update Users or Design Principles
- Skip this section if changes are purely structural (new files/modules with no UX impact)

**For README.md:**
- New user-visible features → add to the relevant feature section
- Changed controls (keyboard shortcuts, gestures) → update Controls section
- Internal implementation details (refactors, constants, store logic) → skip entirely
- Only include changes a player would notice or care about

**For test/README.md:**
- New test files → consider adding a `npx tsx test/<name>.test.ts` example if it covers a major, independently runnable test area
- New behavior categories under test → add to "When to Update Tests"
- New console error patterns from intentional error-path tests → add to "Expected Console Errors"

### Step 4 — Write the updates

Edit each doc file in place using the Edit tool. Make minimal, targeted edits — don't rewrite sections that are still accurate.

After all edits, confirm which files were updated and summarize each change in one line.

## Common Mistakes

- **Over-updating README.md** — Only include user-facing changes. Ignore new constants, refactored internals, renamed functions, or test infrastructure.
- **Forgetting AGENTS.md** — Every edit to CLAUDE.md must also be applied to AGENTS.md and vice versa. Never update one without the other.
- **Different hashes for AGENTS.md and CLAUDE.md** — Use the earlier (older) of the two hashes as the diff base so neither file misses any changes.
- **Diffing working tree instead of HEAD** — Always `git diff <hash> HEAD`, not `git diff <hash>` (which includes uncommitted changes).
- **Updating Design Context for structural changes** — Only update the Design Context section in CLAUDE.md / AGENTS.md when the UX/brand/design model itself changes, not just because new components were added.
- **Adding every new test file to the examples** — The `npx tsx` examples in test/README.md are curated. Only add a file if it covers a major, independently useful test area (like share URL encoding or tier leveling).
