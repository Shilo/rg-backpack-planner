import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mainPath = resolve("src/main.ts");
const mainSource = readFileSync(mainPath, "utf8");

if (!/navigator\.serviceWorker\s*\.getRegistration\(\)/.test(mainSource)) {
    throw new Error(
        "main.ts should inspect the active service worker registration for update lifecycle events.",
    );
}

if (!/updatefound/.test(mainSource)) {
    throw new Error(
        "main.ts should listen for service worker updatefound so update feedback can appear early.",
    );
}

if (!/showToast\(\s*tr\("toast\.updatingToast"\)/.test(mainSource)) {
    throw new Error(
        "main.ts should show a localized updating toast when a service worker update starts.",
    );
}

if (
    !/handleControllerChange\s*=\s*\(\)\s*=>\s*\{\s*if\s*\(!hadController\)\s*\{\s*return;\s*\}\s*showUpdatingToast\(\);\s*window\.location\.reload\(\);\s*\};/s.test(
        mainSource,
    )
) {
    throw new Error(
        "main.ts should show updating toast and then reload immediately on controllerchange.",
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
