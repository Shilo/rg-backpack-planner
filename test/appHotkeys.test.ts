import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src/App.svelte");
const appSource = readFileSync(appPath, "utf8");

if (appSource.includes('import { shareBuildAsImage } from "./lib/buildData/share";')) {
    throw new Error(
        "App.svelte still imports shareBuildAsImage; F9 should open ComposeScreenshot instead of automating capture",
    );
}

if (!appSource.includes('import ComposeScreenshot from "./lib/ComposeScreenshot.svelte";')) {
    throw new Error(
        "App.svelte should import ComposeScreenshot for the F9 hotkey flow",
    );
}

if (!/else if \(e\.key === "F9"\)\s*\{\s*e\.preventDefault\(\);\s*composeScreenshotOpen = true;\s*\}/s.test(appSource)) {
    throw new Error(
        "Expected F9 hotkey branch to set composeScreenshotOpen = true",
    );
}

if (!/\{#if composeScreenshotOpen\}[\s\S]*<ComposeScreenshot[\s\S]*isOpen=\{composeScreenshotOpen\}/s.test(appSource)) {
    throw new Error(
        "Expected App.svelte to render ComposeScreenshot when composeScreenshotOpen is true",
    );
}
