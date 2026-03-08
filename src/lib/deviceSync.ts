/**
 * Device sync — export / import build presets across devices.
 *
 * Presets travel as a self-describing JSON payload (version-tagged).
 * Settings are intentionally excluded: they are device-specific.
 *
 * Architecture note:
 * The `SyncProvider` interface below outlines the contract for a future
 * cloud-relay backend (Cloudflare Workers KV, Firebase RTDB, etc.).
 * The current implementation is manual (clipboard + file) and requires
 * no server.  When a relay is added, swap in a `CloudSyncProvider` and
 * wire the store subscription to `push()` on every preset mutation for
 * automatic sync.
 */

import {
    buildPresetsStore,
    type BuildPreset,
    type BuildPresetsData,
} from "./buildPresetsStore";
import { decodeBuildData } from "./buildData/encoder";
import { get } from "svelte/store";

// ─── Sync payload ────────────────────────────────────────────────

export const SYNC_FORMAT_VERSION = 1;

export interface SyncPreset {
    name: string;
    build: string;
}

export interface SyncPayload {
    v: number;
    presets: SyncPreset[];
}

// ─── Encode / decode ─────────────────────────────────────────────

export function encodePresetsForSync(data: BuildPresetsData): string {
    const payload: SyncPayload = {
        v: SYNC_FORMAT_VERSION,
        presets: data.presets.map((p) => ({ name: p.name, build: p.buildCode })),
    };
    return JSON.stringify(payload);
}

export function decodeSyncPayload(raw: string): SyncPreset[] | null {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object") return null;
        const obj = parsed as Record<string, unknown>;
        if (typeof obj.v !== "number" || !Array.isArray(obj.presets)) return null;

        const presets: SyncPreset[] = [];
        for (const entry of obj.presets) {
            if (!entry || typeof entry !== "object") continue;
            const e = entry as Record<string, unknown>;
            if (typeof e.name !== "string" || typeof e.build !== "string") continue;
            if (!decodeBuildData(e.build)) continue;
            presets.push({ name: e.name.trim() || "Build", build: e.build });
        }
        return presets.length > 0 ? presets : null;
    } catch {
        return null;
    }
}

// ─── Merge strategies ────────────────────────────────────────────

function generatePresetId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `preset-${Date.now().toString(36)}`;
}

function syncPresetToBuildPreset(sp: SyncPreset): BuildPreset {
    return { id: generatePresetId(), name: sp.name, buildCode: sp.build };
}

/**
 * Replace all local presets with incoming ones.
 * Active is set to the first preset.
 */
export function replaceAllPresets(incoming: SyncPreset[]): BuildPresetsData {
    const presets = incoming.map(syncPresetToBuildPreset);
    return { active: presets[0].id, presets };
}

function makeUniqueName(desired: string, takenNames: Set<string>): string {
    if (!takenNames.has(desired.toLowerCase())) return desired;
    const match = desired.match(/^(.+?)\s+(\d+)$/);
    const prefix = match ? match[1] : desired;
    let counter = match ? parseInt(match[2], 10) : 2;
    let candidate = `${prefix} ${counter}`;
    while (takenNames.has(candidate.toLowerCase())) {
        counter++;
        candidate = `${prefix} ${counter}`;
    }
    return candidate;
}

/**
 * Merge incoming presets into local data.
 * Presets whose name AND build code already exist locally are skipped.
 * New presets get a unique name if there is a name collision with a different build.
 */
export function mergePresets(
    local: BuildPresetsData,
    incoming: SyncPreset[],
): BuildPresetsData {
    const existingNames = new Set(
        local.presets.map((p) => p.name.toLowerCase()),
    );
    const existingCodes = new Set(local.presets.map((p) => p.buildCode));

    const added: BuildPreset[] = [];
    for (const sp of incoming) {
        if (existingNames.has(sp.name.toLowerCase()) && existingCodes.has(sp.build)) {
            continue;
        }

        const name = existingNames.has(sp.name.toLowerCase())
            ? makeUniqueName(sp.name, existingNames)
            : sp.name;

        added.push({ id: generatePresetId(), name, buildCode: sp.build });
        existingNames.add(name.toLowerCase());
        existingCodes.add(sp.build);
    }

    if (added.length === 0) return local;
    return { active: local.active, presets: [...local.presets, ...added] };
}

// ─── Clipboard helpers ───────────────────────────────────────────

export async function exportPresetsToClipboard(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        return false;
    }
    try {
        const json = encodePresetsForSync(get(buildPresetsStore));
        await navigator.clipboard.writeText(json);
        return true;
    } catch {
        return false;
    }
}

// ─── File helpers ────────────────────────────────────────────────

export function exportPresetsToFile(): void {
    const json = encodePresetsForSync(get(buildPresetsStore));
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backpack-presets.json";
    a.click();
    URL.revokeObjectURL(url);
}

export function importPresetsFromFile(): Promise<SyncPreset[] | null> {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) { resolve(null); return; }
            try {
                const text = await file.text();
                resolve(decodeSyncPayload(text));
            } catch {
                resolve(null);
            }
        };
        input.oncancel = () => resolve(null);
        input.click();
    });
}

// ─── Web Share API ───────────────────────────────────────────────

export type SharePresetsResult = "shared" | "copied" | "cancelled" | "failed";

export async function sharePresetsNative(): Promise<SharePresetsResult> {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return "failed";
    }

    const json = encodePresetsForSync(get(buildPresetsStore));

    if (typeof navigator.share === "function") {
        try {
            const file = new File([json], "backpack-presets.json", {
                type: "application/json",
            });
            await navigator.share({ files: [file] });
            return "shared";
        } catch (error: unknown) {
            const err = error as { name?: string };
            if (err?.name === "AbortError") return "cancelled";
        }
    }

    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(json);
            return "copied";
        } catch {
            return "failed";
        }
    }

    return "failed";
}

// ─── SyncProvider interface (future cloud relay) ─────────────────
//
// export interface SyncProvider {
//     push(payload: SyncPayload): Promise<void>;
//     pull(): Promise<SyncPayload | null>;
// }
//
// A CloudSyncProvider would:
//   1. push() on every buildPresetsStore mutation
//   2. pull() on app start and/or on a periodic timer
//   3. Use a user-chosen passphrase or generated room code as the key
//   4. Store data in Cloudflare Workers KV, Firebase RTDB, or similar
