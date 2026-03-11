---
name: app-store-changelog
description: Create user-facing App Store release notes by collecting and summarizing all user-impacting changes since the last git tag (or a specified ref). Use when asked to generate a comprehensive release changelog, App Store "What's New" text, or release notes based on git history or tags.
---

# App Store Changelog

## Overview
Generate a comprehensive, user-facing changelog from git history since the last tag, then translate commits into clear App Store release notes.

## Workflow

### 1) Collect changes
- Run the collect script from the repo root to gather commits and touched files.
  - **Unix / Git Bash / WSL:** `.skills/app-store-changelog/scripts/collect_release_changes.sh`
  - **Windows PowerShell:** `.skills/app-store-changelog/scripts/collect_release_changes.ps1`
- If needed, pass a specific tag or ref: add args like `v1.2.3 HEAD` after the script path.
- If no tags exist, the script falls back to full history.

### 2) Triage for user impact
- Scan commits and files to identify user-visible changes.
- Group changes by theme (New, Improved, Fixed) and deduplicate overlaps.
- Drop internal-only work (build scripts, refactors, dependency bumps, CI).

### 3) Draft App Store notes
- Write short, benefit-focused bullets for each user-facing change.
- Use clear verbs and plain language; avoid internal jargon.
- Prefer 5 to 10 bullets unless the user requests a different length.

### 4) Validate
- Ensure every bullet maps back to a real change in the range.
- Check for duplicates and overly technical wording.
- Ask for clarification if any change is ambiguous or possibly internal-only.

## Output Format
- Title (optional): "What's New" or product name + version.
- Bullet list only; one sentence per bullet.
- Stick to storefront limits if the user provides one.

## Resources
- `.skills/app-store-changelog/scripts/collect_release_changes.sh`: Collect commits and touched files since last tag (Unix/Git Bash/WSL).
- `.skills/app-store-changelog/scripts/collect_release_changes.ps1`: Same for Windows PowerShell.
- `.skills/app-store-changelog/references/release-notes-guidelines.md`: Language, filtering, and QA rules for App Store notes.
