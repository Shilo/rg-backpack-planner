import { readFileSync } from "node:fs";

const nodeComponent = readFileSync(
    new URL("../src/lib/Node.svelte", import.meta.url),
    "utf8",
);

const suppressesNodeFocusOutline =
    /:global\(\.button\.node:focus\)\s*,\s*:global\(\.button\.node:focus-visible\)\s*\{[^}]*outline:\s*none;/ms;

if (!suppressesNodeFocusOutline.test(nodeComponent)) {
    throw new Error(
        "Expected Node styles to suppress focus and focus-visible outlines for node buttons.",
    );
}
