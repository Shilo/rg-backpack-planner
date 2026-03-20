import { onMount } from "svelte";

/**
 * Registers a window keydown listener on mount and removes it on destroy.
 * Call at component root level (not inside onMount).
 * Defaults to capture phase for global hotkey interception.
 */
export function onKeyDown(
    handler: (event: KeyboardEvent) => void,
    capture = true,
): void {
    onMount(() => {
        window.addEventListener("keydown", handler, capture);
        return () => window.removeEventListener("keydown", handler, capture);
    });
}
