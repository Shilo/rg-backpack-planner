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

### 4) Draft the new section

Group changes into three categories and write short, benefit-focused bullets:

- **New** — Features or capabilities that **did not exist in any previous release.** Cross-check each candidate against the previous notes. If a similar feature was already mentioned (even with different wording), it belongs in Improved, not New.
- **Improved** — Enhancements, iterations, or refinements to features that already exist. This includes adding new functionality to an existing feature (e.g., adding keyboard navigation to an existing tab system).
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
-# Changes since <from-version>

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

### 7) Present the draft

Show the user the new section you prepended so they can review and request edits before committing.
