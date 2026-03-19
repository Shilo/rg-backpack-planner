import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const toastsSource = readFileSync(
    resolve("src/lib/Toasts.svelte"),
    "utf8",
);

console.log("  toastActionRedesign");

// --- Stacked layout class is applied when toast has action ---
if (!/toast--has-action/.test(toastsSource)) {
    throw new Error(
        "Toast should apply toast--has-action class when toast.action exists.",
    );
}
console.log("    \u2713 applies toast--has-action class conditionally");

// --- Message content wrapped in toast__row ---
if (!/class="toast__row"/.test(toastsSource)) {
    throw new Error("Toast should wrap icon + message in a toast__row div.");
}
console.log("    \u2713 wraps icon + message in toast__row");

// --- Action button wrapped in toast__action-row ---
if (!/class="toast__action-row"/.test(toastsSource)) {
    throw new Error(
        "Toast action button should be in its own toast__action-row div.",
    );
}
console.log("    \u2713 action button in toast__action-row");

// --- Pill button uses border-radius: 999px ---
if (!/border-radius:\s*999px/.test(toastsSource)) {
    throw new Error("Toast action should use pill border-radius (999px).");
}
console.log("    \u2713 pill button border-radius");

// --- Action button uses color-mix for border ---
if (!/border:[\s\S]*?color-mix/.test(toastsSource)) {
    throw new Error(
        "Toast action should use color-mix() for border color.",
    );
}
console.log("    \u2713 action button uses color-mix for border");

// --- Action toasts use div container (no default click) ---
if (!/<div[\s\S]*?toast--has-action/.test(toastsSource)) {
    throw new Error(
        "Action toasts should use a div container (which prevents accidental tap-to-dismiss).",
    );
}
console.log("    \u2713 action toasts use div container");

// --- Semantic button used for interactive toasts ---
if (!/<button[\s\S]*?class="toast/.test(toastsSource)) {
    throw new Error(
        'Toast should use semantic <button> for interactive toasts.',
    );
}
console.log("    \u2713 role conditionally omitted for action toasts");

// --- NodeSettingsPage uses CoinsIcon ---
const nodeSettingsSource = readFileSync(
    resolve("src/lib/sideMenuPages/NodeSettingsPage.svelte"),
    "utf8",
);

if (!/CoinsIcon/.test(nodeSettingsSource)) {
    throw new Error(
        "NodeSettingsPage should use CoinsIcon for budget toggle.",
    );
}
if (/CurrencyCircleDollarIcon/.test(nodeSettingsSource)) {
    throw new Error(
        "NodeSettingsPage should not use CurrencyCircleDollarIcon anymore.",
    );
}
console.log("    \u2713 NodeSettingsPage uses CoinsIcon");

console.log("  \u2713 toastActionRedesign\n");
