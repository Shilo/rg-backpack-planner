import { writable } from "svelte/store";

const STORAGE_KEY = "rg-backpack-planner-active-tab-id";
const DEFAULT_TAB_ID = "guardian";

function getStoredActiveTabId(): string {
    if (typeof window === "undefined") return DEFAULT_TAB_ID;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return stored;
        }
    } catch {
        // localStorage not available, use default
    }
    return DEFAULT_TAB_ID;
}

function setStoredActiveTabId(tabId: string): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, tabId);
    } catch {
        // localStorage not available
    }
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
