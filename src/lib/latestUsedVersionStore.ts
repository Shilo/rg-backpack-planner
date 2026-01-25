import { readable } from "svelte/store";
import packageInfo from "../../package.json";

const STORAGE_KEY = "rg-backpack-planner-latest-used-version";
const currentVersion = packageInfo.version ?? "unknown";

function getStoredVersion(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

function setStoredVersion(version: string): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, version);
    } catch {
        // localStorage not available
    }
}

export const latestUsedVersion = readable<string | null>(getStoredVersion());

export function isNewVersion(): boolean {
    const storedVersion = getStoredVersion();
    return storedVersion !== currentVersion;
}

export function markVersionAsSeen(): void {
    setStoredVersion(currentVersion);
}
export function getCurrentVersion(): string {
    return currentVersion;
}
