import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const shareButtonPath = resolve("src/lib/buttons/ShareBuildButton.svelte");
const shareButtonSource = readFileSync(shareButtonPath, "utf8");

if (shareButtonSource.includes('import ComposeScreenshot from "../ComposeScreenshot.svelte";')) {
    throw new Error(
        "ShareBuildButton should not directly import ComposeScreenshot; it should open the centralized modal",
    );
}

if (
    !shareButtonSource.includes(
        'import { openComposeScreenshot } from "../ComposeScreenshot.svelte";',
    )
) {
    throw new Error(
        "ShareBuildButton should import openComposeScreenshot from ComposeScreenshot.svelte",
    );
}

if (shareButtonSource.includes("let composeOpen = false;")) {
    throw new Error(
        "ShareBuildButton should not use local composeOpen state anymore",
    );
}

if (
    !/function handleComposeScreenshot\(\)\s*\{[\s\S]*closeShareMenu\(\);[\s\S]*openComposeScreenshot\(\);[\s\S]*\}/s.test(
        shareButtonSource,
    )
) {
    throw new Error(
        "Expected handleComposeScreenshot to call openComposeScreenshot()",
    );
}

if (!shareButtonSource.includes("onComposeScreenshot?.();")) {
    throw new Error(
        "Expected handleComposeScreenshot to invoke onComposeScreenshot?.() before opening compose",
    );
}

if (shareButtonSource.includes("<ComposeScreenshot")) {
    throw new Error(
        "ShareBuildButton should not render ComposeScreenshot directly",
    );
}
