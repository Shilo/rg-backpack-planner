import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src/App.svelte");
const appSource = readFileSync(appPath, "utf8");

if (appSource.includes('import { shareBuildAsImage } from "./lib/buildData/share";')) {
    throw new Error(
        "App.svelte still imports shareBuildAsImage; F9 should open ComposeScreenshot instead of automating capture",
    );
}

if (!/import ComposeScreenshot[\s\S]*from "\.\/lib\/ComposeScreenshot\.svelte";/.test(appSource)) {
    throw new Error(
        "App.svelte should import ComposeScreenshot for the F9 hotkey flow",
    );
}

if (!/import ComposeScreenshot,\s*\{\s*openComposeScreenshot\s*,?\s*\}\s*from "\.\/lib\/ComposeScreenshot\.svelte";/s.test(appSource)) {
    throw new Error(
        "App.svelte should import openComposeScreenshot from ComposeScreenshot.svelte",
    );
}

if (appSource.includes("let composeScreenshotOpen = false;")) {
    throw new Error(
        "App.svelte should not use a local compose screenshot flag anymore",
    );
}

if (!/else if \(e\.key === "F9"\)\s*\{\s*e\.preventDefault\(\);\s*openComposeScreenshot\(\);\s*\}/s.test(appSource)) {
    throw new Error(
        "Expected F9 hotkey branch to call openComposeScreenshot()",
    );
}

if (!/<ComposeScreenshot\s*\/>/.test(appSource)) {
    throw new Error(
        "Expected App.svelte to render ComposeScreenshot host directly",
    );
}

if (appSource.includes("{#if $isComposeScreenshotOpen}")) {
    throw new Error(
        "App.svelte should not gate ComposeScreenshot with an if-block; host should own that logic",
    );
}
