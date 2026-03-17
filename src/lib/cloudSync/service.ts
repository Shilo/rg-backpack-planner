// src/lib/cloudSync/service.ts
import { get } from "svelte/store";
import { buildPresetsStore, type BuildPreset, type BuildPresetsData } from "../buildPresetsStore";
import { cloudSyncStore, type CloudSyncState } from "../cloudSyncStore";
import { mergePresets } from "./merge";
import type { SyncDocument } from "./firestore";

let uid: string | null = null;
let unsubscribeListener: (() => void) | null = null;
let unsubscribeStore: (() => void) | null = null;
let lastRemotePresetIds = new Set<string>();
let pendingLocalDeletions = new Set<string>();
let lastKnownPresets: BuildPreset[] = [];
let lastKnownOrder: string[] = [];
let writeQueue: Promise<void> = Promise.resolve();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isProcessingRemote = false;

const DEBOUNCE_MS = 500;

function updateSyncStore(patch: Partial<CloudSyncState>) {
    cloudSyncStore.update((s) => ({ ...s, ...patch }));
}

export async function startCloudSync(
    firebaseUid: string,
    user: { displayName: string | null; email: string | null; photoURL: string | null },
): Promise<void> {
    uid = firebaseUid;

    updateSyncStore({
        enabled: true,
        status: "syncing",
        userDisplayName: user.displayName,
        userEmail: user.email,
        userPhotoUrl: user.photoURL,
    });

    const { readSyncDoc, createSyncDoc, listenToSyncDoc } = await import("./firestore");

    const localData = get(buildPresetsStore);
    const localPresets = localData.presets;
    const localOrder = localPresets.map((p) => p.id);

    // Check for existing remote document
    const remote = await readSyncDoc(firebaseUid);

    if (!remote) {
        // First time — upload local data
        await createSyncDoc(firebaseUid, localPresets, localOrder);
        lastRemotePresetIds = new Set(localPresets.map((p) => p.id));
    } else {
        // Existing remote — merge
        const result = mergePresets({
            localPresets,
            localOrder,
            localActiveId: localData.active,
            remote,
            lastRemotePresetIds, // empty on first sign-in — all local treated as additions
            pendingLocalDeletions,
        });

        if (result.changed) {
            buildPresetsStore.set({ active: result.activeId, presets: result.presets });
        }
        lastRemotePresetIds = new Set(Object.keys(remote.presets));
    }

    lastKnownPresets = get(buildPresetsStore).presets;
    lastKnownOrder = lastKnownPresets.map((p) => p.id);

    // Attach realtime listener
    unsubscribeListener = listenToSyncDoc(
        firebaseUid,
        handleRemoteSnapshot,
        handleListenerError,
    );

    // Subscribe to local store changes
    let skipFirst = true;
    unsubscribeStore = buildPresetsStore.subscribe((data) => {
        if (skipFirst) { skipFirst = false; return; }
        if (isProcessingRemote) return;
        handleLocalChange(data);
    });

    updateSyncStore({
        status: "idle",
        lastSyncedAt: Date.now(),
        revision: remote?.revision ?? 1,
        presetCount: get(buildPresetsStore).presets.length,
    });
}

function handleRemoteSnapshot(data: SyncDocument | null) {
    if (!uid || !data) return;

    const localData = get(buildPresetsStore);
    const result = mergePresets({
        localPresets: localData.presets,
        localOrder: localData.presets.map((p) => p.id),
        localActiveId: localData.active,
        remote: data,
        lastRemotePresetIds,
        pendingLocalDeletions,
    });

    lastRemotePresetIds = new Set(Object.keys(data.presets));

    if (result.changed) {
        isProcessingRemote = true;
        buildPresetsStore.set({ active: result.activeId, presets: result.presets });
        isProcessingRemote = false;
    }

    lastKnownPresets = result.presets;
    lastKnownOrder = result.order;

    updateSyncStore({
        status: "idle",
        lastSyncedAt: Date.now(),
        revision: data.revision,
        presetCount: result.presets.length,
    });
}

function handleListenerError(error: Error) {
    console.error("Cloud Save listener error:", error);
    updateSyncStore({ status: "error" });
}

function handleLocalChange(data: BuildPresetsData) {
    if (!uid) return;

    // Debounce writes
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void enqueueWrite(data);
    }, DEBOUNCE_MS);
}

async function enqueueWrite(data: BuildPresetsData): Promise<void> {
    writeQueue = writeQueue.then(() => performWrite(data)).catch((err) => {
        console.error("Cloud Save write error:", err);
        const code = (err as { code?: string })?.code;
        if (code === "permission-denied" || code === "resource-exhausted") {
            import("../toast").then(({ showToast }) => {
                showToast("Too many builds to sync. Delete some builds to resume syncing.", { tone: "negative" });
            });
        }
        updateSyncStore({ status: "error" });
    });
}

async function performWrite(data: BuildPresetsData): Promise<void> {
    if (!uid) return;

    updateSyncStore({ status: "syncing" });

    const { writePresetEdit, writePresetAdd, writePresetDelete, writeReorder } = await import("./firestore");

    const newOrder = data.presets.map((p) => p.id);
    const oldMap = new Map(lastKnownPresets.map((p) => [p.id, p]));
    const newMap = new Map(data.presets.map((p) => [p.id, p]));

    // Detect deletes
    for (const old of lastKnownPresets) {
        if (!newMap.has(old.id)) {
            pendingLocalDeletions.add(old.id);
            try {
                await writePresetDelete(uid, old.id, newOrder);
            } finally {
                pendingLocalDeletions.delete(old.id);
            }
        }
    }

    // Detect adds and edits
    for (const preset of data.presets) {
        const old = oldMap.get(preset.id);
        if (!old) {
            // New preset
            await writePresetAdd(uid, preset.id, preset, newOrder);
        } else if (old.name !== preset.name || old.buildCode !== preset.buildCode || old.updatedAt !== preset.updatedAt) {
            // Edited preset
            await writePresetEdit(uid, preset.id, preset);
        }
    }

    // Detect reorder-only (if order changed but no adds/deletes/edits above)
    const orderChanged = lastKnownOrder.length !== newOrder.length || lastKnownOrder.some((id, i) => id !== newOrder[i]);
    const noAddDeleteEdit = lastKnownPresets.length === data.presets.length &&
        data.presets.every((p) => {
            const old = oldMap.get(p.id);
            return old && old.name === p.name && old.buildCode === p.buildCode && old.updatedAt === p.updatedAt;
        });
    if (orderChanged && noAddDeleteEdit) {
        await writeReorder(uid, newOrder);
    }

    lastKnownPresets = data.presets;
    lastKnownOrder = newOrder;

    updateSyncStore({
        status: "idle",
        lastSyncedAt: Date.now(),
        presetCount: data.presets.length,
    });
}

export async function stopCloudSync(): Promise<void> {
    unsubscribeListener?.();
    unsubscribeStore?.();
    unsubscribeListener = null;
    unsubscribeStore = null;
    uid = null;
    lastRemotePresetIds = new Set();
    pendingLocalDeletions = new Set();
    lastKnownPresets = [];
    lastKnownOrder = [];
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }

    updateSyncStore({
        enabled: false,
        status: "idle",
        lastSyncedAt: null,
        revision: null,
        presetCount: null,
        userDisplayName: null,
        userEmail: null,
        userPhotoUrl: null,
    });
}

export async function deleteCloudData(): Promise<void> {
    if (!uid) return;
    const { deleteSyncDoc } = await import("./firestore");
    await deleteSyncDoc(uid);
    const { signOut } = await import("./auth");
    await signOut();
    await stopCloudSync();
}

export async function forceSyncNow(): Promise<void> {
    if (!uid) return;
    updateSyncStore({ status: "syncing" });
    const { readSyncDoc } = await import("./firestore");
    const remote = await readSyncDoc(uid);
    if (remote) handleRemoteSnapshot(remote);
}
