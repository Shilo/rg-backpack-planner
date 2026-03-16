import { writable } from "svelte/store";
import { getItem, setItem } from "../storage";

export const DEFAULT_ONBOARDING_SEEN = false;

function parseOnboardingSeen(storedValue: string | null): boolean | null {
    if (storedValue === null) return null;
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
    return null;
}

function getOnboardingSeen(): boolean {
    // TODO DEV: force onboarding on every reload for testing
    return false;
    const stored = parseOnboardingSeen(getItem("onboarding-seen"));
    return stored ?? DEFAULT_ONBOARDING_SEEN;
}

function setOnboardingSeen(value: boolean) {
    setItem("onboarding-seen", String(value));
}

function createOnboardingSeenStore() {
    const { subscribe, set } = writable(getOnboardingSeen());

    return {
        subscribe,
        set: (value: boolean) => {
            setOnboardingSeen(value);
            set(value);
        },
        setWithoutPersistence: (value: boolean) => {
            set(value);
        },
        resetToDefault: () => {
            setOnboardingSeen(DEFAULT_ONBOARDING_SEEN);
            set(DEFAULT_ONBOARDING_SEEN);
        },
    };
}

export const onboardingSeen = createOnboardingSeenStore();

export function completeOnboarding() {
    onboardingSeen.set(true);
}

export function showOnboarding() {
    onboardingSeen.setWithoutPersistence(false);
    document.dispatchEvent(new CustomEvent("closeSideMenu"));
}
