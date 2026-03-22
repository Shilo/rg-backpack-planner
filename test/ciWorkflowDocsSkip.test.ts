import assert from "node:assert";
import { readFileSync } from "node:fs";

const workflowSource = readFileSync(".github/workflows/static.yml", "utf8");

assert.match(
    workflowSource,
    /push:\s*\r?\n\s*branches:\s*\["main"\]\s*\r?\n\s*paths-ignore:/,
    "pushes to main should define paths-ignore so docs-only changes can skip CI",
);

assert.match(
    workflowSource,
    /-\s*"\*\*\/\*\.md"/,
    "workflow should ignore markdown-only pushes",
);

assert.match(
    workflowSource,
    /-\s*"\.skills\/\*\*"/,
    "workflow should ignore .skills-only pushes",
);

assert.doesNotMatch(
    workflowSource,
    /-\s*"src\/locales\/\*\*"/,
    "workflow should not ignore locale changes because they affect app behavior",
);

assert.doesNotMatch(
    workflowSource,
    /-\s*"src\/\*\*"/,
    "workflow should not ignore all src changes",
);

assert.doesNotMatch(
    workflowSource,
    /-\s*"scripts\/\*\*"/,
    "workflow should not ignore script changes",
);
