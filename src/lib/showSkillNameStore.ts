import { writable } from "svelte/store";
import { getItem, setItem } from "./storage";

export const DEFAULT_SHOW_SKILL_NAME = true;

function parseShowSkillName(storedValue: string | null): boolean | null {
    if (storedValue === null) return null;
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
    return null;
}

function getShowSkillName(): boolean {
    const stored = parseShowSkillName(getItem("show-skill-name"));
    return stored ?? DEFAULT_SHOW_SKILL_NAME;
}

function setShowSkillName(value: boolean) {
    setItem("show-skill-name", String(value));
}

function createShowSkillNameStore() {
    const { subscribe, set } = writable(getShowSkillName());

    return {
        subscribe,
        set: (value: boolean) => {
            setShowSkillName(value);
            set(value);
        },
        setWithoutPersistence: (value: boolean) => {
            set(value);
        },
        resetToDefault: () => {
            setShowSkillName(DEFAULT_SHOW_SKILL_NAME);
            set(DEFAULT_SHOW_SKILL_NAME);
        },
    };
}

export const showSkillName = createShowSkillNameStore();
