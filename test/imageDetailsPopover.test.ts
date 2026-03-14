import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const popoverPath = resolve("src/lib/ImageDetailsPopover.svelte");

if (!existsSync(popoverPath)) {
    throw new Error(
        "ImageDetailsPopover.svelte should exist as a separate component for image metadata display.",
    );
}

const source = readFileSync(popoverPath, "utf8");

if (!/import\s+ContextMenu/.test(source)) {
    throw new Error(
        "ImageDetailsPopover should import and use ContextMenu for the popover shell.",
    );
}

if (!/export let filename/.test(source)) {
    throw new Error(
        "ImageDetailsPopover should accept a filename prop.",
    );
}

if (!/export let naturalWidth/.test(source)) {
    throw new Error(
        "ImageDetailsPopover should accept a naturalWidth prop for image resolution.",
    );
}

if (!/export let naturalHeight/.test(source)) {
    throw new Error(
        "ImageDetailsPopover should accept a naturalHeight prop for image resolution.",
    );
}

if (!/export let fileSize/.test(source)) {
    throw new Error(
        "ImageDetailsPopover should accept a fileSize prop for blob byte size.",
    );
}

if (!/export let mimeType/.test(source)) {
    throw new Error(
        "ImageDetailsPopover should accept a mimeType prop for format display.",
    );
}

if (!/formatFileSize/.test(source)) {
    throw new Error(
        "ImageDetailsPopover should have a formatFileSize helper for human-readable byte display.",
    );
}

if (!/z-index-context-menu-over-modal/.test(source)) {
    throw new Error(
        "ImageDetailsPopover should use z-index-context-menu-over-modal to layer above the FullscreenModal.",
    );
}

// Verify ComposeScreenshotContent wires up the popover
const composePath = resolve("src/lib/ComposeScreenshotContent.svelte");
const composeSource = readFileSync(composePath, "utf8");

if (!/import\s+ImageDetailsPopover/.test(composeSource)) {
    throw new Error(
        "ComposeScreenshotContent should import ImageDetailsPopover.",
    );
}

if (!/onTap=\{handleImageTap\}/.test(composeSource)) {
    throw new Error(
        "ComposeScreenshotContent should pass onTap to ImageViewer for popover trigger.",
    );
}

if (!/onImageLoad=\{handleImageLoad\}/.test(composeSource)) {
    throw new Error(
        "ComposeScreenshotContent should pass onImageLoad to ImageViewer for dimension tracking.",
    );
}
