import { mount } from "svelte";
import "./theme.css";
import "./app.css";
import App from "./App.svelte";
import { shouldPreventGlobalContextMenu } from "./lib/globalContextMenu";
import { initThemeReactivity } from "./lib/themeApply";
import { initializeI18n } from "./lib/i18n";

const cleanupThemeReactivity = initThemeReactivity();
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
if ("serviceWorker" in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    handleControllerChange = () => {
        if (hadController) {
            window.location.reload();
        }
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
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

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        cleanupThemeReactivity();
        document.removeEventListener("contextmenu", handleGlobalContextMenu, {
            capture: true,
        });
        if (handleControllerChange && "serviceWorker" in navigator) {
            navigator.serviceWorker.removeEventListener(
                "controllerchange",
                handleControllerChange,
            );
        }
    });
}

export default app;
