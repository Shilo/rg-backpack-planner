export interface ServiceWorkerAutoUpdateOptions {
    showUpdatingToast: () => void;
}

export function initServiceWorkerAutoUpdate(
    options: ServiceWorkerAutoUpdateOptions,
): () => void {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
        return () => { };
    }

    const { showUpdatingToast } = options;
    const hadController = !!navigator.serviceWorker.controller;
    let updatingToastShown = false;

    const showUpdatingToastOnce = () => {
        if (updatingToastShown) return;
        updatingToastShown = true;
        showUpdatingToast();
    };

    let handleControllerChange: (() => void) | null = null;
    let handleUpdateFound: (() => void) | null = null;
    let handleInstallingStateChange: (() => void) | null = null;
    let registration: ServiceWorkerRegistration | null = null;
    let installingWorker: ServiceWorker | null = null;

    const attachInstallingWorkerListener = (worker: ServiceWorker | null) => {
        if (!worker) {
            return;
        }

        if (installingWorker && handleInstallingStateChange) {
            installingWorker.removeEventListener(
                "statechange",
                handleInstallingStateChange,
            );
        }

        installingWorker = worker;
        handleInstallingStateChange = () => {
            if (
                worker.state === "installing" ||
                worker.state === "installed" ||
                worker.state === "activating"
            ) {
                showUpdatingToastOnce();
            }
        };

        worker.addEventListener("statechange", handleInstallingStateChange);
        handleInstallingStateChange();
    };

    handleControllerChange = () => {
        if (!hadController) return;

        showUpdatingToastOnce();
        window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
        "controllerchange",
        handleControllerChange,
    );

    void navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
            if (!reg) {
                return;
            }

            registration = reg;
            handleUpdateFound = () => {
                attachInstallingWorkerListener(reg.installing);
            };

            reg.addEventListener("updatefound", handleUpdateFound);
            // Only attach to an actively installing worker on initial check.
            // A waiting worker is already installed — when it activates,
            // controllerchange fires (→ toast + reload). Attaching to
            // reg.waiting can show a permanent toast for a stale worker
            // that never activates.
            if (reg.installing) {
                attachInstallingWorkerListener(reg.installing);
            }
        })
        .catch((error) => {
            console.error("Failed to watch service worker updates.", error);
        });

    let isChecking = false;
    let lastCheckTime = 0;
    const THROTTLE_MS = 10000; // 10 seconds

    const requestUpdateCheck = async () => {
        if (isChecking || !registration) return;

        const now = Date.now();
        if (now - lastCheckTime < THROTTLE_MS) return;

        isChecking = true;
        lastCheckTime = now;
        try {
            await registration.update();
        } catch (error) {
            // Log but don't show negative toast for auto-checks
            console.error("Foreground service worker update check failed.", error);
        } finally {
            isChecking = false;
        }
    };

    const handleFocus = () => {
        void requestUpdateCheck();
    };

    const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            void requestUpdateCheck();
        }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener("visibilitychange", handleVisibilityChange);

        if (handleControllerChange) {
            navigator.serviceWorker.removeEventListener(
                "controllerchange",
                handleControllerChange,
            );
        }
        if (registration && handleUpdateFound) {
            registration.removeEventListener(
                "updatefound",
                handleUpdateFound,
            );
        }
        if (installingWorker && handleInstallingStateChange) {
            installingWorker.removeEventListener(
                "statechange",
                handleInstallingStateChange,
            );
        }
    };
}
