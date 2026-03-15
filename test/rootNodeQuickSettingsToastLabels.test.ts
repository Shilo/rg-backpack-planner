import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/lib/RootNodeQuickSettings.svelte");
const source = readFileSync(sourcePath, "utf8");

if (
    !/function showSettingToast\(settingLabel: string, valueLabel: string\) \{\s*showToast\(`\$\{settingLabel\}: \$\{valueLabel\}`\);\s*\}/m.test(
        source,
    )
) {
    throw new Error(
        "RootNodeQuickSettings should format toast messages with the setting label prefixed before the selected value.",
    );
}

if (
    !/showSettingToast\(clickActionLabel, label\);/.test(source)
) {
    throw new Error(
        "RootNodeQuickSettings primary-action toasts should be prefixed with the current setting label.",
    );
}

if (
    !/showSettingToast\(\$t\("settings\.nodeLevelBehavior"\), label\);/.test(
        source,
    )
) {
    throw new Error(
        "RootNodeQuickSettings node-level-behavior toasts should be prefixed with the setting label.",
    );
}
