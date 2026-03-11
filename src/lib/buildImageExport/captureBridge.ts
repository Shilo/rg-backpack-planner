export type TabsCaptureBridge = {
    setActive: (index: number) => void;
    getActive: () => number;
    getTreeCanvas: () => HTMLDivElement | null | undefined;
    focusActiveTreeInView?: () => void;
};

export let tabsBridge: TabsCaptureBridge | null = null;
export let captureInProgressCount = 0;

export function isCaptureInProgress() {
    return captureInProgressCount > 0;
}

export function incrementCapture() {
    captureInProgressCount++;
}

export function decrementCapture() {
    captureInProgressCount--;
}

/**
 * Svelte action for automatic capture bridge registration
 * Usage: use:captureAction={{ setActive, getActive, getTreeCanvas }}
 */
export function captureAction(_node: HTMLElement, bridge: TabsCaptureBridge) {
    tabsBridge = bridge;
    return {
        destroy: () => {
            if (tabsBridge === bridge) {
                tabsBridge = null;
            }
        },
    };
}
