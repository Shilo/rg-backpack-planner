import { writable } from "svelte/store";

export type SideMenuTab = "statistics" | "settings" | "controls";

const STORAGE_KEY = "rg-backpack-planner-side-menu-active-tab";
const DEFAULT_TAB: SideMenuTab = "statistics";

function isValidTab(tab: string): tab is SideMenuTab {
    return tab === "statistics" || tab === "settings" || tab === "controls";
}

function getStoredActiveTab(): SideMenuTab {
    if (typeof window === "undefined") return DEFAULT_TAB;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && isValidTab(stored)) {
            return stored;
        }
    } catch {
        // localStorage not available, use default
    }
    return DEFAULT_TAB;
}

function setStoredActiveTab(tab: SideMenuTab): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, tab);
    } catch {
        // localStorage not available
    }
}

// Create writable store that syncs with localStorage
function createSideMenuActiveTabStore() {
    const { subscribe, set, update } = writable<SideMenuTab>(getStoredActiveTab());

    return {
        subscribe,
        set: (value: SideMenuTab) => {
            setStoredActiveTab(value);
            set(value);
        },
        update: (fn: (value: SideMenuTab) => SideMenuTab) => {
            update((current) => {
                const next = fn(current);
                setStoredActiveTab(next);
                return next;
            });
        },
    };
}

export const sideMenuActiveTab = createSideMenuActiveTabStore();

// Helper functions for direct access without subscribing
export function getActiveTab(): SideMenuTab {
    return getStoredActiveTab();
}

export function setActiveTab(tab: SideMenuTab): void {
    setStoredActiveTab(tab);
    sideMenuActiveTab.set(tab);
}
