import { writable } from "svelte/store";
import { getItem, setItem } from "./storage";

export const DEFAULT_IGNORE_TECH_CRYSTAL_BUDGET = false;

function parseIgnoreTechCrystalBudget(
    storedValue: string | null,
): boolean | null {
    if (storedValue === null) return null;
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
    return null;
}

function getIgnoreTechCrystalBudget(): boolean {
    const stored = parseIgnoreTechCrystalBudget(
        getItem("ignore-tech-crystal-budget"),
    );
    return stored ?? DEFAULT_IGNORE_TECH_CRYSTAL_BUDGET;
}

function setIgnoreTechCrystalBudget(value: boolean) {
    setItem("ignore-tech-crystal-budget", String(value));
}

function createIgnoreTechCrystalBudgetStore() {
    const { subscribe, set } = writable(getIgnoreTechCrystalBudget());

    return {
        subscribe,
        set: (value: boolean) => {
            setIgnoreTechCrystalBudget(value);
            set(value);
        },
        resetToDefault: () => {
            setIgnoreTechCrystalBudget(DEFAULT_IGNORE_TECH_CRYSTAL_BUDGET);
            set(DEFAULT_IGNORE_TECH_CRYSTAL_BUDGET);
        },
    };
}

export const ignoreTechCrystalBudget = createIgnoreTechCrystalBudgetStore();
