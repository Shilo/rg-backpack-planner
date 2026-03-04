import { readFileSync } from "node:fs";

const appCss = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");

const editableSurfaceRulePattern =
    /input,\s*textarea,\s*\[contenteditable\]:not\(\[contenteditable="false"\]\),\s*\[data-allow-native-contextmenu\]\s*\{[\s\S]*?user-select:\s*text;[\s\S]*?-webkit-user-select:\s*text;[\s\S]*?-webkit-touch-callout:\s*default;/m;

if (!editableSurfaceRulePattern.test(appCss)) {
    throw new Error(
        "Expected src/app.css to restore native text selection and callout behavior for editable surfaces.",
    );
}
