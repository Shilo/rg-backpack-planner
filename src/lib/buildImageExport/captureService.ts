import { get } from "svelte/store";
import { tick } from "svelte";
import { captureTreeAsPng } from "./captureTree";
import { isCapturing } from "./captureState";
import { tabsCaptureBridgeStore } from "./tabsCaptureBridge";

async function waitForNextFrame(): Promise<void> {
    await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
    });
}

async function withCaptureState<T>(callback: () => Promise<T>): Promise<T> {
    const rootEl =
        typeof document !== "undefined" ? document.documentElement : null;
    isCapturing.set(true);
    rootEl?.classList.add("snapdom-capture");
    try {
        return await callback();
    } finally {
        rootEl?.classList.remove("snapdom-capture");
        isCapturing.set(false);
    }
}

export async function captureTreeImageByIndex(
    tabIndex: number,
): Promise<Blob | null> {
    const bridge = get(tabsCaptureBridgeStore);
    if (!bridge) {
        return null;
    }

    return withCaptureState(async () => {
        const currentIndex = bridge.getActiveIndex();

        if (tabIndex !== currentIndex) {
            bridge.setActiveIndex(tabIndex);
            await tick();
            await waitForNextFrame();
        }

        const element = bridge.getTreeCanvasElement();
        const blob = await captureTreeAsPng(element);

        if (tabIndex !== currentIndex) {
            bridge.setActiveIndex(currentIndex);
            await tick();
            await waitForNextFrame();
        }

        return blob;
    });
}
