import { mount } from "svelte";
import "./theme.css";
import "./app.css";
import App from "./App.svelte";
import { initThemeReactivity } from "./lib/themeApply";

initThemeReactivity();

const app = mount(App, {
    target: document.getElementById("app")!,
});

// Auto-reload when a new service worker takes control (e.g., after a deploy)
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
    });
}

const handleGlobalContextMenu = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (
        target?.closest(
            'input, textarea, [contenteditable="true"], [data-allow-native-contextmenu]',
        )
    ) {
        return;
    }
    event.preventDefault();
};

document.addEventListener("contextmenu", handleGlobalContextMenu, {
    capture: true,
});

export default app;
