/**
 * Build presets store — single localStorage key for all presets and active preset.
 * Personal mode state (tree levels + tech crystals owned) is driven by the active preset.
 */

import { writable, get, derived } from "svelte/store";
import { encodeBuildData, decodeBuildData } from "./buildData/encoder";
import { getItem, setItem } from "./storage";

export const DEFAULT_PRESET_NAME = "Default";

export interface BuildPreset {
    id: string;
    name: string;
    buildCode: string;
}

export interface BuildPresetsData {
    active: string;
    presets: BuildPreset[];
}

function defaultPresetsData(): BuildPresetsData {
    const defaultId = generatePresetId();
    const emptyBuildCode = encodeBuildData({
        trees: [[], [], []],
        owned: 0,
    });
    return {
        active: defaultId,
        presets: [
            { id: defaultId, name: DEFAULT_PRESET_NAME, buildCode: emptyBuildCode },
        ],
    };
}

function generatePresetId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `preset-${Date.now().toString(36)}`;
}

function validatePresetsData(raw: unknown): BuildPresetsData | null {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const active = o.active;
    const presets = o.presets;
    if (typeof active !== "string" || !Array.isArray(presets)) return null;
    if (presets.length === 0) return null;

    const list: BuildPreset[] = [];
    const ids = new Set<string>();
    for (const p of presets) {
        if (!p || typeof p !== "object") continue;
        const q = p as Record<string, unknown>;
        if (
            typeof q.id !== "string" ||
            typeof q.name !== "string" ||
            typeof q.buildCode !== "string"
        )
            continue;
        if (ids.has(q.id)) continue;
        if (!decodeBuildData(q.buildCode)) continue;

        ids.add(q.id);
        list.push({
            id: q.id,
            name: q.name.trim() || "Build",
            buildCode: q.buildCode,
        });
    }
    if (list.length === 0) return null;
    const activeId = list.some((preset) => preset.id === active)
        ? active
        : list[0].id;
    return { active: activeId, presets: list };
}

export function loadPresetsFromStorage(): BuildPresetsData {
    try {
        const stored = getItem("build-presets");
        if (stored === null) return defaultPresetsData();
        const parsed = JSON.parse(stored) as unknown;
        const validated = validatePresetsData(parsed);
        return validated ?? defaultPresetsData();
    } catch {
        return defaultPresetsData();
    }
}

export function savePresetsToStorage(data: BuildPresetsData): void {
    try {
        setItem("build-presets", JSON.stringify(data));
    } catch (error) {
        if (
            error instanceof DOMException &&
            error.name === "QuotaExceededError"
        ) {
            console.warn(
                "localStorage quota exceeded, unable to save build presets",
            );
        } else {
            console.error(
                "Failed to save build presets to localStorage:",
                error,
            );
        }
    }
}

const initialData = loadPresetsFromStorage();
export const buildPresetsStore = writable<BuildPresetsData>(initialData);

// Skip saving on initial subscription to prevent overwriting localStorage on page load
let isInitialized = false;
buildPresetsStore.subscribe((data) => {
    if (!isInitialized) {
        isInitialized = true;
        return;
    }
    savePresetsToStorage(data);
});

export function getPresets(): BuildPreset[] {
    return get(buildPresetsStore).presets;
}

export function getActivePresetId(): string {
    return get(buildPresetsStore).active;
}

export function setActivePresetId(id: string): void {
    buildPresetsStore.update((data) => {
        if (!data.presets.some((p) => p.id === id)) return data;
        return { ...data, active: id };
    });
}

export function getActivePreset(): BuildPreset | null {
    const data = get(buildPresetsStore);
    return data.presets.find((p) => p.id === data.active) ?? null;
}

export function addPreset(name: string, buildCode: string): BuildPreset {
    const id = generatePresetId();
    const preset: BuildPreset = { id, name: name.trim() || "Build", buildCode };
    buildPresetsStore.update((data) => ({
        ...data,
        presets: [...data.presets, preset],
    }));
    return preset;
}

export function updatePreset(
    id: string,
    updates: { name?: string; buildCode?: string },
): void {
    buildPresetsStore.update((data) => ({
        ...data,
        presets: data.presets.map((p) => {
            if (p.id !== id) return p;
            return {
                ...p,
                ...(updates.name !== undefined && {
                    name: updates.name.trim() || p.name,
                }),
                ...(updates.buildCode !== undefined && {
                    buildCode: updates.buildCode,
                }),
            };
        }),
    }));
}

export function deletePreset(id: string): void {
    buildPresetsStore.update((data) => {
        const presets = data.presets.filter((p) => p.id !== id);
        let active = data.active;
        if (active === id) {
            active = presets.length > 0 ? presets[0].id : "";
        }
        return { active, presets };
    });
}

export function updateActivePresetBuildCode(buildCode: string): void {
    buildPresetsStore.update((data) => {
        const activePreset = data.presets.find((p) => p.id === data.active);
        if (!activePreset) return data;
        return {
            ...data,
            presets: data.presets.map((p) =>
                p.id === data.active ? { ...p, buildCode } : p,
            ),
        };
    });
}

export function getUniquePresetName(
    desiredName: string,
    fallbackName: string,
): string {
    const inputName = desiredName.trim() || fallbackName.trim() || "Preset";
    const existingNames = get(buildPresetsStore).presets.map((preset) =>
        preset.name.toLowerCase(),
    );

    if (!existingNames.includes(inputName.toLowerCase())) {
        return inputName;
    }

    // Extract trailing number if it exists (e.g., "Build 5" -> namePrefix="Build", counter=5)
    const match = inputName.match(/^(.+?)\s+(\d+)$/);
    const namePrefix = match ? match[1] : inputName;
    let counter = match ? parseInt(match[2], 10) : 2;

    let candidate = `${namePrefix} ${counter}`;
    while (existingNames.includes(candidate.toLowerCase())) {
        counter++;
        candidate = `${namePrefix} ${counter}`;
    }
    return candidate;
}

export function movePresetUp(id: string): void {
    buildPresetsStore.update((data) => {
        const index = data.presets.findIndex((p) => p.id === id);
        if (index <= 0) return data;
        const newPresets = [...data.presets];
        [newPresets[index], newPresets[index - 1]] = [
            newPresets[index - 1],
            newPresets[index],
        ];
        return { ...data, presets: newPresets };
    });
}

export function movePresetDown(id: string): void {
    buildPresetsStore.update((data) => {
        const index = data.presets.findIndex((p) => p.id === id);
        if (index < 0 || index >= data.presets.length - 1) return data;
        const newPresets = [...data.presets];
        [newPresets[index], newPresets[index + 1]] = [
            newPresets[index + 1],
            newPresets[index],
        ];
        return { ...data, presets: newPresets };
    });
}

/**
 * Derived store for the name of the currently active preset
 */
export const activePresetName = derived(buildPresetsStore, (data) => {
    const activePreset = data.presets.find(
        (preset) => preset.id === data.active,
    );
    return activePreset?.name ?? DEFAULT_PRESET_NAME;
});
