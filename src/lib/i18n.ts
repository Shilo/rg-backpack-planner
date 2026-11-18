import { init, registerLoader, t, type Translate } from "svelte-whisper";
import { prefixKey } from "./storage";

export const FALLBACK_LOCALE = "en";

export async function initializeI18n(): Promise<void> {
    // One lazy chunk per locale file. The single `*` does not match glossary/.
    registerLoader(import.meta.glob("../locales/*.json"));

    await init({
        fallback: FALLBACK_LOCALE,
        persistKey: prefixKey("locale"),
    });
}

/** Components without runes pass `$t` as `translate` so the name follows a language switch. */
export function getDisplayPresetName(name: string, translate: Translate = t): string {
    const trimmed = name.trim();

    if (trimmed === "Default") {
        return translate("buildPresets.generated.default");
    }
    if (trimmed === "New") {
        return translate("buildPresets.generated.new");
    }
    if (trimmed === "Clone") {
        return translate("common.clone");
    }

    const newCount = trimmed.match(/^New\s+(\d+)$/i);
    if (newCount) {
        return translate("buildPresets.generated.newCount", { count: newCount[1] });
    }

    const cloneCount = trimmed.match(/^Clone\s+(\d+)$/i);
    if (cloneCount) {
        return translate("buildPresets.generated.cloneCount", { count: cloneCount[1] });
    }

    return name;
}
