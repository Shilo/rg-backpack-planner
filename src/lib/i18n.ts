import { init, registerLoader, tr } from "svelte-whisper";
import type { SkillId } from "../types/tree";

registerLoader("en", () => import("../locales/en.json"));
registerLoader("jp", () => import("../locales/jp.json"));
registerLoader("zh", () => import("../locales/zh.json"));

export async function initializeI18n(): Promise<void> {
    await init({
        fallback: "en",
        persist: "rg-backpack-planner-locale",
        detect: { ja: "jp", zh: "zh" },
    });
}

/**
 * Sync translation helper for modules outside Svelte component reactivity.
 * Prefer `$t(...)` in Svelte components whenever possible.
 */
export { tr };

export const CANONICAL_PRESET_NAMES = {
    default: "Default",
    new: "New",
    clone: "Clone",
} as const;

export function getSkillLabel(skillId: SkillId): string {
    return tr(`skills.${skillId}`);
}

export function getTreeLabel(treeId: "guardian" | "vanguard" | "cannon"): string {
    return tr(`trees.${treeId}`);
}

export function getTreeName(treeLabel: string): string {
    const trimmed = treeLabel.trim();
    return trimmed
        ? tr("trees.named", { label: trimmed })
        : tr("trees.generic");
}

export function getDisplayPresetName(name: string): string {
    const trimmed = name.trim();

    if (trimmed === CANONICAL_PRESET_NAMES.default) {
        return tr("buildPresets.generated.default");
    }
    if (trimmed === CANONICAL_PRESET_NAMES.new) {
        return tr("buildPresets.generated.new");
    }
    if (trimmed === CANONICAL_PRESET_NAMES.clone) {
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
