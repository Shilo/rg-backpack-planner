import { mount } from "svelte";
import "./theme.css";
import "./app.css";
import App from "./App.svelte";
import { shouldPreventGlobalContextMenu } from "./lib/globalContextMenu";
import { initThemeReactivity } from "./lib/themeApply";
import { initViewportTracking } from "./lib/viewportState";

const cleanupThemeReactivity = initThemeReactivity();
initViewportTracking();

const app = mount(App, {
    target: document.getElementById("app")!,
});

// Auto-reload when a new service worker takes control (e.g., after a deploy).
// Track the initial controller so we only reload on updates, not first install.
if ("serviceWorker" in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hadController) {
            window.location.reload();
        }
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
    });
}

export default app;
