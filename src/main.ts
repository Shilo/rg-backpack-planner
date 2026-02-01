import { mount } from "svelte";
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
    console.log("Preventing global context menu", new Date().toISOString());
    event.preventDefault();
};

document.addEventListener("contextmenu", handleGlobalContextMenu, {
    capture: true,
});

export default app;
