import { readFileSync } from "node:fs";

const src = readFileSync(
    new URL("../src/lib/RootNode.svelte", import.meta.url),
    "utf8",
);
const customIconsSource = readFileSync(
    new URL("../src/lib/customIcons.ts", import.meta.url),
    "utf8",
);

// 1. No Button component import (removes nested interactive element)
if (/import\s+Button\b/.test(src)) {
    throw new Error(
        "RootNode should not import the Button component — the gear shape uses a native <button>.",
    );
}

// 2. No GearSix icon import
if (/import.*GearSix/.test(src)) {
    throw new Error(
        "RootNode should not import GearSix — the gear should come from customIcons.",
    );
}

// 3. ROOT_SIZE updated to 44
if (!/ROOT_SIZE\s*=\s*44/.test(src)) {
    throw new Error(
        "ROOT_SIZE should be 44 (up from 32).",
    );
}

// 4. Button element has data-node-id="root"
if (!/<button[^>]*data-node-id="root"/.test(src) && !/<button[^>]*data-node-id=\{"root"\}/.test(src)) {
    throw new Error(
        'The <button> element should have data-node-id="root" for Tree.svelte pointer detection.',
    );
}

// 5. root-wrapper div should NOT have role="button" (no nested interactive)
if (/class="root-wrapper"[^>]*role="button"/.test(src)) {
    throw new Error(
        'root-wrapper should not have role="button" — it is a plain positioning div.',
    );
}

// 5b. Button element has tabindex="0" for keyboard focus
if (!/<button[^>]*tabindex="0"/.test(src)) {
    throw new Error(
        'The <button> should have tabindex="0" for keyboard focus.',
    );
}

// 5c. Button element has aria-label for accessibility
if (!/<button[^>]*aria-label/.test(src)) {
    throw new Error(
        "The <button> should have an aria-label for accessibility.",
    );
}

// 6. customIcons exports the shared RootNodeIcon component
if (!/import\s+RootNodeIcon\s+from\s+"\.\/RootNodeIcon\.svelte"/.test(customIconsSource)) {
    throw new Error(
        "customIcons should import RootNodeIcon from ./RootNodeIcon.svelte.",
    );
}

if (!/export\s+\{[^}]*TechCrystalIcon[^}]*RootNodeIcon[^}]*\}/.test(customIconsSource)) {
    throw new Error(
        "customIcons should re-export RootNodeIcon alongside TechCrystalIcon.",
    );
}

// 7. RootNode imports and renders the shared RootNodeIcon component
if (!/import\s+\{\s*RootNodeIcon\s*\}\s+from\s+"\.\/customIcons"/.test(src)) {
    throw new Error(
        "RootNode should import RootNodeIcon from ./customIcons.",
    );
}

if (!/<RootNodeIcon[^>]*aria-hidden="true"/.test(src)) {
    throw new Error(
        "RootNode should render RootNodeIcon with aria-hidden=\"true\" inside the gear button.",
    );
}

// 8. RootNode should not keep the old inline SVG gear markup
if (/<svg[^>]*viewBox="0 0 44 44"/.test(src)) {
    throw new Error(
        "RootNode should not keep an inline gear SVG once RootNodeIcon is extracted.",
    );
}

// 9. Uses drop-shadow with --shadow-node-hex token
if (!/drop-shadow\(var\(--shadow-node-hex\)\)/.test(src)) {
    throw new Error(
        "Gear button resting state should use drop-shadow(var(--shadow-node-hex)).",
    );
}

// 10. Root node should use the default neutral button palette
if (!/--root-gear-fill:\s*var\(--bg-raised\)/.test(src)) {
    throw new Error(
        "RootNode should use var(--bg-raised) for a calmer default button-like fill.",
    );
}

if (!/--root-gear-stroke:\s*var\(--border\)/.test(src)) {
    throw new Error(
        "RootNode should use var(--border) for the neutral default button outline.",
    );
}

// 11. Imports triggerHaptic for keyboard handler
if (!/import.*triggerHaptic.*from/.test(src)) {
    throw new Error(
        "RootNode should import triggerHaptic from hapticsStore for the keyboard handler.",
    );
}
