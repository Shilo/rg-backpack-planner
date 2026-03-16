import { getStoredVersion, getCurrentVersion } from "../latestUsedVersionStore";
import { setItem } from "../storage";

export type Migration = {
    toVersion: string;
    run: () => void;
};

const MIGRATIONS: Migration[] = [
    {
        toVersion: "1.0",
        run: () => {
            setItem("onboarding-seen", "false");
        },
    },
];

/**
 * Run version migrations synchronously. Call as the first step in main.ts.
 * When stored version differs from current version, runs every migration whose
 * toVersion equals currentVersion. Does not call markVersionAsSeen() — App.svelte
 * does that after runInitialization so the "updated" toast can still show.
 */
export function runMigrations(): void {
    const stored = getStoredVersion();
    const current = getCurrentVersion();
    if (stored === current || current === "unknown") return;

    for (const m of MIGRATIONS) {
        if (m.toVersion === current) {
            m.run();
        }
    }
}
