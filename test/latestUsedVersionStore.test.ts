import { getVersionUpgradeState } from "../src/lib/latestUsedVersionStore.ts";

function assertEqual(actual: unknown, expected: unknown, message: string): void {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        throw new Error(`${message}. Expected ${expectedJson}, got ${actualJson}`);
    }
}

assertEqual(
    getVersionUpgradeState(null, "0.4.17"),
    {
        hasVersionChange: true,
        shouldShowUpdatedToast: false,
    },
    "First load should mark the current version without showing an upgrade toast",
);

assertEqual(
    getVersionUpgradeState("0.4.16", "0.4.17"),
    {
        hasVersionChange: true,
        shouldShowUpdatedToast: true,
    },
    "Upgrading from an older version should request the updated-version toast",
);

assertEqual(
    getVersionUpgradeState("0.4.17", "0.4.17"),
    {
        hasVersionChange: false,
        shouldShowUpdatedToast: false,
    },
    "Reopening the same version should do nothing",
);
