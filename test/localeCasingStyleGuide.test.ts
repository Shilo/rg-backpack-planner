import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseLocale(path: string): Record<string, any> {
    return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function get(obj: Record<string, any>, path: string): string {
    const value = path.split(".").reduce((o: any, k: string) => o?.[k], obj);
    if (typeof value !== "string") throw new Error(`Key not found or not a string: "${path}"`);
    return value;
}

// ---------------------------------------------------------------------------
// Casing validators
// ---------------------------------------------------------------------------

/** Prepositions, conjunctions, and articles that stay lowercase in title case
 *  (unless first or last token in the string). */
const SMALL_WORDS = new Set([
    "a", "an", "the", "and", "but", "or", "for", "nor",
    "on", "at", "to", "by", "in", "of", "up", "as", "is", "it", "its", "via", "vs",
]);

function isTemplateVar(token: string): boolean {
    return token.startsWith("{") && token.endsWith("}");
}

/** Every content word capitalized; small words lowercase except at token edges. */
function isTitleCase(str: string): boolean {
    const tokens = str.split(" ");
    const last = tokens.length - 1;
    for (let i = 0; i <= last; i++) {
        const tok = tokens[i];
        if (isTemplateVar(tok)) continue;
        const isEdge = i === 0 || i === last;
        if (SMALL_WORDS.has(tok.toLowerCase()) && !isEdge) {
            if (tok[0] !== tok[0].toLowerCase()) return false;
        } else {
            if (!tok[0] || tok[0] !== tok[0].toUpperCase()) return false;
        }
    }
    return true;
}

/** First real word capitalized; all subsequent real words lowercase (except proper nouns). */
const PROPER_NOUNS = new Set(["Tech", "Crystals", "Crystal"]);

function isSentenceCase(str: string): boolean {
    const tokens = str.split(" ");
    let seenFirst = false;
    for (const tok of tokens) {
        if (isTemplateVar(tok)) continue;
        if (!seenFirst) {
            seenFirst = true;
            if (!tok[0] || tok[0] !== tok[0].toUpperCase()) return false;
        } else {
            if (PROPER_NOUNS.has(tok)) continue;
            if (tok[0] !== tok[0].toLowerCase()) return false;
        }
    }
    return true;
}

// ---------------------------------------------------------------------------
// Style rule definitions
// ---------------------------------------------------------------------------

interface StyleRule {
    /** Casing to enforce for Latin-script locales; skipped for CJK. */
    casing?: "title" | "sentence";
    /** Punctuation rule applied to all locales. */
    punct?: "end" | "no-end";
}

const RULES: Record<string, StyleRule> = {
    "button":               { casing: "title" },
    "modal-title":          { casing: "title" },
    "section-header":       { casing: "title" },
    "control-label":        { casing: "title" },
    "modal-description":    { casing: "sentence", punct: "end" },
    "controls-description": { casing: "sentence", punct: "no-end" },
};

/** Period character per locale. */
const PERIOD: Record<string, string> = { en: ".", ja: "。", zh: "。" };

/** Locales that use non-Latin scripts — casing checks are skipped for these. */
const CJK_LOCALES = new Set(["ja", "zh"]);

// ---------------------------------------------------------------------------
// Key manifest: locale key → category
// ---------------------------------------------------------------------------

const KEY_CATEGORIES: Record<string, string> = {
    // Section headers
    "sideMenu.sections.lookAndFeel":             "section-header",

    // Control labels (SegmentedControl label props)
    "settings.nodePrimaryActionTitle":           "control-label",

    // Buttons / CTAs
    "share.shareTo":                             "button",
    "buildPresets.addNew":                       "button",
    "buildPresets.deleteConfirmLabel":            "button",
    "buildPresets.deleteAllConfirmLabel":         "button",
    "share.copyScreenshot":                      "button",
    "preview.sharePreviewBuild":                 "button",
    "preview.loadModalConfirmLabel":             "button",
    "modal.previewBuildLabel":                   "button",
    "modal.resetSettings.confirmLabel":          "button",
    "modal.clearAllData.confirmLabel":           "button",
    "install.buttonLabel":                       "button",
    "techCrystals.spentLabel":                   "button",

    // Modal titles
    "buildPresets.deleteModalTitle":             "modal-title",
    "buildPresets.deleteAllModalTitle":          "modal-title",

    // Modal descriptions (sentence case + period at end)
    "buildPresets.renameModalMessage":           "modal-description",
    "buildPresets.newModalMessage":              "modal-description",

    // Controls descriptions (sentence case + no trailing period)
    "controls.actions.resetTreeDesc": "controls-description",
    "controls.actions.previewIndicatorDesc":    "controls-description",
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateKey(
    locale: Record<string, any>,
    key: string,
    category: string,
    localeName: string,
): void {
    const value = get(locale, key);
    const rule = RULES[category];
    const isCJK = CJK_LOCALES.has(localeName);

    if (rule.casing && !isCJK) {
        if (rule.casing === "title" && !isTitleCase(value)) {
            throw new Error(`[${localeName}] ${key}: expected Title Case\n  got: "${value}"`);
        }
        if (rule.casing === "sentence" && !isSentenceCase(value)) {
            throw new Error(`[${localeName}] ${key}: expected Sentence case\n  got: "${value}"`);
        }
    }

    if (rule.punct) {
        const period = PERIOD[localeName] ?? ".";
        if (rule.punct === "end" && !value.endsWith(period)) {
            throw new Error(`[${localeName}] ${key}: should end with "${period}"\n  got: "${value}"`);
        }
        if (rule.punct === "no-end" && value.endsWith(period)) {
            throw new Error(`[${localeName}] ${key}: should NOT end with "${period}"\n  got: "${value}"`);
        }
    }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const LOCALES: Record<string, Record<string, any>> = {
    en: parseLocale("src/locales/en.json"),
    ja: parseLocale("src/locales/ja.json"),
    zh: parseLocale("src/locales/zh.json"),
};

for (const [key, category] of Object.entries(KEY_CATEGORIES)) {
    for (const [localeName, locale] of Object.entries(LOCALES)) {
        validateKey(locale, key, category, localeName);
    }
}
