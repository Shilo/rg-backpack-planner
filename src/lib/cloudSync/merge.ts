// src/lib/cloudSync/merge.ts
import type { BuildPreset } from "../buildPresetsStore";
import type { SyncDocument } from "./firestore";

export interface MergeInput {
    localPresets: BuildPreset[];
    localOrder: string[];
    localActiveId: string;
    remote: SyncDocument;
    lastRemotePresetIds: Set<string>;
    pendingLocalDeletions: Set<string>;
}

export interface MergeResult {
    presets: BuildPreset[];
    order: string[];
    activeId: string;
    changed: boolean;
}

/**
 * Per-preset merge: compare local vs remote by updatedAt.
 * On tie, keep local. Handles additions, deletions, pending deletions, order.
 */
export function mergePresets(input: MergeInput): MergeResult {
    const { localPresets, localOrder, localActiveId, remote, lastRemotePresetIds, pendingLocalDeletions } = input;

    const localMap = new Map<string, BuildPreset>();
    for (const p of localPresets) localMap.set(p.id, p);

    const merged = new Map<string, BuildPreset>();

    // Step 1: Process remote presets
    for (const [id, remotePreset] of Object.entries(remote.presets)) {
        if (pendingLocalDeletions.has(id)) continue;

        const local = localMap.get(id);
        if (local) {
            // Both have it — take newer, on tie keep local
            if (remotePreset.updatedAt > local.updatedAt) {
                merged.set(id, { id, name: remotePreset.name, buildCode: remotePreset.buildCode, updatedAt: remotePreset.updatedAt });
            } else {
                merged.set(id, local);
            }
        } else {
            // Remote only — add
            merged.set(id, { id, name: remotePreset.name, buildCode: remotePreset.buildCode, updatedAt: remotePreset.updatedAt });
        }
    }

    // Step 2: Process local-only presets
    for (const local of localPresets) {
        if (merged.has(local.id)) continue;
        if (pendingLocalDeletions.has(local.id)) continue;

        if (lastRemotePresetIds.has(local.id)) {
            // Was in previous remote snapshot — deleted remotely, remove
            continue;
        }
        // Not in previous remote — local addition, keep
        merged.set(local.id, local);
    }

    // Step 3: Empty check — always have at least one preset
    if (merged.size === 0) {
        const defaultId = crypto.randomUUID?.() ?? `preset-${Date.now().toString(36)}`;
        merged.set(defaultId, { id: defaultId, name: "Default", buildCode: "_", updatedAt: Date.now() });
    }

    // Step 4: Order — remote as base, append local-only additions
    const remoteOrderSet = new Set(remote.order);
    const localOnlyIds = [...merged.keys()].filter((id) => !remoteOrderSet.has(id));
    const order = [...remote.order.filter((id) => merged.has(id)), ...localOnlyIds];

    // Step 5: Active ID validation
    let activeId = localActiveId;
    if (!merged.has(activeId)) {
        activeId = order[0] ?? [...merged.keys()][0];
    }

    // Step 6: Determine if anything changed
    const mergedPresets = order.map((id) => merged.get(id)!);
    const changed = detectChanges(localPresets, localOrder, mergedPresets, order);

    return { presets: mergedPresets, order, activeId, changed };
}

function detectChanges(
    oldPresets: BuildPreset[],
    oldOrder: string[],
    newPresets: BuildPreset[],
    newOrder: string[],
): boolean {
    if (oldPresets.length !== newPresets.length) return true;
    if (oldOrder.length !== newOrder.length) return true;
    for (let i = 0; i < newOrder.length; i++) {
        if (oldOrder[i] !== newOrder[i]) return true;
    }
    for (let i = 0; i < newPresets.length; i++) {
        const o = oldPresets[i];
        const n = newPresets[i];
        if (!o || o.id !== n.id || o.name !== n.name || o.buildCode !== n.buildCode || o.updatedAt !== n.updatedAt) return true;
    }
    return false;
}
