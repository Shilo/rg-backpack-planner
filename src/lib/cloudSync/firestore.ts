// src/lib/cloudSync/firestore.ts
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    deleteField,
    onSnapshot,
    increment,
    serverTimestamp,
    type DocumentSnapshot,
    type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseFirestore } from "./config";
import type { BuildPreset } from "../buildPresetsStore";

/** Shape of the Firestore document at sync/{uid} */
export interface SyncDocument {
    presets: Record<string, { name: string; buildCode: string; updatedAt: number }>;
    order: string[];
    revision: number;
    updatedAt: unknown; // Firestore server timestamp
}

function syncDocRef(uid: string) {
    return doc(getFirebaseFirestore(), "sync", uid);
}

export async function readSyncDoc(uid: string): Promise<SyncDocument | null> {
    const snap = await getDoc(syncDocRef(uid));
    if (!snap.exists()) return null;
    return snap.data() as SyncDocument;
}

export async function createSyncDoc(uid: string, presets: BuildPreset[], order: string[]): Promise<void> {
    const presetsMap: SyncDocument["presets"] = {};
    for (const p of presets) {
        presetsMap[p.id] = { name: p.name, buildCode: p.buildCode, updatedAt: p.updatedAt };
    }
    await setDoc(syncDocRef(uid), {
        presets: presetsMap,
        order,
        revision: 1,
        updatedAt: serverTimestamp(),
    });
}

export async function writePresetEdit(
    uid: string,
    presetId: string,
    preset: { name: string; buildCode: string; updatedAt: number },
): Promise<void> {
    await updateDoc(syncDocRef(uid), {
        [`presets.${presetId}.name`]: preset.name,
        [`presets.${presetId}.buildCode`]: preset.buildCode,
        [`presets.${presetId}.updatedAt`]: preset.updatedAt,
        revision: increment(1),
        updatedAt: serverTimestamp(),
    });
}

export async function writePresetAdd(
    uid: string,
    presetId: string,
    preset: { name: string; buildCode: string; updatedAt: number },
    order: string[],
): Promise<void> {
    await updateDoc(syncDocRef(uid), {
        [`presets.${presetId}`]: { name: preset.name, buildCode: preset.buildCode, updatedAt: preset.updatedAt },
        order,
        revision: increment(1),
        updatedAt: serverTimestamp(),
    });
}

export async function writePresetDelete(uid: string, presetId: string, order: string[]): Promise<void> {
    await updateDoc(syncDocRef(uid), {
        [`presets.${presetId}`]: deleteField(),
        order,
        revision: increment(1),
        updatedAt: serverTimestamp(),
    });
}

export async function writeReorder(uid: string, order: string[]): Promise<void> {
    await updateDoc(syncDocRef(uid), {
        order,
        revision: increment(1),
        updatedAt: serverTimestamp(),
    });
}

export async function deleteSyncDoc(uid: string): Promise<void> {
    await deleteDoc(syncDocRef(uid));
}

export function listenToSyncDoc(
    uid: string,
    onSnapshot_: (data: SyncDocument | null) => void,
    onError: (error: Error) => void,
): Unsubscribe {
    return onSnapshot(
        syncDocRef(uid),
        (snap: DocumentSnapshot) => {
            if (!snap.exists()) {
                onSnapshot_(null);
                return;
            }
            onSnapshot_(snap.data() as SyncDocument);
        },
        onError,
    );
}
