---
name: release-notes
description: Update RELEASE_NOTES.md with user-facing changes since its last edit. Collects git history from the last commit that modified RELEASE_NOTES.md through HEAD, drafts grouped bullets (New, Improved, Fixed), and prepends the new section. Use this whenever the user asks to update release notes, refresh the changelog, add what's new, or write release notes for recent changes.
---

# Release Notes

Update `RELEASE_NOTES.md` by collecting all changes since the file was last modified, drafting user-facing notes, and prepending them to the top of the file.

## Workflow

### 1) Collect changes

Run the collection script from the repo root:

```bash
bash .skills/release-notes/scripts/collect_since_last_release_notes.sh
```

This outputs:
- **Meta** — anchor commit, version range, production URL, commit count
- **Commits** — hash, date, and subject for every commit in the range
- **Files Touched** — which files each commit added (A), modified (M), deleted (D), or renamed (R)
- **Previous Release Notes** — the current contents of `RELEASE_NOTES.md`

If there are no new commits since the last edit, stop and tell the user the notes are already up to date.

### 2) Cross-reference previous notes

Before triaging commits, read the **Previous Release Notes** section from the script output. Build a mental list of every feature and capability already mentioned — these are things that already exist in the app.

This step prevents a common mistake: commit messages like `feat: Implement onboarding system` look like new features, but if a previous release already said "Added a guided onboarding tutorial flow", the onboarding system is not new — it's being iterated on. The commit is adding code, but the *feature* already existed from the user's perspective.

The rule: **a feature can only be "Added" once across all release notes.** If any previous section already introduced a feature area, subsequent work on it is an improvement, not an addition.

### 3) Triage for user impact

Scan the commits and touched files. Identify changes that a player would notice or care about.

**Include:** new features, UI changes, behavior changes, noticeable bug fixes, performance improvements with visible impact.

**Exclude:** refactors, dependency bumps, CI/CD changes, developer tooling, internal logging, docs-only changes, test-only changes, build script tweaks.

If a change is ambiguous, include it only if it has a plausible user-visible effect. When in doubt, leave it out — brief and accurate is better than comprehensive and noisy.

#### Use file paths to determine feature scope

Commit messages are often vague or overly broad. The file paths tell the truth about what a commit actually touches. Use the directory structure to understand which feature area a change belongs to:

- Files under `buildImageExport/` → screenshot/image export feature
- Files under `onboarding/` → onboarding feature
- Files under `sideMenuPages/` → settings feature
- Files under `locales/` → localization (supporting, not a feature on its own)
- Files under `modals/` → modal dialogs

When a commit message says something generic like "Add tech crystal tracker" but the files are all in `buildImageExport/`, the change is scoped to screenshot exports — describe it that way.

#### Use file status (A/M/D) to judge new vs. improved vs. fixed

The file status is a strong signal for categorization:

- **A (added)** — A new file was created. If it's a new component (e.g., `A src/lib/SomeNewFeature.svelte`), this is evidence of a genuinely new feature.
- **M (modified)** — An existing file was changed. This is evidence of an improvement or fix to an existing feature, not a new one. A commit that only modifies files is almost never a "New" feature. Use the commit message and context to distinguish improvements from fixes — a `fix:` commit that modifies a file is a bug fix, while a `feat:` commit that modifies a file is an improvement.
- **D (deleted)** — A file was removed. Usually part of a refactor or cleanup.

Don't rely solely on commit message prefixes like `feat:` or `fix:` — but do use them as supporting evidence alongside the file status and paths.

### 4) Draft the new section

Group changes into three categories and write short, benefit-focused bullets:

- **New** — Features or capabilities that **did not exist in any previous release.** Cross-check each candidate against the previous notes and the file status. A feature is only "New" if (a) it wasn't mentioned in any prior release notes, AND (b) its primary files were added (A), not just modified (M). If either condition fails, it belongs in Improved.
- **Improved** — Enhancements, iterations, or refinements to features that already exist. This includes adding new functionality to an existing feature (e.g., adding keyboard navigation to an existing tab system), and any work on features already mentioned in previous notes.
- **Fixed** — Bug fixes users would have encountered.
- **Summary** — A 1-2 sentence overview of the release's main impact. Focus on the value provided and avoid filler phrases like "This update introduces..." or "New in this version...". (e.g., "Simplified tree planning with advanced keyboard controls and a redesigned node menu for faster, more precise interactions.").

Omit any category (New, Improved, Fixed) that has no entries. Always include the Summary.

#### Writing style

- Start each bullet with a past-tense verb: "Added", "Improved", "Fixed", "Upgraded", "Refined".
- Avoid starting summaries with filler phrases like "This update introduces", "This version adds", or "We've added". Jump straight to the benefit or the core feature.
- One sentence per bullet, plain language, no jargon.
- Describe the benefit to the player, not the implementation detail.
- No ticket IDs, file paths, component names, or internal codenames.

#### Section format

Use this exact structure. The production URL comes from the collection script's Meta output. The "from" version is the version at the anchor commit; the "to" version is the current version from `package.json`.

```
# What's New in <to-version>
-# Changes since <from-version>
<production-url>

<1-2 sentence overview.>

## New
- Added ...

## Improved
- Improved ...

## Fixed
- Fixed ...
```

### 5) Validate

Before writing the file, verify:
- Every bullet maps to a real commit in the range.
- No "New" bullet describes a feature already mentioned in previous release notes. If it does, move it to "Improved" or remove it.
- No duplicate bullets describing the same change.
- No internal jargon or file paths leaked into the text.
- Categories with no entries are omitted.

### 6) Prepend to RELEASE_NOTES.md

Read the current `RELEASE_NOTES.md`. Insert the new section at the very top, followed by a `---` separator, then the existing content. The result should look like:

```
# What's New in v0.5.18
-# Changes since v0.5.12
https://rgbp.app

**Summary**: <1-2 sentence overview.>

## New
- ...

## Improved
- ...

## Fixed
- ...

---

# What's New in v0.5.12
-# Changes since v0.4.15
https://rgbp.app

## New
- ...
...
```

### 7) Present the draft

Show the user the new section you prepended so they can review and request edits before committing.
