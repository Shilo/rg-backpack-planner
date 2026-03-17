import { getStoredVersion, getCurrentVersion } from "../latestUsedVersionStore";
import { removeItem, setItem } from "../storage";

export type Migration = {
    toVersion: string;
    run: () => void;
};

const MIGRATIONS: Migration[] = [
    {
        toVersion: "1.0",
        run: () => {
            // Onboarding was improved with more steps.
            // Users may not know how all controls work
            // so we show it again.
            setItem("onboarding-seen", "false");
        },
    },
    {
        toVersion: "1.0.4",
        run: () => {
            // Clear stale auto-persisted locale so svelte-whisper re-detects
            // from navigator.languages on next init. Fixes users stuck on "en"
            // despite browser preferring another supported locale (e.g. ja-JP).
            removeItem("locale");
        },
    },
];

/**
 * Compare two dotted version strings (e.g. "0.9", "1.0", "1.2").
 * Returns -1 if a < b, 0 if a === b, 1 if a > b.
 * "unknown" is treated as lowest.
 */
export function compareVersions(a: string, b: string): number {
    if (a === "unknown" && b === "unknown") return 0;
    if (a === "unknown") return -1;
    if (b === "unknown") return 1;
    const partsA = a.split(".").map((n) => parseInt(n, 10) || 0);
    const partsB = b.split(".").map((n) => parseInt(n, 10) || 0);
    const len = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < len; i++) {
        const na = partsA[i] ?? 0;
        const nb = partsB[i] ?? 0;
        if (na < nb) return -1;
        if (na > nb) return 1;
    }
    return 0;
}

/**
 * Run version migrations synchronously. Call as the first step in main.ts.
 * Runs every migration whose toVersion is strictly after the stored version
 * and at or before the current version (stored < toVersion <= current), in
 * version order. E.g. 0.9 → 1.2 runs 1.0 and 1.1; 1.2 → 1.3 runs only 1.3.
 * Does not call markVersionAsSeen() — App.svelte does that after
 * runInitialization so the "updated" toast can still show.
 */
export function runMigrations(): void {
    const stored = getStoredVersion();
    const current = getCurrentVersion();
    if (current === "unknown") return;
    // No stored version (first launch or key never set): treat as already on current, skip migrations.
    if (stored === null) return;
    if (compareVersions(stored, current) >= 0) return;

    const toRun = MIGRATIONS.filter(
        (m) =>
            compareVersions(m.toVersion, current) <= 0 &&
            compareVersions(stored, m.toVersion) < 0,
    ).sort((a, b) => compareVersions(a.toVersion, b.toVersion));

    for (const m of toRun) {
        m.run();
    }
}
