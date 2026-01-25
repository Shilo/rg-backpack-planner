import { writable } from "svelte/store";

const STORAGE_KEY = "rg-backpack-planner-close-up-view";

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
  let onChangeCallback: (() => void) | null = null;

  const notifyChange = () => {
    // Use setTimeout to ensure store update has propagated before calling callback
    setTimeout(() => {
      onChangeCallback?.();
    }, 0);
  };

  return {
    subscribe,
    setOnChange: (callback: (() => void) | null) => {
      onChangeCallback = callback;
    },
    set: (value: boolean) => {
      setCloseUpView(value);
      set(value);
      notifyChange();
    },
    toggle: () => {
      update((value) => {
        const next = !value;
        setCloseUpView(next);
        return next;
      });
      notifyChange();
    },
  };
}

export const closeUpView = createCloseUpViewStore();
