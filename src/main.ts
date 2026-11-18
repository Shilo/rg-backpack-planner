import { mount } from "svelte";
import "./theme.css";
import "./app.css";
import App from "./App.svelte";
import { shouldPreventGlobalContextMenu } from "./lib/globalContextMenu";
import {
    initThemeReactivity,
    initUppercaseTextReactivity,
    initReduceMotionReactivity,
} from "./lib/themeApply";
import { initializeI18n } from "./lib/i18n";
import { initViewportTracking } from "./lib/viewportState";
import { showToast } from "./lib/toast";
import { t } from "svelte-whisper";
import { initServiceWorkerAutoUpdate } from "./lib/serviceWorkerAutoUpdate";
import { undoHistory } from "./lib/undoHistoryStore";
import { runMigrations } from "./lib/migrations/runMigrations";

// Run migrations first to avoid storage races; see docs/version-migration-early-run.md
runMigrations();

const cleanupThemeReactivity = initThemeReactivity();
const cleanupUppercaseText = initUppercaseTextReactivity();
const cleanupReduceMotion = initReduceMotionReactivity();
initViewportTracking();
try {
    await initializeI18n();
} catch (error) {
    console.error("Failed to initialize i18n. Continuing with fallback locale.", error);
}

const app = mount(App, {
    target: document.getElementById("app")!,
});

const cleanupServiceWorkerAutoUpdate = initServiceWorkerAutoUpdate({
    showUpdatingToast: () => {
        showToast(t("toast.updatingToast"), {
            durationMs: 0,
            showSpinner: true,
        });
    },
    beforeReload: () => {
        undoHistory.persistToSession();
    },
});

// Auto-reload when a new service worker takes control (e.g., after a deploy).
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
        cleanupUppercaseText();
        cleanupReduceMotion();
        removeGlobalContextMenuListener();
        cleanupServiceWorkerAutoUpdate();
    });
}

export default app;
