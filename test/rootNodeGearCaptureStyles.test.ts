import { readFileSync } from "node:fs";

const css = readFileSync(
    new URL("../src/lib/buildImageExport/captureStyles.css", import.meta.url),
    "utf8",
);
const normalized = css.replace(/\s+/g, " ");

// Verify --gear-border-width is pinned for snapdom capture
if (!/html\.snapdom-capture\s+\.root-node-gear\s*\{[^}]*--gear-border-width:\s*2px\s*!important/.test(normalized)) {
    throw new Error(
        "captureStyles.css should pin --gear-border-width: 2px !important on .root-node-gear under html.snapdom-capture.",
    );
}
