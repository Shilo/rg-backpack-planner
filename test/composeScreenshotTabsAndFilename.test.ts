import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/lib/ComposeScreenshotContent.svelte");
const source = readFileSync(sourcePath, "utf8");
const filenameHelperPath = resolve("src/lib/composeFilename.ts");
const filenameHelperSource = readFileSync(filenameHelperPath, "utf8");

const allTabMatch = source.match(
    /\{\s*id:\s*"all"[\s\S]*?\}/,
);
if (!allTabMatch) {
    throw new Error(
        'ComposeScreenshotContent should define an "all" compose tab.',
    );
}

if (/icon\s*:/.test(allTabMatch[0])) {
    throw new Error(
        'ComposeScreenshotContent "all" tab should not include an icon.',
    );
}

if (!/activePresetName/.test(source)) {
    throw new Error(
        "ComposeScreenshotContent should use activePresetName for image filenames.",
    );
}

if (!/createComposeImageFilename/.test(source)) {
    throw new Error(
        "ComposeScreenshotContent should build screenshot filenames through createComposeImageFilename.",
    );
}

if (!/toLowerCase\(\)/.test(filenameHelperSource)) {
    throw new Error(
        "Compose screenshot filename helper should normalize filename segments to lowercase.",
    );
}

if (!/:global\(\.fullscreen-modal\s+\.tab-bar__tab-button:not\(\.active\)\)/.test(source)) {
    throw new Error(
        "ComposeScreenshotContent should override inactive tab button background style for fullscreen modal tabs.",
    );
}

if (!/background:\s*var\(--bg-modal,\s*var\(--surface\)\)/.test(source)) {
    throw new Error(
        "ComposeScreenshotContent inactive tab buttons should match the fullscreen modal background color.",
    );
}
