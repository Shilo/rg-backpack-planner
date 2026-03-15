import { onMount } from "svelte";
import type { PlaywrightIndicatorState } from "./playwrightIndicatorStore.dev";

/**
 * Svelte lifecycle hook that subscribes to the Playwright indicator store in dev builds.
 * No-op in production. Must be called during component initialization.
 */
export function usePlaywrightIndicator(
    onUpdate: (state: PlaywrightIndicatorState | null) => void,
): void {
    if (!import.meta.env.DEV) return;

    onMount(() => {
        let cancelled = false;
        let unsubscribe: (() => void) | null = null;

        void import("./playwrightIndicatorStore.dev").then(
            ({ playwrightIndicatorState }) => {
                if (cancelled) return;
                unsubscribe = playwrightIndicatorState.subscribe(onUpdate);
            },
        );

        return () => {
            cancelled = true;
            unsubscribe?.();
        };
    });
}
