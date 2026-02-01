import { writable } from "svelte/store";

export type TabsCaptureBridge = {
    setActiveIndex: (index: number) => void;
    getActiveIndex: () => number;
    getTreeCanvasElement: () => HTMLDivElement | null;
};

export const tabsCaptureBridgeStore = writable<TabsCaptureBridge | null>(null);
