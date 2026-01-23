import { writable } from "svelte/store";

const STORAGE_KEY = "singleLevelUp";

function getSingleLevelUp(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "true";
}

function setSingleLevelUp(value: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, value.toString());
}

function createSingleLevelUpStore() {
  const { subscribe, set, update } = writable(getSingleLevelUp());

  return {
    subscribe,
    set: (value: boolean) => {
      setSingleLevelUp(value);
      set(value);
    },
    toggle: () => {
      update((value) => {
        const next = !value;
        setSingleLevelUp(next);
        return next;
      });
    },
  };
}

export const singleLevelUp = createSingleLevelUpStore();
