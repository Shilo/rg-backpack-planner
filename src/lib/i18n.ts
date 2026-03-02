import { addDictionary, init, locale, registerLoader, t } from "svelte-whisper";
import { get, writable } from "svelte/store";
import type { SkillId } from "../types/tree";
import enDictionary from "../locales/en.json";

export const SUPPORTED_LOCALES = ["en", "jp", "zh"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

const FALLBACK_LOCALE: AppLocale = "en";
const LOCALE_STORAGE_KEY = "rg-backpack-planner-locale";

export const CANONICAL_PRESET_NAMES = {
    default: "Default",
    new: "New",
    clone: "Clone",
} as const;

addDictionary(FALLBACK_LOCALE, enDictionary);
registerLoader("jp", () => import("../locales/jp.json"));
registerLoader("zh", () => import("../locales/zh.json"));

function isAppLocale(value: string | null | undefined): value is AppLocale {
    return (
        typeof value === "string" &&
        (SUPPORTED_LOCALES as readonly string[]).includes(value)
    );
}

function getBrowserLocale(): AppLocale {
    if (typeof navigator === "undefined") {
        return FALLBACK_LOCALE;
    }

    const lower = navigator.language.toLowerCase();
    if (lower.startsWith("ja")) return "jp";
    if (lower.startsWith("zh")) return "zh";
    return "en";
}

function getInitialLocale(): AppLocale {
    if (typeof window === "undefined") {
        return FALLBACK_LOCALE;
    }

    try {
        const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (isAppLocale(stored)) {
            return stored;
        }
    } catch {
        // ignore localStorage failures and fallback to browser locale
    }

    return getBrowserLocale();
}

function persistLocale(value: AppLocale): void {
    if (typeof window === "undefined") {
        return;
    }

    try {
        localStorage.setItem(LOCALE_STORAGE_KEY, value);
    } catch {
        // ignore localStorage failures
    }
}

export const currentLocale = writable<AppLocale>(FALLBACK_LOCALE);

let isInitialized = false;

export async function initializeI18n(): Promise<void> {
    if (isInitialized) return;

    isInitialized = true;
    await init({ fallback: FALLBACK_LOCALE });

    const initial = getInitialLocale();
    try {
        await locale.set(initial);
        currentLocale.set(initial);
    } catch (error) {
        console.error(
            `Failed to load locale "${initial}". Falling back to "${FALLBACK_LOCALE}".`,
            error,
        );
        await locale.set(FALLBACK_LOCALE);
        currentLocale.set(FALLBACK_LOCALE);
        persistLocale(FALLBACK_LOCALE);
    }
}

export async function setAppLocale(nextLocale: AppLocale): Promise<void> {
    if (!isAppLocale(nextLocale)) return;

    try {
        await locale.set(nextLocale);
        currentLocale.set(nextLocale);
        persistLocale(nextLocale);
    } catch (error) {
        console.error(`Failed to switch locale to "${nextLocale}".`, error);
    }
}

/**
 * Sync translation helper for modules that are outside component reactivity.
 * Prefer `$t(...)` in Svelte components whenever possible.
 */
export function tr(
    key: string,
    vars?: Record<string, unknown> | unknown[],
): string {
    const translate = get(t) as (
        key: string,
        vars?: Record<string, unknown> | unknown[],
    ) => string;
    return translate(key, vars);
}

export function getSkillLabel(skillId: SkillId): string {
    return tr(`skills.${skillId}`);
}

export function getTreeLabel(treeId: "guardian" | "vanguard" | "cannon"): string {
    return tr(`trees.${treeId}`);
}

export function getTreeName(treeLabel: string): string {
    const trimmed = treeLabel.trim();
    return trimmed
        ? tr("trees.named", { label: trimmed })
        : tr("trees.generic");
}

export function getDisplayPresetName(name: string): string {
    const trimmed = name.trim();

    if (trimmed === CANONICAL_PRESET_NAMES.default) {
        return tr("buildPresets.generated.default");
    }
    if (trimmed === CANONICAL_PRESET_NAMES.new) {
        return tr("buildPresets.generated.new");
    }
    if (trimmed === CANONICAL_PRESET_NAMES.clone) {
        return tr("buildPresets.generated.clone");
    }

    const newCount = trimmed.match(/^New\s+(\d+)$/i);
    if (newCount) {
        return tr("buildPresets.generated.newCount", { count: newCount[1] });
    }

    const cloneCount = trimmed.match(/^Clone\s+(\d+)$/i);
    if (cloneCount) {
        return tr("buildPresets.generated.cloneCount", { count: cloneCount[1] });
    }

    return name;
}
