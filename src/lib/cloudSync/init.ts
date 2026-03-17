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
