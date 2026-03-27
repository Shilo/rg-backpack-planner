import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const controlsSource = readFileSync(
    resolve("src/lib/sideMenuPages/SideMenuControlsPage.svelte"),
    "utf8",
);

if (!/onOpenAbout\?\.\("game-rules"\)/.test(controlsSource)) {
    throw new Error(
        'SideMenuControlsPage should open About with the "game-rules" scroll target.',
    );
}

const sideMenuSource = readFileSync(resolve("src/lib/SideMenu.svelte"), "utf8");

if (
    !/settingsPageRef\?\.navigateTo\?\.\("about",\s*[A-Za-z0-9_]+\)/.test(
        sideMenuSource,
    )
) {
    throw new Error(
        "SideMenu should forward the About scroll target into SideMenuSettingsPage.navigateTo.",
    );
}

if (/await loadTabPage\("settings"\);/.test(sideMenuSource)) {
    throw new Error(
        "SideMenu should not wait for the settings shell to lazy-load before switching to it for About navigation.",
    );
}

if (!/pendingSettingsNavigation/.test(sideMenuSource)) {
    throw new Error(
        "SideMenu should track a pending settings navigation while the settings shell is still lazy-loading.",
    );
}

const settingsPageSource = readFileSync(
    resolve("src/lib/sideMenuPages/SideMenuSettingsPage.svelte"),
    "utf8",
);

if (!/pendingAboutScrollTarget/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should track a pending About scroll target.",
    );
}

if (!/aboutScrollTarget=/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should pass the About scroll target to AboutSettingsPage.",
    );
}

if (!/aboutScrollTarget=\{currentPage === "about"[\s\S]*?!isTransitioning[\s\S]*?pendingAboutScrollTarget[\s\S]*?: null\}/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should wait until the page transition is finished before passing the About scroll target to AboutSettingsPage.",
    );
}

if (!/onAboutScrollHandled=/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should clear the pending About scroll target after AboutSettingsPage handles it.",
    );
}

const aboutPageSource = readFileSync(
    resolve("src/lib/sideMenuPages/AboutSettingsPage.svelte"),
    "utf8",
);

if (!/export let aboutScrollTarget/.test(aboutPageSource)) {
    throw new Error("AboutSettingsPage should accept an aboutScrollTarget prop.");
}

if (!/export let onAboutScrollHandled/.test(aboutPageSource)) {
    throw new Error(
        "AboutSettingsPage should accept an onAboutScrollHandled callback.",
    );
}

if (!/bind:this=\{gameRulesSectionElement\}/.test(aboutPageSource)) {
    throw new Error(
        "AboutSettingsPage should bind the Game Rules section element for scrolling.",
    );
}

if (!/scrollIntoView\(\{\s*block:\s*"start",\s*behavior:\s*"smooth"\s*\}\)/.test(aboutPageSource)) {
    throw new Error(
        "AboutSettingsPage should scroll the Game Rules section into view smoothly.",
    );
}
