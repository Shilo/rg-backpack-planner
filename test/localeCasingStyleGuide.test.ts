import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseLocale(path: string): Record<string, any> {
    return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function get(obj: Record<string, any>, path: string): unknown {
    return path.split(".").reduce((o: any, k: string) => o?.[k], obj);
}

function assertEq(locale: Record<string, any>, path: string, expected: string, code: string): void {
    const actual = get(locale, path);
    if (actual !== expected) {
        throw new Error(`[${code}] ${path}:\n  expected: "${expected}"\n  got:      "${actual}"`);
    }
}

function assertEndsWith(locale: Record<string, any>, path: string, suffix: string, code: string): void {
    const actual = get(locale, path) as string;
    if (!actual.endsWith(suffix)) {
        throw new Error(`[${code}] ${path}: should end with "${suffix}", got "${actual}"`);
    }
}

function assertNotEndsWith(locale: Record<string, any>, path: string, suffix: string, code: string): void {
    const actual = get(locale, path) as string;
    if (actual.endsWith(suffix)) {
        throw new Error(`[${code}] ${path}: should NOT end with "${suffix}", got "${actual}"`);
    }
}

const en = parseLocale("src/locales/en.json");
const ja = parseLocale("src/locales/ja.json");
const zh = parseLocale("src/locales/zh.json");

// --- en: Section headers → Title Case ---
assertEq(en, "sideMenu.sections.lookAndFeel", "Look and Feel", "en");
assertEq(en, "sideMenu.sections.controlsTab", "Side Menu Controls Tab", "en");

// --- en: Control labels (SegmentedControl) → Sentence case ---
assertEq(en, "settings.nodePrimaryActionTitle", "Node {primaryAction} action", "en");

// --- en: Buttons → Title Case ---
assertEq(en, "buildPresets.addNew", "Add New", "en");
assertEq(en, "buildPresets.deleteConfirmLabel", "Delete Preset", "en");
assertEq(en, "buildPresets.deleteAllConfirmLabel", "Delete All", "en");
assertEq(en, "share.copyScreenshot", "Share Screenshot", "en");
assertEq(en, "preview.sharePreviewBuild", "Share Preview Build", "en");
assertEq(en, "preview.loadModalConfirmLabel", "Preview Build", "en");
assertEq(en, "modal.previewBuildLabel", "Preview Build", "en");
assertEq(en, "modal.resetSettings.confirmLabel", "Reset Settings", "en");
assertEq(en, "modal.clearAllData.confirmLabel", "Clear All Data", "en");
assertEq(en, "install.buttonLabel", "Install App on {osName}", "en");

// --- en: Modal titles → Title Case ---
assertEq(en, "buildPresets.deleteModalTitle", "Delete Build Preset", "en");
assertEq(en, "buildPresets.deleteAllModalTitle", "Delete All Presets", "en");

// --- en: Modal descriptions → period at end ---
assertEndsWith(en, "buildPresets.renameModalMessage", ".", "en");
assertEndsWith(en, "buildPresets.newModalMessage", ".", "en");

// --- en: Controls descriptions → no trailing period ---
assertNotEndsWith(en, "controls.keyboardBackspaceResetDescription", ".", "en");
assertNotEndsWith(en, "controls.hudPreviewIndicatorDescription", ".", "en");

// --- ja: Modal descriptions → 。at end ---
assertEndsWith(ja, "buildPresets.renameModalMessage", "。", "ja");
assertEndsWith(ja, "buildPresets.newModalMessage", "。", "ja");

// --- ja: Controls descriptions → no trailing 。---
assertNotEndsWith(ja, "controls.keyboardBackspaceResetDescription", "。", "ja");
assertNotEndsWith(ja, "controls.hudPreviewIndicatorDescription", "。", "ja");

// --- zh: Modal descriptions → 。at end ---
assertEndsWith(zh, "buildPresets.renameModalMessage", "。", "zh");
assertEndsWith(zh, "buildPresets.newModalMessage", "。", "zh");

// --- zh: Controls descriptions → no trailing 。---
assertNotEndsWith(zh, "controls.keyboardBackspaceResetDescription", "。", "zh");
assertNotEndsWith(zh, "controls.hudPreviewIndicatorDescription", "。", "zh");
