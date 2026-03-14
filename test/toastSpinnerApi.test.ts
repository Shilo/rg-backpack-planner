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

if (!/import Spinner from "\.\/Spinner\.svelte"/.test(toastsComponentSource)) {
    throw new Error("Toasts should import the shared Spinner component.");
}

if (!/<Spinner\b/.test(toastsComponentSource)) {
    throw new Error("Toasts should render the shared Spinner component.");
}

if (/toast__spinner/.test(toastsComponentSource)) {
    throw new Error("Toasts should stop defining an inline toast__spinner element.");
}

if (/toast-spinner/.test(toastsComponentSource)) {
    throw new Error("Toasts should stop owning the toast-spinner animation.");
}

const spinnerPath = resolve("src/lib/Spinner.svelte");
const spinnerSource = readFileSync(spinnerPath, "utf8");

if (!/export let size = /.test(spinnerSource)) {
    throw new Error("Spinner should expose a configurable size prop.");
}

if (!/export let thickness = /.test(spinnerSource)) {
    throw new Error("Spinner should expose a configurable thickness prop.");
}

if (!/export let tone(?::[^=]+)? = "default"/.test(spinnerSource)) {
    throw new Error("Spinner should expose a semantic tone prop.");
}

for (const removedProp of [
    "color",
    "trackColor",
    "label",
    "decorative",
    "className",
]) {
    if (new RegExp(`export let ${removedProp}\\b`).test(spinnerSource)) {
        throw new Error(`Spinner should not expose ${removedProp}.`);
    }
}

if (!/aria-hidden="true"/.test(spinnerSource)) {
    throw new Error("Spinner should keep aria-hidden static.");
}

if (/aria-label=/.test(spinnerSource)) {
    throw new Error("Spinner should not expose or set a custom aria-label.");
}

if (!/tone=\{toast\.tone === "negative" \? "negative" : "default"\}/.test(toastsComponentSource)) {
    throw new Error("Toasts should pass a semantic tone to Spinner.");
}

for (const removedToastProp of ["color=", "trackColor="]) {
    if (toastsComponentSource.includes(removedToastProp)) {
        throw new Error(`Toasts should not pass ${removedToastProp} to Spinner.`);
    }
}

const mainPath = resolve("src/main.ts");
const mainSource = readFileSync(mainPath, "utf8");

if (!/showToast\(\s*tr\("toast\.updatingToast"\),\s*\{[\s\S]*durationMs:\s*0,[\s\S]*showSpinner:\s*true,[\s\S]*\}\s*\)/.test(mainSource)) {
    throw new Error(
        "main.ts should opt the Updating toast into the infinite loading spinner.",
    );
}
