# Cloud Save Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in realtime cloud syncing of build presets between devices using Firebase (Firestore + Google Sign-In), with per-preset merge.

**Architecture:** Firebase Auth (Google Sign-In cascade) provides identity. Cloud Firestore stores one document per user with presets as a map keyed by ID. A `cloudSyncService` bridges `buildPresetsStore` and Firestore with debounced partial writes and per-preset merge on incoming snapshots. All Firebase code is lazy-loaded. A `CLOUD_SAVE_ENABLED` kill switch disables the entire feature at compile time.

**Tech Stack:** Firebase JS SDK (modular), Svelte 5, TypeScript, Firestore, Firebase Auth

**Spec:** `docs/superpowers/specs/2026-03-16-cloud-save-design.md`

---

## Chunk 1: Foundation — Config, Types, and BuildPreset Breaking Change

### Task 1: Create worktree and branch

**Files:**
- None (git operation)

- [ ] **Step 1: Create worktree and feature branch**

```bash
cd c:/Programming_Files/Shilocity/rg-backpack-planner
git worktree add ../rg-backpack-planner-cloud-save -b feature/cloud-save
cd ../rg-backpack-planner-cloud-save
```

- [ ] **Step 2: Verify worktree is working**

```bash
cd c:/Programming_Files/Shilocity/rg-backpack-planner-cloud-save
git branch
npm run check
```

Expected: `* feature/cloud-save` and clean check output.

---

### Task 2: Add kill switch config

**Files:**
- Create: `src/config/cloudSave.ts`

- [ ] **Step 1: Create the config file**

```typescript
// src/config/cloudSave.ts
/**
 * Master kill switch for Cloud Save. When false, no Firebase modules are
 * imported, no sync logic runs, and no Cloud Save UI is rendered.
 * The bundler tree-shakes all Cloud Save code paths when disabled.
 */
export const CLOUD_SAVE_ENABLED = true;
```

- [ ] **Step 2: Run check**

```bash
npm run check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/config/cloudSave.ts
git commit -m "feat(cloud-save): add CLOUD_SAVE_ENABLED kill switch config"
```

---

### Task 3: Add `updatedAt` to `BuildPreset` and update all callsites

**Files:**
- Modify: `src/lib/buildPresetsStore.ts`
- Modify: `test/buildPresets.test.ts`

- [ ] **Step 1: Update `BuildPreset` interface**

In `src/lib/buildPresetsStore.ts`, add `updatedAt` to the interface:

```typescript
export interface BuildPreset {
    id: string;
    name: string;
    buildCode: string;
    updatedAt: number;
}
```

- [ ] **Step 2: Update `defaultPresetsData()`**

Add `updatedAt: Date.now()` to the default preset object:

```typescript
function defaultPresetsData(): BuildPresetsData {
    const defaultId = generatePresetId();
    const emptyBuildCode = encodeBuildData({
        trees: [[], [], []],
        owned: 0,
    });
    return {
        active: defaultId,
        presets: [
            { id: defaultId, name: DEFAULT_PRESET_NAME, buildCode: emptyBuildCode, updatedAt: Date.now() },
        ],
    };
}
```

- [ ] **Step 3: Update `validatePresetsData()` to backfill missing `updatedAt`**

In the preset construction inside the validation loop, backfill `updatedAt`:

```typescript
list.push({
    id: q.id,
    name: q.name.trim() || "Build",
    buildCode: q.buildCode,
    updatedAt: typeof q.updatedAt === "number" ? q.updatedAt : Date.now(),
});
```

- [ ] **Step 4: Update `addPreset()`**

Add `updatedAt: Date.now()` to the new preset:

```typescript
export function addPreset(name: string, buildCode: string): BuildPreset {
    const id = generatePresetId();
    const preset: BuildPreset = {
        id,
        name: name.trim() || "Build",
        buildCode,
        updatedAt: Date.now(),
    };
    buildPresetsStore.update((data) => ({
        ...data,
        presets: [...data.presets, preset],
    }));
    return preset;
}
```

- [ ] **Step 5: Update `updatePreset()`**

Set `updatedAt: Date.now()` on every update:

```typescript
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
                updatedAt: Date.now(),
            };
        }),
    }));
}
```

- [ ] **Step 6: Update `updateActivePresetBuildCode()`**

Set `updatedAt: Date.now()` on the active preset:

```typescript
export function updateActivePresetBuildCode(buildCode: string): void {
    buildPresetsStore.update((data) => {
        const activePreset = data.presets.find((p) => p.id === data.active);
        if (!activePreset) return data;
        return {
            ...data,
            presets: data.presets.map((p) =>
                p.id === data.active ? { ...p, buildCode, updatedAt: Date.now() } : p,
            ),
        };
    });
}
```

- [ ] **Step 7: Update test file**

In `test/buildPresets.test.ts`, add `updatedAt` to all test preset objects. Any preset object like `{ id: "...", name: "...", buildCode: "..." }` should become `{ id: "...", name: "...", buildCode: "...", updatedAt: 1000 }` (use a fixed timestamp for deterministic tests). Also add a test that `validatePresetsData` backfills missing `updatedAt`.

- [ ] **Step 8: Run tests**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/buildPresetsStore.ts test/buildPresets.test.ts
git commit -m "feat(cloud-save): add updatedAt to BuildPreset, backfill in validation"
```

---

### Task 4: Install Firebase SDK

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install firebase**

```bash
npm install firebase
```

- [ ] **Step 2: Run check**

```bash
npm run check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add firebase SDK dependency"
```

---

### Task 5: Create `cloudSyncStore.ts` (eager, tiny)

**Files:**
- Create: `src/lib/cloudSyncStore.ts`

This store has zero Firebase dependency. It's the only Cloud Save module loaded eagerly. UI components read from it to decide icon states.

- [ ] **Step 1: Create the store**

```typescript
// src/lib/cloudSyncStore.ts
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
```

- [ ] **Step 2: Run check**

```bash
npm run check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/cloudSyncStore.ts
git commit -m "feat(cloud-save): add cloudSyncStore (eager, no Firebase dep)"
```

---

## Chunk 2: Firebase Modules (All Lazy-Loaded)

### Task 6: Create Firebase config module

**Files:**
- Create: `src/lib/cloudSync/config.ts`

This module initializes the Firebase app. It is lazy-loaded — only imported when Cloud Save is activated.

- [ ] **Step 1: Create a Firebase project**

Go to https://console.firebase.google.com/ and create a project for Backpack Planner. Enable Google Sign-In in Authentication. Create a Firestore database. Copy the web app config values.

- [ ] **Step 2: Create the config file**

```typescript
// src/lib/cloudSync/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore, memoryLocalCache, type Firestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
};

function getFirebaseApp() {
    return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}

export function getFirebaseAuth() {
    return getAuth(getFirebaseApp());
}

let firestoreInstance: Firestore | null = null;

/**
 * Returns the Firestore instance with offline persistence disabled.
 * Uses memoryLocalCache() so the app relies on localStorage as its cache
 * instead of Firestore's IndexedDB cache.
 */
export function getFirebaseFirestore(): Firestore {
    if (firestoreInstance) return firestoreInstance;
    try {
        firestoreInstance = initializeFirestore(getFirebaseApp(), {
            localCache: memoryLocalCache(),
        });
    } catch {
        // Already initialized (e.g., hot module reload)
        firestoreInstance = getFirestore(getFirebaseApp());
    }
    return firestoreInstance;
}
```

- [ ] **Step 3: Run check**

```bash
npm run check
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/cloudSync/config.ts
git commit -m "feat(cloud-save): add Firebase config module (lazy)"
```

---

### Task 7: Create auth module

**Files:**
- Create: `src/lib/cloudSync/auth.ts`

Implements the cascading Google Sign-In flow: One Tap → popup → redirect. Exposes sign-in, sign-out, and auth state listener.

- [ ] **Step 1: Create the auth file**

```typescript
// src/lib/cloudSync/auth.ts
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    onAuthStateChanged,
    type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./config";

const provider = new GoogleAuthProvider();

/**
 * Cascading Google Sign-In: popup → redirect.
 * Returns the signed-in user or throws on complete failure.
 *
 * Future: Google One Tap can be added by loading the GIS script
 * (https://accounts.google.com/gsi/client) and calling google.accounts.id.prompt()
 * before the popup attempt.
 */
export async function signIn(): Promise<User> {
    const auth = getFirebaseAuth();

    // Try popup
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (popupError: unknown) {
        const code = (popupError as { code?: string })?.code;
        if (
            code === "auth/popup-blocked" ||
            code === "auth/popup-closed-by-user" ||
            code === "auth/cancelled-popup-request"
        ) {
            // Fall back to redirect
            await signInWithRedirect(auth, provider);
            // signInWithRedirect navigates away; this line is not reached
            // but TypeScript needs a return.
            throw new Error("Redirecting to Google Sign-In");
        }
        throw popupError;
    }
}

/**
 * Must be called on app init to complete sign-in after a redirect return.
 * If the user signed in via redirect, this resolves the pending credential.
 * Safe to call when no redirect is pending — resolves to null.
 */
export async function handleRedirectResult(): Promise<User | null> {
    const auth = getFirebaseAuth();
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
}

export function signOut(): Promise<void> {
    const auth = getFirebaseAuth();
    return auth.signOut();
}

export function onAuthChanged(callback: (user: User | null) => void): () => void {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, callback);
}

export type { User };
```

Note: One Tap is omitted for now — it requires loading the GIS script and has complex interaction with Firebase Auth. The popup → redirect cascade is the reliable path. One Tap can be added later as an enhancement.

- [ ] **Step 2: Run check**

```bash
npm run check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/cloudSync/auth.ts
git commit -m "feat(cloud-save): add auth module with cascading Google Sign-In"
```

---

### Task 8: Create Firestore module

**Files:**
- Create: `src/lib/cloudSync/firestore.ts`

Handles all Firestore operations: read, partial write, delete, listen. This is the only module that touches Firestore SDK.

- [ ] **Step 1: Create the Firestore module**

```typescript
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
```

- [ ] **Step 2: Run check**

```bash
npm run check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/cloudSync/firestore.ts
git commit -m "feat(cloud-save): add Firestore module with partial write operations"
```

---

### Task 9: Create merge module (pure functions, no Firebase)

**Files:**
- Create: `src/lib/cloudSync/merge.ts`
- Create: `test/cloudSyncMerge.test.ts`

The merge module is the heart of the sync logic. It's a pure function module — no Firebase, no stores, no side effects. Takes local state + remote state + tracking sets, returns merged result.

- [ ] **Step 1: Write the merge tests**

Create `test/cloudSyncMerge.test.ts`:

```typescript
import { mergePresets, type MergeInput } from "../src/lib/cloudSync/merge.ts";
import type { BuildPreset } from "../src/lib/buildPresetsStore.ts";
import type { SyncDocument } from "../src/lib/cloudSync/firestore.ts";

function assertEqual(actual: unknown, expected: unknown, message: string): void {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        throw new Error(`${message}. Expected ${expectedJson}, got ${actualJson}`);
    }
}

function makePreset(id: string, name: string, updatedAt: number): BuildPreset {
    return { id, name, buildCode: `code-${id}`, updatedAt };
}

function makeRemote(presets: Record<string, { name: string; buildCode: string; updatedAt: number }>, order: string[]): SyncDocument {
    return { presets, order, revision: 1, updatedAt: null };
}

function remoteEntry(id: string, name: string, updatedAt: number) {
    return { name, buildCode: `code-${id}`, updatedAt };
}

try {
    // Test 1: Both have same preset — remote newer wins
    {
        const local = [makePreset("a", "Local A", 100)];
        const remote = makeRemote({ a: remoteEntry("a", "Remote A", 200) }, ["a"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets[0].name, "Remote A", "Test 1: remote newer should win");
        assertEqual(result.presets[0].updatedAt, 200, "Test 1: updatedAt should be remote's");
    }

    // Test 2: Both have same preset — local newer wins
    {
        const local = [makePreset("a", "Local A", 300)];
        const remote = makeRemote({ a: remoteEntry("a", "Remote A", 200) }, ["a"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets[0].name, "Local A", "Test 2: local newer should win");
    }

    // Test 3: Both have same preset — equal updatedAt keeps local
    {
        const local = [makePreset("a", "Local A", 200)];
        local[0].buildCode = "local-code";
        const remote = makeRemote({ a: { name: "Remote A", buildCode: "remote-code", updatedAt: 200 } }, ["a"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets[0].buildCode, "local-code", "Test 3: equal updatedAt should keep local");
    }

    // Test 4: Remote-only preset — added to local
    {
        const local = [makePreset("a", "A", 100)];
        const remote = makeRemote({
            a: remoteEntry("a", "A", 100),
            b: remoteEntry("b", "B", 200),
        }, ["a", "b"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets.length, 2, "Test 4: should have 2 presets");
        assertEqual(result.presets[1].name, "B", "Test 4: remote-only preset added");
    }

    // Test 5: Local-only preset, was in previous remote — deleted (remote deleted it)
    {
        const local = [makePreset("a", "A", 100), makePreset("b", "B", 100)];
        const remote = makeRemote({ a: remoteEntry("a", "A", 100) }, ["a"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a", "b"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a", "b"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets.length, 1, "Test 5: remotely deleted preset should be removed");
        assertEqual(result.presets[0].id, "a", "Test 5: only preset 'a' should remain");
    }

    // Test 6: Local-only preset, NOT in previous remote — kept (local addition)
    {
        const local = [makePreset("a", "A", 100), makePreset("c", "C", 100)];
        const remote = makeRemote({ a: remoteEntry("a", "A", 100) }, ["a"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a", "c"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets.length, 2, "Test 6: local addition should be kept");
        assertEqual(result.presets[1].id, "c", "Test 6: local-only preset 'c' kept");
    }

    // Test 7: Pending local deletion — skipped, not re-added from remote
    {
        const local = [makePreset("a", "A", 100)];
        const remote = makeRemote({
            a: remoteEntry("a", "A", 100),
            b: remoteEntry("b", "B", 200),
        }, ["a", "b"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a", "b"]), pendingLocalDeletions: new Set(["b"]),
        });
        assertEqual(result.presets.length, 1, "Test 7: pending deletion should not be re-added");
    }

    // Test 8: Order — remote order as base, local-only appended
    {
        const local = [makePreset("a", "A", 100), makePreset("b", "B", 100), makePreset("c", "C", 100)];
        const remote = makeRemote({
            b: remoteEntry("b", "B", 100),
            a: remoteEntry("a", "A", 100),
        }, ["b", "a"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a", "b", "c"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a", "b"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.order, ["b", "a", "c"], "Test 8: remote order + local-only appended");
    }

    // Test 9: Active ID invalidation — falls back to first preset
    {
        const local = [makePreset("a", "A", 100), makePreset("b", "B", 100)];
        const remote = makeRemote({ a: remoteEntry("a", "A", 100) }, ["a"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a", "b"], localActiveId: "b",
            remote, lastRemotePresetIds: new Set(["a", "b"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.activeId, "a", "Test 9: active should fall back to first when deleted");
    }

    // Test 10: Empty presets after merge — default created
    {
        const local = [makePreset("a", "A", 100)];
        const remote = makeRemote({}, []);
        const result = mergePresets({
            localPresets: local, localOrder: ["a"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets.length, 1, "Test 10: should create default when all deleted");
        assertEqual(result.presets[0].name, "Default", "Test 10: default preset name");
    }

    // Test 11: Multiple presets mixed scenario
    {
        const local = [
            makePreset("a", "Old A", 100),  // both have, remote newer
            makePreset("b", "Local B", 300), // both have, local newer
            makePreset("d", "Local D", 100), // local-only addition
        ];
        const remote = makeRemote({
            a: remoteEntry("a", "New A", 200),
            b: remoteEntry("b", "Remote B", 200),
            c: remoteEntry("c", "Remote C", 200),
        }, ["c", "a", "b"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a", "b", "d"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a", "b"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets.length, 4, "Test 11: should have 4 presets");
        assertEqual(result.presets[0].name, "Remote C", "Test 11: remote-only 'c' added");
        assertEqual(result.presets[1].name, "New A", "Test 11: remote newer 'a' wins");
        assertEqual(result.presets[2].name, "Local B", "Test 11: local newer 'b' wins");
        assertEqual(result.presets[3].name, "Local D", "Test 11: local addition 'd' appended");
        assertEqual(result.order, ["c", "a", "b", "d"], "Test 11: correct order");
    }

    console.log("  cloudSyncMerge: all 11 tests passed");
} catch (e) {
    console.error("  cloudSyncMerge: FAIL", e);
    process.exit(1);
}
```

- [ ] **Step 2: Register test in test runner**

In `test/index.ts`, add `"cloudSyncMerge.test.ts"` to the `TEST_FILES` array. Place it in the "Core State & Logic" section or create a new "Cloud Save" section comment.

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `mergePresets` does not exist yet.

- [ ] **Step 4: Create the merge module**

```typescript
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
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/cloudSync/merge.ts test/cloudSyncMerge.test.ts test/index.ts
git commit -m "feat(cloud-save): add per-preset merge algorithm with full test coverage"
```

---

## Chunk 3: Cloud Sync Service (Orchestrator)

### Task 10: Create the cloud sync service

**Files:**
- Create: `src/lib/cloudSync/service.ts`

This is the orchestrator. It bridges `buildPresetsStore` and Firestore. It manages the realtime listener, debounced writes, `lastRemotePresetIds`, and `pendingLocalDeletions`.

- [ ] **Step 1: Create the service module**

```typescript
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
```

- [ ] **Step 2: Run check**

```bash
npm run check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/cloudSync/service.ts
git commit -m "feat(cloud-save): add cloud sync service orchestrator"
```

---

### Task 11: Wire auth state to service on app boot

**Files:**
- Create: `src/lib/cloudSync/init.ts`

This module is the lazy-loaded entry point. It checks for an existing Firebase Auth session on boot and starts the sync service if found.

- [ ] **Step 1: Create the init module**

```typescript
// src/lib/cloudSync/init.ts
import { onAuthChanged, handleRedirectResult, type User } from "./auth";
import { startCloudSync, stopCloudSync } from "./service";

let initialized = false;

/**
 * Called once on app boot (if CLOUD_SAVE_ENABLED) or when user taps Cloud Save.
 * Handles pending redirect sign-in (if user was redirected to Google and came back),
 * then listens for auth state changes and starts/stops sync accordingly.
 */
export async function initCloudSync(): Promise<void> {
    if (initialized) return;
    initialized = true;

    // Complete any pending redirect sign-in (no-op if none pending)
    await handleRedirectResult().catch(() => {});

    onAuthChanged((user: User | null) => {
        if (user) {
            void startCloudSync(user.uid, {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
            });
        } else {
            void stopCloudSync();
        }
    });
}

export function resetInitialized(): void {
    initialized = false;
}
```

- [ ] **Step 2: Run check**

```bash
npm run check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/cloudSync/init.ts
git commit -m "feat(cloud-save): add init module for auth state → sync lifecycle"
```

---

## Chunk 4: UI — Side Menu, Context Menu, HUD Indicator

### Task 12: Create CloudSyncIndicator component

**Files:**
- Create: `src/lib/cloudSync/CloudSyncIndicator.svelte`

Modular icon component. Renders the appropriate icon based on sync state. Used by both the HUD toggle button and the Cloud Save menu button.

- [ ] **Step 1: Create the component**

```svelte
<!-- src/lib/cloudSync/CloudSyncIndicator.svelte -->
<script lang="ts">
    import { CloudArrowUpIcon, CloudCheckIcon, CloudWarningIcon } from "phosphor-svelte";
    import { isCloudSyncEnabled, isCloudSyncing, isCloudSyncError } from "../cloudSyncStore";

    export let size: number | string = 26;
    export let showIdleState = false;

    $: syncing = $isCloudSyncing;
    $: error = $isCloudSyncError;
    $: enabled = $isCloudSyncEnabled;
</script>

{#if error}
    <CloudWarningIcon {size} class="cloud-sync-icon cloud-sync-icon--error" />
{:else if syncing}
    <CloudArrowUpIcon {size} class="cloud-sync-icon cloud-sync-icon--syncing" />
{:else if enabled && showIdleState}
    <CloudCheckIcon {size} class="cloud-sync-icon cloud-sync-icon--idle" />
{/if}

<style>
    :global(.cloud-sync-icon--syncing) {
        animation: cloud-sync-pulse 0.8s ease-in-out;
    }

    @media (prefers-reduced-motion: reduce) {
        :global(.cloud-sync-icon--syncing) {
            animation: none;
        }
    }

    @keyframes cloud-sync-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }

    :global(.cloud-sync-icon--error) {
        color: var(--danger-text);
    }
</style>
```

- [ ] **Step 2: Run check**

```bash
npm run check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/cloudSync/CloudSyncIndicator.svelte
git commit -m "feat(cloud-save): add CloudSyncIndicator modular component"
```

---

### Task 13: Extract side menu toggle button into modular component

**Files:**
- Create: `src/lib/buttons/MenuToggleButton.svelte`
- Modify: `src/lib/TreeTabs.svelte`

Extract the ListIcon menu button from TreeTabs into its own component so it can swap icons based on sync state.

- [ ] **Step 1: Create MenuToggleButton component**

```svelte
<!-- src/lib/buttons/MenuToggleButton.svelte -->
<script lang="ts">
    import { ListIcon, CloudArrowUpIcon, CloudWarningIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import { CLOUD_SAVE_ENABLED } from "../../config/cloudSave";
    import { isCloudSyncing, isCloudSyncError } from "../cloudSyncStore";
    import { t } from "svelte-whisper";

    export let onClick: (() => void) | null = null;

    $: icon = (CLOUD_SAVE_ENABLED && $isCloudSyncError)
        ? CloudWarningIcon
        : (CLOUD_SAVE_ENABLED && $isCloudSyncing)
            ? CloudArrowUpIcon
            : ListIcon;
</script>

<Button
    class="menu-button"
    aria-label="Menu"
    tooltipText={$t("tree.menuButtonTooltip")}
    on:click={() => onClick?.()}
    {icon}
    iconClass="menu-button-icon {CLOUD_SAVE_ENABLED && $isCloudSyncing ? 'cloud-sync-icon--syncing' : ''}"
    iconSize={26}
/>
```

- [ ] **Step 2: Replace the menu button in TreeTabs.svelte**

Find the existing menu button in `TreeTabs.svelte` (the `<Button class="menu-button" ...>` with `icon={ListIcon}`) and replace it with:

```svelte
<MenuToggleButton onClick={() => onMenuClick?.()} />
```

Add the import at the top:
```typescript
import MenuToggleButton from "./buttons/MenuToggleButton.svelte";
```

Remove the `ListIcon` import if it's no longer used elsewhere.

- [ ] **Step 3: Run check**

```bash
npm run check
```

Expected: PASS

- [ ] **Step 4: Run full tests**

```bash
npm test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/buttons/MenuToggleButton.svelte src/lib/TreeTabs.svelte
git commit -m "refactor: extract MenuToggleButton with cloud sync indicator support"
```

---

### Task 14: Add Cloud Save button to the settings page

**Files:**
- Modify: `src/lib/sideMenuPages/GeneralSettingsPage.svelte`
- Modify: `src/locales/en.json`, `src/locales/ja.json`, `src/locales/zh.json`, `src/locales/fr.json`

- [ ] **Step 1: Add locale keys for Cloud Save**

Add a `cloudSave` section to `src/locales/en.json`:

```json
"cloudSave": {
    "label": "Cloud Save",
    "description": "Sync builds across devices",
    "enabledToast": "Cloud Save enabled",
    "errorToast": "Couldn't connect. Try again.",
    "sizeLimitToast": "Too many builds to sync. Delete some builds to resume syncing.",
    "signOut": "Sign Out",
    "deleteCloudData": "Delete Cloud Data",
    "syncNow": "Sync Now",
    "lastSynced": "Last synced {time}",
    "justNow": "just now",
    "minutesAgo": "{count}m ago",
    "hoursAgo": "{count}h ago",
    "buildsSynced": "{count} builds synced",
    "revision": "Revision {number}",
    "signOutFooter": "Signing out keeps your builds on this device but stops syncing.",
    "deleteConfirmTitle": "Delete Cloud Data",
    "deleteConfirmMessage": "This permanently removes your builds from the cloud. This cannot be undone. Builds on this device will be kept.",
    "deleteConfirmLabel": "Delete"
}
```

Add the same keys to `ja.json`, `zh.json`, and `fr.json` with appropriate translations. (Use the project's `/regenerate-locales` skill if available, or add English placeholders to be translated later.)

- [ ] **Step 2: Add Cloud Save button to GeneralSettingsPage**

In `src/lib/sideMenuPages/GeneralSettingsPage.svelte`, add a Cloud Save button inside the "Application" `SideMenuSection`, guarded by `CLOUD_SAVE_ENABLED`:

```svelte
<script lang="ts">
    // ... existing imports ...
    import { CLOUD_SAVE_ENABLED } from "../../config/cloudSave";
    import { cloudSyncStore } from "../cloudSyncStore";
    import { CloudIcon, CloudCheckIcon } from "phosphor-svelte";

    // ... existing code ...

    let cloudSaveMenuOpen = false;
    let cloudSaveButtonEl: HTMLButtonElement | null = null;
    let cloudSaveMenuX = 0;
    let cloudSaveMenuY = 0;

    async function handleCloudSaveClick() {
        if ($cloudSyncStore.enabled) {
            // Open context menu
            if (cloudSaveButtonEl) {
                const rect = cloudSaveButtonEl.getBoundingClientRect();
                cloudSaveMenuX = rect.left + rect.width / 2;
                cloudSaveMenuY = rect.top;
            }
            cloudSaveMenuOpen = true;
        } else {
            // Sign in
            try {
                const { signIn } = await import("../cloudSync/auth");
                const { initCloudSync } = await import("../cloudSync/init");
                initCloudSync();
                await signIn();
                showToast($t("cloudSave.enabledToast"));
            } catch (error) {
                console.error("Cloud Save sign-in failed:", error);
                showToast($t("cloudSave.errorToast"), { tone: "negative" });
            }
        }
    }
</script>
```

And in the template, inside the Application section:

```svelte
{#if CLOUD_SAVE_ENABLED}
    <Button
        on:click={handleCloudSaveClick}
        bind:element={cloudSaveButtonEl}
        description={$t("cloudSave.description")}
        icon={$cloudSyncStore.enabled ? CloudCheckIcon : CloudIcon}
        positive={$cloudSyncStore.enabled}
    >
        {$t("cloudSave.label")}
    </Button>
{/if}
```

- [ ] **Step 3: Run check**

```bash
npm run check
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/sideMenuPages/GeneralSettingsPage.svelte src/locales/en.json src/locales/ja.json src/locales/zh.json src/locales/fr.json
git commit -m "feat(cloud-save): add Cloud Save button to settings page with locale keys"
```

---

### Task 15: Create Cloud Save context menu

**Files:**
- Create: `src/lib/cloudSync/CloudSaveMenu.svelte`
- Modify: `src/lib/sideMenuPages/GeneralSettingsPage.svelte`

Use the `/frontend-design` skill when implementing this component. The context menu should show profile info, sync status, and actions.

- [ ] **Step 1: Design and create CloudSaveMenu component**

Invoke `/frontend-design` to create a polished Cloud Save context menu. The component should:

- Accept props: `isOpen`, `x`, `y`, `onClose`
- Use the existing `ContextMenu` component
- Show: Google profile picture (circular avatar), display name, email
- Show: last synced time, revision number, preset count
- Actions: Sync now, Sign out, Delete cloud data
- Footer note explaining sign-out behavior
- Use the `openModal` pattern for the delete confirmation
- Read all data from `cloudSyncStore`

- [ ] **Step 2: Wire CloudSaveMenu into GeneralSettingsPage**

In `GeneralSettingsPage.svelte`, import and render the menu:

```svelte
{#if CLOUD_SAVE_ENABLED && cloudSaveMenuOpen}
    <CloudSaveMenu
        isOpen={cloudSaveMenuOpen}
        x={cloudSaveMenuX}
        y={cloudSaveMenuY}
        onClose={() => { cloudSaveMenuOpen = false; }}
    />
{/if}
```

- [ ] **Step 3: Run check and test**

```bash
npm test
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/cloudSync/CloudSaveMenu.svelte src/lib/sideMenuPages/GeneralSettingsPage.svelte
git commit -m "feat(cloud-save): add Cloud Save context menu with profile and sync info"
```

---

## Chunk 5: Integration, clearAll Hook, Firestore Rules, and Boot Init

### Task 16: Hook `clearAll()` to sign out of Cloud Save

**Files:**
- Modify: `src/lib/sideMenuPages/GeneralSettingsPage.svelte`

- [ ] **Step 1: Update `handleClearAllData` to sign out first**

In `GeneralSettingsPage.svelte`, update the `handleClearAllData` function:

```typescript
function handleClearAllData() {
    openModal({
        type: "confirm",
        title: $t("modal.clearAllData.title"),
        titleIcon: TrashSimpleIcon as unknown as Component,
        message: $t("modal.clearAllData.message"),
        confirmLabel: $t("modal.clearAllData.confirmLabel"),
        cancelLabel: $t("common.cancel"),
        confirmNegative: true,
        onConfirm: async () => {
            try {
                if (CLOUD_SAVE_ENABLED && $cloudSyncStore.enabled) {
                    const { stopCloudSync } = await import("../cloudSync/service");
                    const { signOut } = await import("../cloudSync/auth");
                    await signOut();
                    await stopCloudSync();
                }
            } catch (error) {
                console.error("Cloud Save sign-out during clear all failed:", error);
            }
            clearAll();
            window.location.reload();
        },
    });
}
```

- [ ] **Step 2: Run check**

```bash
npm run check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/sideMenuPages/GeneralSettingsPage.svelte
git commit -m "feat(cloud-save): sign out of Cloud Save on clearAll"
```

---

### Task 17: Add Cloud Save boot initialization

**Files:**
- Modify: `src/App.svelte` (or the appropriate top-level component)

On app boot, if `CLOUD_SAVE_ENABLED`, lazily check for an existing Firebase Auth session and start sync if found.

- [ ] **Step 1: Add boot init to App.svelte**

Add the `CLOUD_SAVE_ENABLED` import at the top of `App.svelte`'s `<script>` block:

```typescript
import { CLOUD_SAVE_ENABLED } from "./config/cloudSave";
```

Then add the following code **inside the existing `onMount` callback** (at the top of the existing onMount body):

```typescript
    if (CLOUD_SAVE_ENABLED) {
        // Lazy-load and init cloud sync if user has an existing session
        import("./lib/cloudSync/init").then(({ initCloudSync }) => {
            initCloudSync();
        });
    }
```

Do NOT create a second `onMount` — add this inside the existing one.

- [ ] **Step 2: Run check**

```bash
npm run check
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/App.svelte
git commit -m "feat(cloud-save): lazy-load cloud sync on app boot if session exists"
```

---

### Task 18: Create Firestore security rules

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: Create the rules file**

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Private sync document — one per user
    match /sync/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId
                      && request.resource.size < 50000;
    }

    // Future: Public leaderboard (not implemented yet)
    // match /publishedBuilds/{docId} {
    //   allow read: if true;
    //   allow write: if request.auth != null && request.auth.uid == resource.data.ownerUid;
    // }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: Deploy rules to Firebase**

```bash
# If using Firebase CLI:
# firebase deploy --only firestore:rules
# Or deploy via the Firebase Console UI
```

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(cloud-save): add Firestore security rules"
```

---

_(Task 19 merged into Task 6 — config.ts is created with offline persistence disabled from the start.)_

---

### Task 20: Final integration test and cleanup

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 2: Run dev server and manual smoke test**

```bash
npm run dev
```

Verify:
- App loads normally with `CLOUD_SAVE_ENABLED = true`
- Cloud Save button appears in Settings > Application
- Set `CLOUD_SAVE_ENABLED = false` and verify:
  - No Cloud Save button in settings
  - No Firebase imports (check Network tab in DevTools)
  - App behaves exactly as before

- [ ] **Step 3: Build for production**

```bash
npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 4: Commit any cleanup**

```bash
git add -A
git commit -m "chore(cloud-save): integration cleanup and smoke test pass"
```

---

## Chunk 6: Leaderboard Forward-Compatibility Reference

This section is documentation only — no code is implemented. It serves as a reference for the future leaderboard feature.

### Leaderboard Implementation Reference (Future Work)

#### Current Cloud Save Placeholder

The Cloud Save system establishes the foundation for a future leaderboard:

- **Identity:** Firebase UID is the stable owner key for both private sync and future public leaderboard entries.
- **Firestore structure:** The `sync/{uid}` collection handles private data. A future `publishedBuilds/{docId}` collection is reserved for public leaderboard entries.
- **Security rules:** `firestore.rules` contains a commented-out stub for `publishedBuilds` with public read / owner-write access.

#### Steps to Implement Leaderboard

1. **Define the `publishedBuilds` collection schema:**
   ```json
   {
     "presetId": "uuid",
     "presetName": "Build Name",
     "buildCode": "encoded-build-string",
     "displayName": "Player Name",
     "spent": 12345,
     "ownerUid": "firebase-uid",
     "publishedAt": "<server timestamp>",
     "updatedAt": "<server timestamp>"
   }
   ```

2. **Add a "Publish" action to the preset context menu:**
   - User picks one preset to publish.
   - User enters a display name (independent of Google name).
   - `spent` is derived server-side from `buildCode` to prevent cheating.

3. **Uncomment and refine Firestore security rules** for `publishedBuilds`:
   - Public read for all
   - Write only if `request.auth.uid == resource.data.ownerUid`
   - Validate `spent` server-side (Cloud Function)
   - Rate limit publishes

4. **Build the leaderboard UI (internal):**
   - A new side menu tab or page showing published builds sorted by `spent`
   - Each entry links to preview mode via `buildCode`
   - Search by display name or preset name

5. **Moderation tools:**
   - Firebase Console or admin Cloud Function to delete entries
   - Basic profanity filter on display names
   - Max display name length enforcement in security rules

6. **Alternative: External leaderboard (Softr):**
   - If building in-app UI is not desired, use Softr with `previewUrl` stored per record
   - See `docs/cloud-sync/external-leaderboard-research.md` for details

7. **If Discord login is needed later:**
   - The auth module (`cloudSync/auth.ts`) can be extended with a Discord OAuth path
   - If Discord becomes the primary identity, consider migrating to Supabase
   - See `docs/cloud-sync/discord-auth-research.md` for details

---

## File Map Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/config/cloudSave.ts` | Create | Kill switch constant |
| `src/lib/cloudSyncStore.ts` | Create | Sync state store (eager) |
| `src/lib/cloudSync/config.ts` | Create | Firebase init + offline persistence disabled (lazy) |
| `src/lib/cloudSync/auth.ts` | Create | Google Sign-In cascade (lazy) |
| `src/lib/cloudSync/firestore.ts` | Create | Firestore operations (lazy) |
| `src/lib/cloudSync/merge.ts` | Create | Per-preset merge algorithm (lazy) |
| `src/lib/cloudSync/service.ts` | Create | Sync orchestrator (lazy) |
| `src/lib/cloudSync/init.ts` | Create | Boot initialization (lazy) |
| `src/lib/cloudSync/CloudSyncIndicator.svelte` | Create | Sync status icon component |
| `src/lib/cloudSync/CloudSaveMenu.svelte` | Create | Cloud Save context menu |
| `src/lib/buttons/MenuToggleButton.svelte` | Create | Modular menu toggle with sync icon |
| `firestore.rules` | Create | Firestore security rules |
| `test/cloudSyncMerge.test.ts` | Create | Merge algorithm tests |
| `src/lib/buildPresetsStore.ts` | Modify | Add `updatedAt` to BuildPreset |
| `test/buildPresets.test.ts` | Modify | Update test fixtures for `updatedAt` |
| `test/index.ts` | Modify | Register merge test |
| `src/lib/TreeTabs.svelte` | Modify | Use MenuToggleButton |
| `src/lib/sideMenuPages/GeneralSettingsPage.svelte` | Modify | Add Cloud Save button + clearAll hook |
| `src/locales/en.json` | Modify | Add cloudSave locale keys |
| `src/locales/ja.json` | Modify | Add cloudSave locale keys |
| `src/locales/zh.json` | Modify | Add cloudSave locale keys |
| `src/locales/fr.json` | Modify | Add cloudSave locale keys |
| `src/App.svelte` | Modify | Boot init for existing sessions |
| `package.json` | Modify | Add firebase dependency |
