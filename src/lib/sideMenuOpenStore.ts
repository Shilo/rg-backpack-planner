import { writable } from "svelte/store";

/** When set to true, App.svelte reacts by opening the side menu, then resets to false. */
export const sideMenuOpenRequest = writable(false);

export function requestOpenSideMenu(): void {
    sideMenuOpenRequest.set(true);
}
