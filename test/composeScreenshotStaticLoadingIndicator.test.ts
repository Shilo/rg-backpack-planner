import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/lib/ComposeScreenshotContent.svelte");
const source = readFileSync(sourcePath, "utf8");

if (!/ImageIcon/.test(source)) {
    throw new Error(
        "ComposeScreenshotContent should render a static image/loading icon while screenshots are generating.",
    );
}

if (!/class="compose-loading"/.test(source)) {
    throw new Error(
        "ComposeScreenshotContent should render a dedicated compose-loading container while isLoading is true.",
    );
}

if (!/\$t\("compose\.loading"\)/.test(source)) {
    throw new Error(
        "ComposeScreenshotContent loading UI should display localized compose.loading text.",
    );
}

