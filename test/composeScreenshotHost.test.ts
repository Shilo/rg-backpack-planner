import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const hostPath = resolve("src/lib/ComposeScreenshot.svelte");
const contentPath = resolve("src/lib/ComposeScreenshotContent.svelte");
const legacyStorePath = resolve("src/lib/composeScreenshotStore.ts");
const legacyControllerPath = resolve("src/lib/composeScreenshotController.ts");

if (!existsSync(contentPath)) {
    throw new Error(
        "Expected ComposeScreenshotContent.svelte to exist after host/content split",
    );
}

if (existsSync(legacyStorePath)) {
    throw new Error(
        "composeScreenshotStore.ts should be removed; host component should own open/close state",
    );
}

if (existsSync(legacyControllerPath)) {
    throw new Error(
        "composeScreenshotController.ts should be removed; host module script should own open/close state",
    );
}

const hostSource = readFileSync(hostPath, "utf8");

if (!/script\s+module/s.test(hostSource)) {
    throw new Error(
        "ComposeScreenshot host should use a module script to export open/close helpers",
    );
}

if (!/export function openComposeScreenshot\(\)/.test(hostSource)) {
    throw new Error(
        "ComposeScreenshot host should define openComposeScreenshot() in its module script",
    );
}

if (!/export function closeComposeScreenshot\(\)/.test(hostSource)) {
    throw new Error(
        "ComposeScreenshot host should define closeComposeScreenshot() in its module script",
    );
}

if (hostSource.includes("./composeScreenshotController")) {
    throw new Error(
        "ComposeScreenshot host should not import a separate composeScreenshotController module",
    );
}

if (!/import\s+\{\s*writable\s*\}\s+from "svelte\/store";/.test(hostSource)) {
    throw new Error(
        "ComposeScreenshot host should use writable from svelte/store for open-state coordination",
    );
}

if (!/writable\(false\)/.test(hostSource)) {
    throw new Error(
        "ComposeScreenshot host should initialize a writable(false) open state",
    );
}

if (!/import\("\.\/ComposeScreenshotContent\.svelte"\)/.test(hostSource)) {
    throw new Error(
        "ComposeScreenshot host should lazy-load ComposeScreenshotContent.svelte",
    );
}

if (!/let ComposeScreenshotContent:\s*any\s*=\s*null;/.test(hostSource)) {
    throw new Error(
        "ComposeScreenshot host should keep ComposeScreenshotContent typed as any to avoid eager type import references",
    );
}

if (hostSource.includes("subscribeComposeScreenshot")) {
    throw new Error(
        "ComposeScreenshot host should not use custom subscription helpers when writable is sufficient",
    );
}

if (!/\{#if \$isComposeScreenshotOpen && ComposeScreenshotContent\}/.test(hostSource)) {
    throw new Error(
        "ComposeScreenshot host should conditionally render content based on internal open state",
    );
}
