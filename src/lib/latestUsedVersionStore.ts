import { readable } from "svelte/store";
import packageInfo from "../../package.json";
import { getItem, setItem } from "./storage";

const currentVersion = packageInfo.version ?? "unknown";

export function getStoredVersion(): string | null {
    try {
        return getItem("latest-used-version");
    } catch {
        return null;
    }
}

function setStoredVersion(version: string): void {
    try {
        setItem("latest-used-version", version);
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
