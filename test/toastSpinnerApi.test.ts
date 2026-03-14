import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const toastPath = resolve("src/lib/toast.ts");
const toastSource = readFileSync(toastPath, "utf8");

if (!/showSpinner:\s*boolean/.test(toastSource)) {
    throw new Error("Toast should expose a boolean showSpinner property.");
}

if (!/showIcon:\s*boolean/.test(toastSource)) {
    throw new Error("Toast should expose a boolean showIcon property.");
}

if (!/showSpinner:\s*options\?\.showSpinner\s*\?\?\s*false/.test(toastSource)) {
    throw new Error("showToast should default showSpinner to false.");
}

if (!/showIcon:\s*options\?\.showIcon\s*\?\?\s*true/.test(toastSource)) {
    throw new Error("showToast should default showIcon to true.");
}

const toastsComponentPath = resolve("src/lib/Toasts.svelte");
const toastsComponentSource = readFileSync(toastsComponentPath, "utf8");

if (!/\{#if toast\.showIcon\}/.test(toastsComponentSource)) {
    throw new Error("Toasts should render the icon only when toast.showIcon is true.");
}

if (!/\{#if toast\.showSpinner\}/.test(toastsComponentSource)) {
    throw new Error(
        "Toasts should render the loading spinner only when toast.showSpinner is true.",
    );
}

if (!/toast__spinner/.test(toastsComponentSource)) {
    throw new Error("Toasts should define a dedicated spinner element.");
}

const mainPath = resolve("src/main.ts");
const mainSource = readFileSync(mainPath, "utf8");

if (!/showToast\(\s*tr\("toast\.updatingToast"\),\s*\{[\s\S]*durationMs:\s*0,[\s\S]*showSpinner:\s*true,[\s\S]*\}\s*\)/.test(mainSource)) {
    throw new Error(
        "main.ts should opt the Updating toast into the infinite loading spinner.",
    );
}
