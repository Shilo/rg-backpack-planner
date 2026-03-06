import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const segmentedControlPath = resolve("src/lib/SegmentedControl.svelte");
const segmentedControlSource = readFileSync(segmentedControlPath, "utf8");

if (!/role="radiogroup"/.test(segmentedControlSource)) {
    throw new Error(
        "SegmentedControl should expose radiogroup semantics for single-select options.",
    );
}

if (!/role="radio"/.test(segmentedControlSource)) {
    throw new Error(
        "SegmentedControl segments should expose radio semantics.",
    );
}

if (!/--segment-weight/.test(segmentedControlSource)) {
    throw new Error(
        "SegmentedControl should provide weighted segment sizing for mixed label lengths.",
    );
}

if (!/text-overflow:\s*ellipsis/.test(segmentedControlSource)) {
    throw new Error(
        "SegmentedControl segment labels should truncate with ellipsis when text overflows.",
    );
}

if (
    !/background:\s*color-mix\(\s*in srgb,\s*var\(--surface\)\s*78%,\s*var\(--accent\)\s*\)/.test(
        segmentedControlSource,
    )
) {
    throw new Error(
        "SegmentedControl selected state should match LanguageDropdown selected background color.",
    );
}

if (!/overflow:\s*hidden/.test(segmentedControlSource)) {
    throw new Error(
        "SegmentedControl container should clip segment row content to the outer radius.",
    );
}

if (!/class:with-header=\{!!label\}/.test(segmentedControlSource)) {
    throw new Error(
        "SegmentedControl should support a header divider state when label row is present.",
    );
}

if (
    !/\.segmented-control__segments\s*\{[\s\S]*?border:\s*none;[\s\S]*?border-radius:\s*0;/.test(
        segmentedControlSource,
    )
) {
    throw new Error(
        "SegmentedControl segment row should not have its own border or border-radius.",
    );
}

if (
    !/\.segmented-control__content\s*\{[\s\S]*?gap:\s*8px;/.test(
        segmentedControlSource,
    )
) {
    throw new Error(
        "SegmentedControl bottom row should keep an 8px gap between icon and segment group.",
    );
}

if (
    !/\.segmented-control__header-label\s*\{[\s\S]*?white-space:\s*normal;/.test(
        segmentedControlSource,
    )
) {
    throw new Error(
        "SegmentedControl header labels should wrap to multiple lines when needed.",
    );
}

if (
    !/\.segmented-control__content\.with-leading-icon\s+\.segmented-control__segments\s*\{[\s\S]*?border-left:\s*var\(--border-width\)\s*solid/.test(
        segmentedControlSource,
    )
) {
    throw new Error(
        "SegmentedControl should add a vertical divider between icon and segments for icon-only single-row layout.",
    );
}

if (!/size=\{26\}/.test(segmentedControlSource)) {
    throw new Error("SegmentedControl icons should use 26x26 sizing.");
}

if (
    !/\.segmented-control__header-icon,\s*\.segmented-control__leading-icon[\s\S]*?width:\s*26px;[\s\S]*?height:\s*26px;/.test(
        segmentedControlSource,
    )
) {
    throw new Error("SegmentedControl icon wrappers should be 26x26.");
}

const settingsPagePath = resolve("src/lib/sideMenuPages/SideMenuSettingsPage.svelte");
const settingsPageSource = readFileSync(settingsPagePath, "utf8");

const segmentedControlUsages =
    settingsPageSource.match(/<SegmentedControl[\s\S]*?\/>/g) ?? [];

if (segmentedControlUsages.length < 2) {
    throw new Error(
        "SideMenuSettingsPage should include two hardcoded SegmentedControl demo instances.",
    );
}

if (!/label="Demo segmented control"/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should include a labeled SegmentedControl demo instance.",
    );
}
