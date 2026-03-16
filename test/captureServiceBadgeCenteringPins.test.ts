import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureStylesPath = resolve("src/lib/buildImageExport/captureStyles.css");
const captureStyles = readFileSync(captureStylesPath, "utf8");
const normalized = captureStyles.replace(/\s+/g, " ");

const nodePath = resolve("src/lib/Node.svelte");
const nodeSource = readFileSync(nodePath, "utf8");

// --- Badge layout pins (universal, not behind media queries) ---

// Extract the html.snapdom-capture .node-badge rule block (outside any @media)
const badgePinBlock = (() => {
    // Find all top-level html.snapdom-capture .node-badge blocks
    // that are NOT inside @media queries.
    const mediaFreeBlocks: string[] = [];
    // Simple approach: split on @media and take content before any @media
    // OR after each @media block closes.
    const re = /html\.snapdom-capture\s+\.node-badge\s*\{([^}]+)\}/g;
    let match;
    while ((match = re.exec(normalized)) !== null) {
        // Check if this match is inside a @media block
        const textBefore = normalized.slice(0, match.index);
        const openBraces = (textBefore.match(/@media[^{]*\{/g) || []).length;
        const closeBraces = (textBefore.match(/\}\s*(?=html|\/\*|$)/g) || []).length;
        // Heuristic: if the last @media hasn't been closed, skip
        const insideMedia = textBefore.lastIndexOf("@media") > textBefore.lastIndexOf("}");
        if (!insideMedia) {
            mediaFreeBlocks.push(match[1]);
        }
    }
    return mediaFreeBlocks.join(" ");
})();

if (!/display:\s*inline-flex\s*!important/.test(badgePinBlock)) {
    throw new Error(
        "captureStyles.css must pin display: inline-flex !important on .node-badge " +
            "so flex centering survives snapdom serialization.",
    );
}

if (!/align-items:\s*center\s*!important/.test(badgePinBlock)) {
    throw new Error(
        "captureStyles.css must pin align-items: center !important on .node-badge " +
            "so text is vertically centered in the captured image.",
    );
}

if (!/justify-content:\s*center\s*!important/.test(badgePinBlock)) {
    throw new Error(
        "captureStyles.css must pin justify-content: center !important on .node-badge " +
            "so text is horizontally centered in the captured image.",
    );
}

if (!/line-height:\s*1\s*!important/.test(badgePinBlock)) {
    throw new Error(
        "captureStyles.css must pin line-height: 1 !important on .node-badge " +
            "to prevent line-height: var(--leading-none) from failing to resolve.",
    );
}

if (!/padding:[^;]*!important/.test(badgePinBlock)) {
    throw new Error(
        "captureStyles.css must pin symmetric padding with !important on .node-badge " +
            "to ensure consistent badge sizing across platforms.",
    );
}

// --- Guard: no platform-specific badge text offset hacks ---

// The old asymmetric padding hack targeted mobile only; it broke iOS
// while trying to fix Android. Badge centering must be universal.
if (
    /@media[^{]*hover:\s*none[^{]*\{[^}]*\.node-badge\s*\{[^}]*padding-top/.test(
        normalized,
    )
) {
    throw new Error(
        "captureStyles.css must NOT use a mobile-only (@media hover:none) padding " +
            "hack on .node-badge — platform-specific offsets break other platforms. " +
            "Pin layout properties universally instead.",
    );
}

// Guard against re-introducing --badge-mobile-y-offset in Node.svelte.
// The variable was a workaround that shifted badge position on mobile during
// capture, breaking iOS while trying to fix Android. It has been fully removed.
if (/--badge-mobile-y-offset/.test(nodeSource)) {
    throw new Error(
        "Node.svelte must NOT use --badge-mobile-y-offset. Badge centering " +
            "should be handled by universal capture style pins in captureStyles.css.",
    );
}
