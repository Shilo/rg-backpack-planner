import { mount } from "svelte";
import "./theme.css";
import "./app.css";
import App from "./App.svelte";
import { shouldPreventGlobalContextMenu } from "./lib/globalContextMenu";
import { initThemeReactivity } from "./lib/themeApply";
import { initViewportTracking } from "./lib/viewportState";

initThemeReactivity();
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

export default app;
