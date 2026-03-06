import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const modulePath = resolve("src/lib/serviceWorkerAutoUpdate.ts");
let moduleSource = "";
try {
    moduleSource = readFileSync(modulePath, "utf8");
} catch (e) {
    throw new Error(`serviceWorkerAutoUpdate module not found at ${modulePath}.`);
}

if (!/export function initServiceWorkerAutoUpdate/.test(moduleSource)) {
    throw new Error("serviceWorkerAutoUpdate module should export initServiceWorkerAutoUpdate.");
}

if (!/controllerchange/.test(moduleSource)) {
    throw new Error("serviceWorkerAutoUpdate module should listen for controllerchange.");
}

if (!/window\.location\.reload\(\)/.test(moduleSource)) {
    throw new Error("serviceWorkerAutoUpdate module should reload when updated SW takes control.");
}

if (!/window\.addEventListener\(\s*"focus"/.test(moduleSource)) {
    throw new Error("serviceWorkerAutoUpdate should check for updates on window focus.");
}

if (!/document\.addEventListener\(\s*"visibilitychange"/.test(moduleSource)) {
    throw new Error("serviceWorkerAutoUpdate should check for updates on visibilitychange.");
}

if (!/registration\.update\(\)/.test(moduleSource)) {
    throw new Error("serviceWorkerAutoUpdate should trigger registration.update on foreground checks.");
}

if (!/inFlight|isCheckingForUpdate|isChecking/.test(moduleSource)) {
    throw new Error("serviceWorkerAutoUpdate should dedupe simultaneous update checks.");
}

const appSource = readFileSync(resolve("src/App.svelte"), "utf8");
if (!/toast\.updatedVersionToast/.test(appSource)) {
    throw new Error("App should continue to show toast.updatedVersionToast for version upgrades.");
}
