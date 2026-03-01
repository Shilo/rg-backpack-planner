import { readable } from "svelte/store";
import packageInfo from "../../package.json";
import { readLocalStorage, writeLocalStorage } from "./storage";

const STORAGE_KEY = "rg-backpack-planner-latest-used-version";
const currentVersion = packageInfo.version ?? "unknown";

export function getStoredVersion(): string | null {
    return readLocalStorage(STORAGE_KEY);
}

function setStoredVersion(version: string): void {
    writeLocalStorage(STORAGE_KEY, version);
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
