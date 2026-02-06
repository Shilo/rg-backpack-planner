import { mount } from "svelte";
import "./theme.css";
import "./app.css";
import App from "./App.svelte";

const app = mount(App, {
    target: document.getElementById("app")!,
});

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
