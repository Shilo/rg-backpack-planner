import type { TreeViewState } from "../Tree.svelte";

export const SNAPDOM_CAPTURE_CLASS = "snapdom-capture";

export type TreeBridge = {
    setActive: (index: number) => void;
    getActive: () => number;
    getTreeCanvas: () => HTMLDivElement | null | undefined;
    focusActiveTreeInView?: () => void;
    getViewState?: () => TreeViewState | null;
    restoreAfterCapture?: (index: number, viewState: TreeViewState) => void;
};

export let treeBridge: TreeBridge | null = null;

export function registerTreeBridge(bridge: TreeBridge) {
    treeBridge = bridge;
}

export function unregisterTreeBridge(bridge: TreeBridge) {
    if (treeBridge === bridge) {
        treeBridge = null;
    }
}
