import { mount } from "svelte";
import "./theme.css";
import "./app.css";
import App from "./App.svelte";
import { shouldPreventGlobalContextMenu } from "./lib/globalContextMenu";
import { initThemeReactivity } from "./lib/themeApply";
import { initializeI18n } from "./lib/i18n";
import { initViewportTracking } from "./lib/viewportState";
import { showToast } from "./lib/toast";
import { tr } from "svelte-whisper";

const cleanupThemeReactivity = initThemeReactivity();
initViewportTracking();
try {
    await initializeI18n();
} catch (error) {
    console.error("Failed to initialize i18n. Continuing with fallback locale.", error);
}

const app = mount(App, {
    target: document.getElementById("app")!,
});

// Auto-reload when a new service worker takes control (e.g., after a deploy).
// Track the initial controller so we only reload on updates, not first install.
let handleControllerChange: (() => void) | null = null;
let handleUpdateFound: (() => void) | null = null;
let handleInstallingStateChange: (() => void) | null = null;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
let installingWorker: ServiceWorker | null = null;
if ("serviceWorker" in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    let hasShownUpdatingToast = false;

    const showUpdatingToast = () => {
        if (!hadController || hasShownUpdatingToast) {
            return;
        }
        hasShownUpdatingToast = true;
        showToast(tr("toast.updatingToast"));
    };

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
                showUpdatingToast();
            }
        };

        worker.addEventListener("statechange", handleInstallingStateChange);
        handleInstallingStateChange();
    };

    handleControllerChange = () => {
        if (!hadController) {
            return;
        }

        showUpdatingToast();
        window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    void navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
            if (!registration) {
                return;
            }

            serviceWorkerRegistration = registration;
            handleUpdateFound = () => {
                attachInstallingWorkerListener(registration.installing);
            };

            registration.addEventListener("updatefound", handleUpdateFound);
            attachInstallingWorkerListener(
                registration.installing ?? registration.waiting,
            );
        })
        .catch((error) => {
            console.error("Failed to watch service worker updates.", error);
        });
}

const handleGlobalContextMenu = (event: MouseEvent) => {
    if (!shouldPreventGlobalContextMenu(event.target, import.meta.env.DEV)) {
        return;
    }

    event.preventDefault();
};

document.addEventListener("contextmenu", handleGlobalContextMenu, {
    capture: true,
});

const removeGlobalContextMenuListener = () => {
    document.removeEventListener("contextmenu", handleGlobalContextMenu, true);
};

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        cleanupThemeReactivity();
        removeGlobalContextMenuListener();
        if (handleControllerChange && "serviceWorker" in navigator) {
            navigator.serviceWorker.removeEventListener(
                "controllerchange",
                handleControllerChange,
            );
        }
        if (serviceWorkerRegistration && handleUpdateFound) {
            serviceWorkerRegistration.removeEventListener(
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
    });
}

export default app;
