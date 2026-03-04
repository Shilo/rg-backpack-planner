import { writable } from "svelte/store";
import { getItem, setItem } from "./storage";

const DEFAULT_TAB_ID = "guardian";

function getStoredActiveTabId(): string {
    try {
        const stored = getItem("active-tab-id");
        if (stored) {
            return stored;
        }
    } catch {
        // localStorage not available, use default
    }
    return DEFAULT_TAB_ID;
}

function setStoredActiveTabId(tabId: string): void {
    try {
        setItem("active-tab-id", tabId);
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
