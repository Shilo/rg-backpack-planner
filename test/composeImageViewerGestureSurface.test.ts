import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const composePath = resolve("src/lib/ComposeScreenshotContent.svelte");
const composeSource = readFileSync(composePath, "utf8");

if (
    !/<ImageViewer[\s\S]*?>[\s\S]*class="compose-tools"[\s\S]*class="compose-fabs"[\s\S]*<\/ImageViewer>/m.test(
        composeSource,
    )
) {
    throw new Error(
        "ComposeScreenshotContent should render its floating compose controls inside ImageViewer so pinch gestures use one shared touch surface.",
    );
}

if (!/data-image-viewer-gesture-ignore/.test(composeSource)) {
    throw new Error(
        "ComposeScreenshotContent should mark overlay controls so ImageViewer can ignore first-touch button presses while still allowing second-touch pinch tracking.",
    );
}
