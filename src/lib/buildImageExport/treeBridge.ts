export type TreeBridge = {
    setActive: (index: number) => void;
    getActive: () => number;
    getTreeCanvas: () => HTMLDivElement | null | undefined;
    focusActiveTreeInView?: () => void;
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
