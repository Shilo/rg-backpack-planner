import { writable } from "svelte/store";

const STORAGE_KEY = "closeUpView";

function getCloseUpView(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "true";
}

function setCloseUpView(value: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, value.toString());
}

function createCloseUpViewStore() {
  const { subscribe, set, update } = writable(getCloseUpView());

  return {
    subscribe,
    set: (value: boolean) => {
      setCloseUpView(value);
      set(value);
    },
    toggle: () => {
      update((value) => {
        const next = !value;
        setCloseUpView(next);
        return next;
      });
    },
  };
}

export const closeUpView = createCloseUpViewStore();
