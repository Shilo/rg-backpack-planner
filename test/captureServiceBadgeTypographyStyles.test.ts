import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const source = readFileSync(captureServicePath, "utf8");

const requiredBadgeProperties = [
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "letter-spacing",
    "font-variant-numeric",
];

for (const property of requiredBadgeProperties) {
    const pattern = new RegExp(`"${property}"`);
    if (!pattern.test(source)) {
        throw new Error(
            `captureService should preserve node badge typography property: ${property}`,
        );
    }
}
