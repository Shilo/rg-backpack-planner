import { writable } from "svelte/store";

/** Whether AppTitleDisplay is currently visible on screen. */
export const appTitleVisible = writable(false);
