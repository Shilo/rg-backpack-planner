import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appCssSource = readFileSync(resolve("src/app.css"), "utf8");

if (!/html\.no-animations[\s\S]*animation:\s*none !important;[\s\S]*transition:\s*none !important;/.test(appCssSource)) {
    throw new Error(
        "app.css should gate global animation and transition shutdown behind the html.no-animations class.",
    );
}

const appearanceSource = readFileSync(
    resolve("src/lib/sideMenuPages/AppearanceSettingsPage.svelte"),
    "utf8",
);

if (!/import\s+\{\s*animationsDisabled\s*\}\s+from\s+"\.\.\/reduceMotionStore"/.test(appearanceSource)) {
    throw new Error(
        "AppearanceSettingsPage should import the shared animationsDisabled policy.",
    );
}

if (!/transition:fade=\{\{\s*duration:\s*\$animationsDisabled\s*\?\s*0\s*:\s*150\s*\}\}/.test(appearanceSource)) {
    throw new Error(
        "AppearanceSettingsPage should make the theme icon fade instant when animations are disabled.",
    );
}

const treePhysicsSource = readFileSync(resolve("src/lib/treePhysics.ts"), "utf8");

if (!/import\s+\{\s*prefersNoAnimations\s*\}\s+from\s+"\.\/reduceMotionStore"/.test(treePhysicsSource)) {
    throw new Error(
        "treePhysics.ts should read the shared no-animation helper instead of querying reduced motion directly.",
    );
}

if (!/export function prefersReducedMotion\(\): boolean \{[\s\S]*return prefersNoAnimations\(\);[\s\S]*\}/.test(treePhysicsSource)) {
    throw new Error(
        "treePhysics prefersReducedMotion() should delegate to prefersNoAnimations().",
    );
}

const treeSource = readFileSync(resolve("src/lib/Tree.svelte"), "utf8");

if (!/import\s+\{\s*animationsDisabled\s*\}\s+from\s+"\.\/reduceMotionStore"/.test(treeSource)) {
    throw new Error("Tree.svelte should import animationsDisabled for mount fade behavior.");
}

if (!/in:fade=\{\{\s*duration:\s*\$animationsDisabled\s*\?\s*0\s*:\s*300\s*\}\}/.test(treeSource)) {
    throw new Error("Tree.svelte should make its mount fade instant when animations are disabled.");
}

const modalHostSource = readFileSync(resolve("src/lib/ModalHost.svelte"), "utf8");

if (!/import\s+\{\s*animationsDisabled\s*\}\s+from\s+"\.\/reduceMotionStore"/.test(modalHostSource)) {
    throw new Error("ModalHost should import animationsDisabled.");
}

if (!/transition:fade=\{\{\s*duration:\s*sheetSwipeDismissing\s*\|\|\s*\$animationsDisabled\s*\?\s*0\s*:\s*140\s*\}\}/.test(modalHostSource)) {
    throw new Error("ModalHost backdrop fade should become instant when animations are disabled.");
}

if (!/if\s*\(\$animationsDisabled\)\s*\{\s*return\s*\{\s*duration:\s*0\s*\};\s*\}/.test(modalHostSource)) {
    throw new Error("ModalHost shell transition should short-circuit to duration 0 when animations are disabled.");
}

const sideMenuSource = readFileSync(resolve("src/lib/SideMenu.svelte"), "utf8");

if (!/import\s+\{\s*animationsDisabled\s*\}\s+from\s+"\.\/reduceMotionStore"/.test(sideMenuSource)) {
    throw new Error("SideMenu should import animationsDisabled.");
}

if (!/transition:fade=\{\{\s*duration:\s*\$animationsDisabled\s*\?\s*0\s*:\s*200\s*\}\}/.test(sideMenuSource)) {
    throw new Error("SideMenu backdrop fade should become instant when animations are disabled.");
}

const settingsShellSource = readFileSync(
    resolve("src/lib/sideMenuPages/SideMenuSettingsPage.svelte"),
    "utf8",
);

if (!/import\s+\{\s*animationsDisabled\s*\}\s+from\s+"\.\.\/reduceMotionStore"/.test(settingsShellSource)) {
    throw new Error("SideMenuSettingsPage should import animationsDisabled.");
}

if (!/if\s*\(\$animationsDisabled\)\s*\{\s*onEnd\(\);\s*\}\s*else\s*\{/.test(settingsShellSource)) {
    throw new Error(
        "SideMenuSettingsPage should skip its animation wait path entirely when animations are disabled.",
    );
}

const toastsSource = readFileSync(resolve("src/lib/Toasts.svelte"), "utf8");

if (!/import\s+\{\s*prefersNoAnimations\s*\}\s+from\s+"\.\/reduceMotionStore"/.test(toastsSource)) {
    throw new Error("Toasts should import prefersNoAnimations for toast exit transitions.");
}

if (!/if\s*\(\s*suppressedExitIds\.has\(id\)\s*\|\|\s*prefersNoAnimations\(\)\s*\)\s*\{[\s\S]*return\s*\{\s*duration:\s*0\s*\};/.test(toastsSource)) {
    throw new Error(
        "Toasts should make the custom toast exit transition instant when animations are disabled.",
    );
}

const onboardingSource = readFileSync(
    resolve("src/lib/onboarding/OnboardingOverlay.svelte"),
    "utf8",
);

if (!/import\s+\{\s*animationsDisabled\s*\}\s+from\s+"\.\.\/reduceMotionStore"/.test(onboardingSource)) {
    throw new Error("OnboardingOverlay should import animationsDisabled.");
}

if (!/stepTransitionDuration\s*=\s*\$animationsDisabled\s*\?\s*0\s*:\s*220/.test(onboardingSource)) {
    throw new Error(
        "OnboardingOverlay should make step transitions instant when animations are disabled.",
    );
}

if (!/if\s*\(\$animationsDisabled\)\s*\{\s*onDismiss\(\);\s*\}/.test(onboardingSource)) {
    throw new Error(
        "OnboardingOverlay dismiss logic should skip the delay when animations are disabled.",
    );
}

console.log("reduceMotionRuntime: all tests passed");
