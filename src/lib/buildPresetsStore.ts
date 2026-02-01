/**
 * Build presets store — single localStorage key for all presets and active preset.
 * Personal mode state (tree levels + tech crystals owned) is driven by the active preset.
 */

import { writable, get } from "svelte/store";
import { encodeBuildData } from "./buildData/encoder";

const STORAGE_KEY = "rg-backpack-planner-build-presets";

export interface BuildPreset {
    id: string;
    name: string;
    buildCode: string;
}

export interface BuildPresetsData {
    activePresetId: string;
    presets: BuildPreset[];
}

function defaultPresetsData(): BuildPresetsData {
    const defaultId = generatePresetId();
    const emptyBuildCode = encodeBuildData({
        trees: [[], [], []],
        owned: 0,
    });
    return {
        activePresetId: defaultId,
        presets: [
            { id: defaultId, name: "Default", buildCode: emptyBuildCode },
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
    const activePresetId = o.activePresetId;
    const presets = o.presets;
    if (typeof activePresetId !== "string" || !Array.isArray(presets))
        return null;
    if (presets.length === 0) return null;
    const list: BuildPreset[] = [];
    for (const p of presets) {
        if (!p || typeof p !== "object") return null;
        const q = p as Record<string, unknown>;
        if (
            typeof q.id !== "string" ||
            typeof q.name !== "string" ||
            typeof q.buildCode !== "string"
        )
            return null;
        list.push({ id: q.id, name: q.name, buildCode: q.buildCode });
    }
    if (!list.some((p) => p.id === activePresetId)) return null;
    return { activePresetId, presets: list };
}

export function loadPresetsFromStorage(): BuildPresetsData {
    if (typeof window === "undefined") return defaultPresetsData();
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === null) return defaultPresetsData();
        const parsed = JSON.parse(stored) as unknown;
        const validated = validatePresetsData(parsed);
        return validated ?? defaultPresetsData();
    } catch {
        return defaultPresetsData();
    }
}

export function savePresetsToStorage(data: BuildPresetsData): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

buildPresetsStore.subscribe((data) => {
    savePresetsToStorage(data);
});

export function getPresets(): BuildPreset[] {
    return get(buildPresetsStore).presets;
}

export function getActivePresetId(): string {
    return get(buildPresetsStore).activePresetId;
}

export function setActivePresetId(id: string): void {
    buildPresetsStore.update((data) => {
        if (!data.presets.some((p) => p.id === id)) return data;
        return { ...data, activePresetId: id };
    });
}

export function getActivePreset(): BuildPreset | null {
    const data = get(buildPresetsStore);
    return data.presets.find((p) => p.id === data.activePresetId) ?? null;
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
        let activePresetId = data.activePresetId;
        if (activePresetId === id) {
            activePresetId = presets.length > 0 ? presets[0].id : "";
        }
        return { activePresetId, presets };
    });
}

export function updateActivePresetBuildCode(buildCode: string): void {
    buildPresetsStore.update((data) => {
        const active = data.presets.find((p) => p.id === data.activePresetId);
        if (!active) return data;
        return {
            ...data,
            presets: data.presets.map((p) =>
                p.id === data.activePresetId ? { ...p, buildCode } : p,
            ),
        };
    });
}

export function getUniquePresetName(
    desiredName: string,
    fallbackName: string,
): string {
    const baseName = desiredName.trim() || fallbackName.trim() || "Preset";
    const existingNames = get(buildPresetsStore).presets.map((preset) =>
        preset.name.toLowerCase(),
    );
    if (!existingNames.includes(baseName.toLowerCase())) {
        return baseName;
    }
    let counter = 2;
    let candidate = `${baseName} ${counter}`;
    while (existingNames.includes(candidate.toLowerCase())) {
        counter++;
        candidate = `${baseName} ${counter}`;
    }
    return candidate;
}
