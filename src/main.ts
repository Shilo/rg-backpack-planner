import { mount } from "svelte";
import "./theme.css";
import "./app.css";
import App from "./App.svelte";
import { shouldPreventGlobalContextMenu } from "./lib/globalContextMenu";
import { initThemeReactivity, initUppercaseTextReactivity } from "./lib/themeApply";
import { initializeI18n } from "./lib/i18n";
import { initViewportTracking } from "./lib/viewportState";
import { showToast } from "./lib/toast";
import { get } from "svelte/store";
import { tr, locale } from "svelte-whisper";
import { initServiceWorkerAutoUpdate } from "./lib/serviceWorkerAutoUpdate";
import { undoHistory } from "./lib/undoHistoryStore";
import { runMigrations } from "./lib/migrations/runMigrations";

// Run migrations first to avoid storage races; see docs/version-migration-early-run.md
runMigrations();

const cleanupThemeReactivity = initThemeReactivity();
const cleanupUppercaseText = initUppercaseTextReactivity();
initViewportTracking();
try {
    await initializeI18n();
} catch (error) {
    console.error("Failed to initialize i18n. Continuing with fallback locale.", error);
}

function setHtmlLang(code: string | null | undefined) {
    document.documentElement.lang = code || "en";
}
setHtmlLang(get(locale));
const unsubLocale = locale.subscribe(setHtmlLang);

const app = mount(App, {
    target: document.getElementById("app")!,
});

const cleanupServiceWorkerAutoUpdate = initServiceWorkerAutoUpdate({
    showUpdatingToast: () => {
        showToast(tr("toast.updatingToast"), {
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
        unsubLocale();
        cleanupThemeReactivity();
        cleanupUppercaseText();
        removeGlobalContextMenuListener();
        cleanupServiceWorkerAutoUpdate();
    });
}

export default app;
