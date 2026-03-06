import { readFileSync } from "node:fs";

const appCss = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");

const suppressesGlobalFocusRings =
    /:focus,\s*:focus-visible(?:,\s*:focus-within)?\s*\{[\s\S]*?outline:\s*none\s*!important;[\s\S]*?outline-offset:\s*0\s*!important;/m;

if (!suppressesGlobalFocusRings.test(appCss)) {
    throw new Error(
        "Expected src/app.css to suppress default focus rings globally.",
    );
}

const keepsTextEntryFocusRings =
    /input:not\(\[type\]\):focus,\s*input:not\(\[type\]\):focus-visible,\s*input\[type="text"\]:focus,\s*input\[type="text"\]:focus-visible[\s\S]*?textarea:focus,\s*textarea:focus-visible[\s\S]*?\[contenteditable\]:not\(\[contenteditable="false"\]\):focus,\s*\[contenteditable\]:not\(\[contenteditable="false"\]\):focus-visible\s*\{[\s\S]*?outline:\s*2px\s+solid\s+var\(--border-focus\)\s*!important;[\s\S]*?outline-offset:\s*2px\s*!important;/m;

if (!keepsTextEntryFocusRings.test(appCss)) {
    throw new Error(
        "Expected src/app.css to keep visible focus rings for text-entry fields.",
    );
}
