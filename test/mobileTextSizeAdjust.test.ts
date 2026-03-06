import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appCssPath = resolve("src/app.css");
const source = readFileSync(appCssPath, "utf8");

const htmlBodyBlockHasAdjustments =
    /html,\s*body\s*\{[\s\S]*text-size-adjust:\s*100%;[\s\S]*-webkit-text-size-adjust:\s*100%;[\s\S]*\}/m.test(
        source,
    );

if (!htmlBodyBlockHasAdjustments) {
    throw new Error(
        "html, body should include text-size-adjust and -webkit-text-size-adjust guards for mobile consistency.",
    );
}
