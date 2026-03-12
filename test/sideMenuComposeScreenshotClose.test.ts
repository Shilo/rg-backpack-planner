import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const settingsPagePath = resolve("src/lib/sideMenuPages/RootSettingsPage.svelte");
const settingsPageSource = readFileSync(settingsPagePath, "utf8");

if (!/ShareBuildButton[\s\S]*onComposeScreenshot=\{\(\) => onClose\?\.\(\)\}/s.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should wire ShareBuildButton onComposeScreenshot to onClose?.() so opening compose closes the side menu",
    );
}
