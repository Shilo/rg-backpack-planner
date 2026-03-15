import { readFileSync } from "node:fs";

const src = readFileSync(
    new URL("../src/lib/RootNode.svelte", import.meta.url),
    "utf8",
);

// 1. No Button component import (removes nested interactive element)
if (/import\s+Button\b/.test(src)) {
    throw new Error(
        "RootNode should not import the Button component — the gear shape uses a native <button>.",
    );
}

// 2. No GearSix icon import (gear is SVG)
if (/import.*GearSix/.test(src)) {
    throw new Error(
        "RootNode should not import GearSix — the gear shape is an inline SVG.",
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

// 6. Contains an inline SVG with the gear path
if (!/<svg[^>]*viewBox/.test(src)) {
    throw new Error(
        "RootNode should contain an inline SVG element for the gear shape.",
    );
}

// 7. SVG path uses cubic bezier curves (C commands)
if (!/<path[^/]*d="[^"]*C\s/.test(src)) {
    throw new Error(
        "The gear SVG path should use cubic bezier curves (C commands) for smooth rounding.",
    );
}

// 8. SVG path has stroke for border
if (!/stroke-width:\s*3/.test(src)) {
    throw new Error(
        "The gear path should have stroke-width: 3 for the border.",
    );
}

// 9. Uses drop-shadow with --shadow-node-hex token
if (!/drop-shadow\(var\(--shadow-node-hex\)\)/.test(src)) {
    throw new Error(
        "Gear button resting state should use drop-shadow(var(--shadow-node-hex)).",
    );
}

// 10. Imports triggerHaptic for keyboard handler
if (!/import.*triggerHaptic.*from/.test(src)) {
    throw new Error(
        "RootNode should import triggerHaptic from hapticsStore for the keyboard handler.",
    );
}
