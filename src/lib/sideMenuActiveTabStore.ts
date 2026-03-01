import { writable } from "svelte/store";
import { readLocalStorage, writeLocalStorage } from "./storage";

export type SideMenuTab = "statistics" | "settings" | "controls";

const STORAGE_KEY = "rg-backpack-planner-side-menu-active-tab";
const DEFAULT_TAB: SideMenuTab = "statistics";

function isValidTab(tab: string): tab is SideMenuTab {
    return tab === "statistics" || tab === "settings" || tab === "controls";
}

function getStoredActiveTab(): SideMenuTab {
    const stored = readLocalStorage(STORAGE_KEY);
    if (stored && isValidTab(stored)) {
        return stored;
    }
    return DEFAULT_TAB;
}

function setStoredActiveTab(tab: SideMenuTab): void {
    writeLocalStorage(STORAGE_KEY, tab);
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
