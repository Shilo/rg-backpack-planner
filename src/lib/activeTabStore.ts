import { writable } from "svelte/store";
import { readLocalStorage, writeLocalStorage } from "./storage";

const STORAGE_KEY = "rg-backpack-planner-active-tab-id";
const DEFAULT_TAB_ID = "guardian";

function getStoredActiveTabId(): string {
    const stored = readLocalStorage(STORAGE_KEY);
    if (stored) {
        return stored;
    }
    return DEFAULT_TAB_ID;
}

function setStoredActiveTabId(tabId: string): void {
    writeLocalStorage(STORAGE_KEY, tabId);
}

// Create writable store that syncs with localStorage
function createActiveTabStore() {
    const { subscribe, set, update } = writable<string>(getStoredActiveTabId());

    return {
        subscribe,
        set: (value: string) => {
            setStoredActiveTabId(value);
            set(value);
        },
        update: (fn: (value: string) => string) => {
            update((current) => {
                const next = fn(current);
                setStoredActiveTabId(next);
                return next;
            });
        },
    };
}

export const activeTabId = createActiveTabStore();

// Helper function for direct access without subscribing
export function getActiveTabId(): string {
    return getStoredActiveTabId();
}
