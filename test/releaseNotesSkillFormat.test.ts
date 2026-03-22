import assert from "node:assert";
import { readFileSync } from "node:fs";

// Older release-note sections predate the overview-paragraph convention.
// This test intentionally allows sections with no overview at all and only
// guards against labeled overview prefixes when an overview is present.
const skillSource = readFileSync(".skills/release-notes/SKILL.md", "utf8");
const releaseNotesSource = readFileSync("RELEASE_NOTES.md", "utf8");

assert.match(
    skillSource,
    /plain paragraph/i,
    "release-notes skill should require an unlabeled overview paragraph",
);

assert.match(
    skillSource,
    /do not label/i,
    "release-notes skill should explicitly forbid overview labels",
);

assert.doesNotMatch(
    skillSource,
    /\*\*Summary\*\*:/,
    "release-notes skill should not teach the **Summary**: format",
);

assert.doesNotMatch(
    releaseNotesSource,
    /\*\*Summary\*\*:/,
    "RELEASE_NOTES.md should not include the **Summary**: label",
);

assert.doesNotMatch(
    releaseNotesSource,
    /\*\*概要\*\*:/,
    "Translated release notes should not use a labeled overview paragraph either",
);
