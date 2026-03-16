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
- **Files Touched** — which files each commit modified

If there are no new commits since the last edit, stop and tell the user the notes are already up to date.

### 2) Triage for user impact

Scan the commits and touched files. Identify changes that a player would notice or care about.

**Include:** new features, UI changes, behavior changes, noticeable bug fixes, performance improvements with visible impact.

**Exclude:** refactors, dependency bumps, CI/CD changes, developer tooling, internal logging, docs-only changes, test-only changes, build script tweaks.

If a change is ambiguous, include it only if it has a plausible user-visible effect. When in doubt, leave it out — brief and accurate is better than comprehensive and noisy.

### 3) Draft the new section

Group changes into three categories and write short, benefit-focused bullets:

- **New** — Features or capabilities that didn't exist before.
- **Improved** — Enhancements to existing features (performance, UX, visuals).
- **Fixed** — Bug fixes users would have encountered.

Omit any category that has no entries. Prefer 5-10 bullets total unless the release warrants more.

#### Writing style

- Start each bullet with a past-tense verb: "Added", "Improved", "Fixed", "Upgraded", "Refined".
- One sentence per bullet, plain language, no jargon.
- Describe the benefit to the player, not the implementation detail.
- No ticket IDs, file paths, component names, or internal codenames.

#### Section format

Use this exact structure. The production URL comes from the collection script's Meta output. The "from" version is the version at the anchor commit; the "to" version is the current version from `package.json`.

```
# What's New in <to-version>
<production-url>
*Changes since <from-version>*

## New
- Added ...

## Improved
- Improved ...

## Fixed
- Fixed ...
```

### 4) Validate

Before writing the file, verify:
- Every bullet maps to a real commit in the range.
- No duplicate bullets describing the same change.
- No internal jargon or file paths leaked into the text.
- Categories with no entries are omitted.

### 5) Prepend to RELEASE_NOTES.md

Read the current `RELEASE_NOTES.md`. Insert the new section at the very top, followed by a `---` separator, then the existing content. The result should look like:

```
# What's New in v0.5.18
https://rgbp.app
*Changes since v0.5.12*

## New
- ...

## Improved
- ...

## Fixed
- ...

---

# What's New in v0.5.12
https://rgbp.app
*Changes since v0.4.15*

## New
- ...
...
```

### 6) Present the draft

Show the user the new section you prepended so they can review and request edits before committing.
