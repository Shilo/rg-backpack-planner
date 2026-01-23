import { writable } from "svelte/store";

const STORAGE_KEY = "defaultZoom200";

function getDefaultZoom(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "true";
}

function setDefaultZoom(value: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
}

function createDefaultZoomStore() {
  const { subscribe, set, update } = writable(getDefaultZoom());

  return {
    subscribe,
    set: (value: boolean) => {
      setDefaultZoom(value);
      set(value);
    },
    toggle: () => {
      update((value) => {
        const next = !value;
        setDefaultZoom(next);
        return next;
      });
    },
  };
}

export const defaultZoom200 = createDefaultZoomStore();
