import { writable } from "svelte/store";

export interface TabsRef {
    captureTreeImageByIndex: (tabIndex: number) => Promise<Blob | null>;
}

// Global store to hold reference to Tabs component
export const tabsRefStore = writable<TabsRef | null>(null);
