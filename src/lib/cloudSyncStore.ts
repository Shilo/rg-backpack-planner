import { writable, derived } from "svelte/store";
import { CLOUD_SAVE_ENABLED } from "../config/cloudSave";

export type CloudSyncStatus = "idle" | "syncing" | "error";

export interface CloudSyncState {
    enabled: boolean;
    status: CloudSyncStatus;
    lastSyncedAt: number | null;
    revision: number | null;
    presetCount: number | null;
    userDisplayName: string | null;
    userEmail: string | null;
    userPhotoUrl: string | null;
}

const defaultState: CloudSyncState = {
    enabled: false,
    status: "idle",
    lastSyncedAt: null,
    revision: null,
    presetCount: null,
    userDisplayName: null,
    userEmail: null,
    userPhotoUrl: null,
};

export const cloudSyncStore = writable<CloudSyncState>(defaultState);

export const isCloudSyncEnabled = derived(
    cloudSyncStore,
    ($store) => CLOUD_SAVE_ENABLED && $store.enabled,
);

export const isCloudSyncing = derived(
    cloudSyncStore,
    ($store) => $store.status === "syncing",
);

export const isCloudSyncError = derived(
    cloudSyncStore,
    ($store) => $store.status === "error",
);
