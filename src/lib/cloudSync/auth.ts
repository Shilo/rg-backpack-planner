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
