import { writable } from "svelte/store";
import { getItem, setItem } from "./storage";

export type SideMenuTab = "statistics" | "settings" | "controls";
const DEFAULT_TAB: SideMenuTab = "statistics";

function isValidTab(tab: string): tab is SideMenuTab {
    return tab === "statistics" || tab === "settings" || tab === "controls";
}

function getStoredActiveTab(): SideMenuTab {
    try {
        const stored = getItem("side-menu-active-tab");
        if (stored && isValidTab(stored)) {
            return stored;
        }
    } catch {
        // localStorage not available, use default
    }
    return DEFAULT_TAB;
}

function setStoredActiveTab(tab: SideMenuTab): void {
    try {
        setItem("side-menu-active-tab", tab);
    } catch {
        // localStorage not available
    }
}

// Create writable store that syncs with localStorage
function createSideMenuActiveTabStore() {
    const {
        subscribe,
        set: setWritable,
        update: updateWritable,
    } = writable<SideMenuTab>(getStoredActiveTab());

    return {
        subscribe,
        set: (value: SideMenuTab) => {
            setStoredActiveTab(value);
            setWritable(value);
        },
        setWithoutPersist: (value: SideMenuTab) => {
            // Set the store value without persisting to localStorage
            setWritable(value);
        },
        update: (fn: (value: SideMenuTab) => SideMenuTab) => {
            updateWritable((current) => {
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

export function setActiveTabWithoutPersist(tab: SideMenuTab): void {
    // Set the store value without persisting to localStorage
    sideMenuActiveTab.setWithoutPersist(tab);
}
