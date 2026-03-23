import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treePhysicsSource = readFileSync(resolve("src/lib/treePhysics.ts"), "utf8");

if (!/function release[\s\S]*if\s*\(\s*prefersReducedMotion\(\)\s*\)\s*\{[\s\S]*samples\s*=\s*\[\];[\s\S]*onDone\?\.\(\);[\s\S]*return;/.test(treePhysicsSource)) {
    throw new Error(
        "treePhysics momentum release should short-circuit immediately when animations are disabled.",
    );
}

if (!/export function animateView[\s\S]*if\s*\(\s*durationMs\s*<=\s*0\s*\|\|\s*prefersReducedMotion\(\)\s*\)\s*\{[\s\S]*onUpdate\(\{\s*\.\.\.to\s*\}\);[\s\S]*onDone\?\.\(\);[\s\S]*return \(\) => \{\};/.test(treePhysicsSource)) {
    throw new Error(
        "treePhysics animateView() should apply the target state immediately when animations are disabled.",
    );
}

if (!/function chase[\s\S]*if\s*\(\s*prefersReducedMotion\(\)\s*\)\s*\{[\s\S]*cancel\(\);[\s\S]*onUpdate\(\{\s*\.\.\.newTarget\s*\}\);[\s\S]*return;/.test(treePhysicsSource)) {
    throw new Error(
        "treePhysics zoom chasing should bypass requestAnimationFrame when animations are disabled.",
    );
}

const nodeFlashSource = readFileSync(resolve("src/lib/NodeFlash.svelte"), "utf8");

if (!/import\s+\{\s*animationsDisabled\s*\}\s+from\s+"\.\/reduceMotionStore"/.test(nodeFlashSource)) {
    throw new Error("NodeFlash should read the shared animationsDisabled policy.");
}

if (!/\{#if flashKey > 0 && !\$animationsDisabled\}/.test(nodeFlashSource)) {
    throw new Error(
        "NodeFlash should skip rendering flash layers entirely when animations are disabled.",
    );
}

const treeSource = readFileSync(resolve("src/lib/Tree.svelte"), "utf8");

if (!/const showPulseOverlay = isEnergized && !\$animationsDisabled;/.test(treeSource)) {
    throw new Error(
        "Tree links should only render the pulsing base overlay when animations are enabled.",
    );
}

if (!/baseStrokeStyle:\s*showPulseOverlay\s*\?\s*getLinkBaseStrokeStyle\(to\.region\)\s*:\s*null/.test(treeSource)) {
    throw new Error(
        "Tree links should drop the extra base line when animations are disabled.",
    );
}

if (!/\$showLevelSplash && !prefersReducedMotion\(\)/.test(treeSource)) {
    throw new Error(
        "Tree level splashes should not render when animations are disabled.",
    );
}

const appCssSource = readFileSync(resolve("src/app.css"), "utf8");

if (!/html\.no-animations \.toast::after[\s\S]*animation:\s*toast-progress var\(--toast-duration, 3s\) linear forwards !important;/.test(appCssSource)) {
    throw new Error(
        "The no-animations root class should keep the toast progress bar animation running.",
    );
}

if (!/html\.no-animations \.node-flash,[\s\S]*html\.no-animations \.node-ring,[\s\S]*html\.no-animations \.level-splash[\s\S]*display:\s*none !important;/.test(appCssSource)) {
    throw new Error(
        "The no-animations root class should hide in-flight node flash and level splash effects instead of freezing them.",
    );
}

if (!/html\.no-animations \.tree-link-base[\s\S]*display:\s*none !important;[\s\S]*html\.no-animations \.tree-links \.tree-link\.active,[\s\S]*html\.no-animations \.tree-links \.tree-link\.maxed[\s\S]*stroke-dasharray:\s*none !important;/.test(appCssSource)) {
    throw new Error(
        "The no-animations root class should force energized tree links to render as solid lines with no base overlay.",
    );
}

const actionSheetSource = readFileSync(resolve("src/lib/ActionSheet.svelte"), "utf8");

if (!/:global\(html\.no-animations\) \.action-sheet__header,[\s\S]*:global\(html\.no-animations\) \.action-sheet__choice,[\s\S]*:global\(html\.no-animations\) :global\(\.action-sheet__cancel\)[\s\S]*opacity:\s*1;[\s\S]*animation:\s*none;[\s\S]*transform:\s*none;/.test(actionSheetSource)) {
    throw new Error(
        "ActionSheet should fully reveal its content when the app-level no-animations mode is active.",
    );
}

const onboardingCardSource = readFileSync(resolve("src/lib/onboarding/OnboardingCard.svelte"), "utf8");

if (!/:global\(html\.no-animations\) \.onboarding-card[\s\S]*animation:\s*none;[\s\S]*opacity:\s*1;/.test(onboardingCardSource)) {
    throw new Error(
        "Onboarding cards should fully reveal themselves when the app-level no-animations mode is active.",
    );
}

const sideMenuSource = readFileSync(resolve("src/lib/SideMenu.svelte"), "utf8");

if (!/let animateContentIn = false;/.test(sideMenuSource)) {
    throw new Error(
        "SideMenu should track whether the current content mount should run its enter animation.",
    );
}

if (!/class:animate-content-in=\{animateContentIn\}/.test(sideMenuSource)) {
    throw new Error(
        "SideMenu should drive content entry animation from an explicit one-shot class.",
    );
}

if (!/\.side-menu__content-inner\.animate-content-in > :global\(\*\)\s*\{[\s\S]*animation:\s*side-menu-item-in/.test(sideMenuSource)) {
    throw new Error(
        "SideMenu content should only animate in while the one-shot animate-content-in class is active.",
    );
}

if (/\.side-menu\.open \.side-menu__content-inner > :global\(\*\)\s*\{[\s\S]*animation:\s*side-menu-item-in/.test(sideMenuSource)) {
    throw new Error(
        "SideMenu should not tie the content entry animation directly to the persistent .open state.",
    );
}

const appTitleDisplaySource = readFileSync(resolve("src/lib/AppTitleDisplay.svelte"), "utf8");

if (!/import\s+\{\s*prefersNoAnimations\s*\}\s+from\s+"\.\/reduceMotionStore"/.test(appTitleDisplaySource)) {
    throw new Error("AppTitleDisplay should read the shared no-animation policy.");
}

if (!/if\s*\(\s*prefersNoAnimations\(\)\s*\)\s*\{[\s\S]*hideForever\s*=\s*true;[\s\S]*return;/.test(appTitleDisplaySource)) {
    throw new Error(
        "AppTitleDisplay should hide immediately instead of waiting on an animationend when animations are disabled.",
    );
}

console.log("reduceMotionRegressionGuards: all tests passed");
