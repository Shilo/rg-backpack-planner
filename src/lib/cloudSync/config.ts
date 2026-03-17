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
