import { init, registerLoader, tr } from "svelte-whisper";
import { prefixKey } from "./storage";

export async function initializeI18n(): Promise<void> {
    const localeModules = import.meta.glob("../locales/*.json");
    for (const [path, loader] of Object.entries(localeModules)) {
        const locale = path.match(/\/(\w+)\.json$/)?.[1];
        if (locale) registerLoader(locale, loader as () => Promise<Record<string, unknown>>);
    }

    await init({
        persistKey: prefixKey("locale"),
    });
}

export function getDisplayPresetName(name: string): string {
    const trimmed = name.trim();

    if (trimmed === "Default") {
        return tr("buildPresets.generated.default");
    }
    if (trimmed === "New") {
        return tr("buildPresets.generated.new");
    }
    if (trimmed === "Clone") {
        return tr("buildPresets.generated.clone");
    }

    const newCount = trimmed.match(/^New\s+(\d+)$/i);
    if (newCount) {
        return tr("buildPresets.generated.newCount", { count: newCount[1] });
    }

    const cloneCount = trimmed.match(/^Clone\s+(\d+)$/i);
    if (cloneCount) {
        return tr("buildPresets.generated.cloneCount", { count: cloneCount[1] });
    }

    return name;
}
