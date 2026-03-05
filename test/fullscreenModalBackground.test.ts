import assert from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const fullscreenModalPath = resolve("src/lib/FullscreenModal.svelte");
const source = readFileSync(fullscreenModalPath, "utf8");

if (!/background:\s*var\(--bg-modal,\s*var\(--surface\)\);/.test(source)) {
    assert.fail(
        "FullscreenModal should use --bg-modal (with --surface fallback) so fullscreen overlays are visually distinct from the base page background.",
    );
}
