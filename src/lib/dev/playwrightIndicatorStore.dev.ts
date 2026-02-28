import { writable } from "svelte/store";

export type PlaywrightIndicatorState = {
    title: string;
    detail: string | null;
    tooltip: string;
};

export const playwrightIndicatorState =
    writable<PlaywrightIndicatorState | null>(null);

export function setPlaywrightIndicatorState(
    value: PlaywrightIndicatorState | null,
): void {
    playwrightIndicatorState.set(value);
}
