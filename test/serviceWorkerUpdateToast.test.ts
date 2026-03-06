import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const modulePath = resolve("src/lib/serviceWorkerAutoUpdate.ts");
let moduleSource = "";
try {
    moduleSource = readFileSync(modulePath, "utf8");
} catch (e) {
    throw new Error(`serviceWorkerAutoUpdate module not found at ${modulePath}.`);
}

if (!/navigator\.serviceWorker\s*\.getRegistration\(\)/.test(moduleSource)) {
    throw new Error(
        "serviceWorkerAutoUpdate should inspect the active service worker registration for update lifecycle events.",
    );
}

if (!/controllerchange/.test(moduleSource)) {
    throw new Error(
        "serviceWorkerAutoUpdate should listen for controllerchange.",
    );
}

if (!/statechange/.test(moduleSource)) {
    throw new Error(
        "serviceWorkerAutoUpdate should listen for statechange on potential installing workers.",
    );
}

if (!/if\s*\(!hadController\)\s*return;/.test(moduleSource)) {
    throw new Error(
        "serviceWorkerAutoUpdate should preserve the hadController guard to avoid reloads on first install.",
    );
}

const mainPath = resolve("src/main.ts");
const mainSource = readFileSync(mainPath, "utf8");
if (!/toast\.updatingToast/.test(mainSource)) {
    throw new Error(
        "main.ts should show a localized updating toast when a service worker update starts.",
    );
}

const localePaths = [
    resolve("src/locales/en.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
];

for (const localePath of localePaths) {
    const localeSource = readFileSync(localePath, "utf8");
    if (!/"updatingToast"\s*:/.test(localeSource)) {
        throw new Error(`${localePath}: toast.updatingToast translation is required.`);
    }
}
