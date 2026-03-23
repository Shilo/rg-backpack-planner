import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const performanceSectionPath = resolve(
    "src/lib/sideMenuPages/SystemInfoPerformanceSection.svelte",
);
const performanceModulePath = resolve(
    "src/lib/sideMenuPages/systemInfoPerformance.ts",
);
const debugInfoSource = readFileSync(
    resolve("src/lib/sideMenuPages/DebugInfoSection.svelte"),
    "utf8",
);
const performanceSectionSource = readFileSync(performanceSectionPath, "utf8");
const performanceModuleSource = readFileSync(performanceModulePath, "utf8");

if (!/import SystemInfoPerformanceSection from "\.\/SystemInfoPerformanceSection\.svelte";/.test(debugInfoSource)) {
    throw new Error(
        "DebugInfoSection should render the performance stats through a dedicated component.",
    );
}

if (!/import \{\s*formatFps,\s*startFpsMonitor\s*\} from "\.\/systemInfoPerformance";/.test(debugInfoSource)) {
    throw new Error(
        "DebugInfoSection should source FPS monitoring from a dedicated module.",
    );
}

if (!/label: \$t\("systemInfo\.currentFps"\)/.test(debugInfoSource)) {
    throw new Error(
        "DebugInfoSection should expose a Current FPS system info entry.",
    );
}

if (!/label: \$t\("systemInfo\.averageFps"\)/.test(debugInfoSource)) {
    throw new Error(
        "DebugInfoSection should expose an Average FPS system info entry.",
    );
}

if (!/label: \$t\("systemInfo\.lowestFps"\)/.test(debugInfoSource)) {
    throw new Error(
        "DebugInfoSection should expose a Lowest FPS system info entry.",
    );
}

if (
    !/\{ title: \$t\("systemInfo\.sectionPerformance"\), items: performanceEntries \},[\s\S]*\{ title: \$t\("systemInfo\.sectionApp"\), items: appEntries \}/.test(
        debugInfoSource,
    )
) {
    throw new Error(
        "Copied system info should place the Performance section before App.",
    );
}

if (
    !/<SystemInfoPerformanceSection\s+entries=\{performanceEntries\}\s*\/>[\s\S]*?<SideMenuSection title=\{\$t\("systemInfo\.sectionApp"\)\}>/.test(
        debugInfoSource,
    )
) {
    throw new Error(
        "Rendered system info should place the extracted Performance section before App.",
    );
}

if (/requestAnimationFrame\(/.test(debugInfoSource)) {
    throw new Error(
        "DebugInfoSection should not keep the FPS requestAnimationFrame loop inline after extraction.",
    );
}

if (!/const FPS_UI_UPDATE_INTERVAL_MS = 250;/.test(performanceModuleSource)) {
    throw new Error(
        "The dedicated FPS module should throttle UI updates to a mobile-friendly interval.",
    );
}

if (!/const FPS_SAMPLE_WINDOW_MS = 5000;/.test(performanceModuleSource)) {
    throw new Error(
        "The dedicated FPS module should keep stats to a short rolling window.",
    );
}

if (!/requestAnimationFrame\(/.test(performanceModuleSource)) {
    throw new Error("The dedicated FPS module should sample FPS with requestAnimationFrame.");
}

if (!/cancelAnimationFrame\(/.test(performanceModuleSource)) {
    throw new Error("The dedicated FPS module should stop FPS sampling when it is destroyed.");
}

if (!/document\.visibilityState/.test(performanceModuleSource)) {
    throw new Error(
        "The dedicated FPS module should ignore hidden-tab sampling so background tabs do not skew stats.",
    );
}

if (!/export function startFpsMonitor/.test(performanceModuleSource)) {
    throw new Error("The dedicated FPS module should export startFpsMonitor.");
}

if (!/export function formatFps/.test(performanceModuleSource)) {
    throw new Error("The dedicated FPS module should export formatFps.");
}

if (!/SideMenuSection title=\{\$t\("systemInfo\.sectionPerformance"\)\}/.test(performanceSectionSource)) {
    throw new Error(
        "The dedicated performance component should render the Performance section header.",
    );
}

if (!/\{#each entries as entry,\s*index\}/.test(performanceSectionSource)) {
    throw new Error(
        "The dedicated performance component should render the provided performance entries.",
    );
}

if (!/let previousValues: string\[] = \[];/.test(performanceSectionSource)) {
    throw new Error(
        "The dedicated performance component should track previous displayed values for update cues.",
    );
}

if (!/let flashingIndices = new Set<number>\(\);/.test(performanceSectionSource)) {
    throw new Error(
        "The dedicated performance component should track which value rows are currently flashing.",
    );
}

if (!/class:value-flash=\{flashingIndices\.has\(index\)\}/.test(performanceSectionSource)) {
    throw new Error(
        "The dedicated performance component should apply a pulse class to the value text when it updates.",
    );
}

if (!/@keyframes value-update-flash/.test(performanceSectionSource)) {
    throw new Error(
        "The dedicated performance component should define a dedicated value pulse animation.",
    );
}

if (!/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none;/.test(performanceSectionSource)) {
    throw new Error(
        "The dedicated performance component should disable the pulse animation for reduced-motion users.",
    );
}

const localePaths = [
    resolve("src/locales/en.json"),
    resolve("src/locales/fr.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
];

const requiredKeys = [
    "sectionPerformance",
    "currentFps",
    "averageFps",
    "lowestFps",
];

for (const localePath of localePaths) {
    const localeData = JSON.parse(readFileSync(localePath, "utf8"));
    const systemInfo = localeData?.systemInfo;

    if (!systemInfo) {
        throw new Error(`${localePath}: systemInfo section is required.`);
    }

    for (const key of requiredKeys) {
        if (!systemInfo[key]) {
            throw new Error(`${localePath}: systemInfo.${key} translation is required.`);
        }
    }
}
