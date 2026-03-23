import assert from "node:assert";
import { readFileSync } from "node:fs";

type LocaleTree = Record<string, unknown>;

function collectStrings(
    obj: unknown,
    prefix: string,
    out: [path: string, value: string][],
): void {
    if (typeof obj === "string") {
        out.push([prefix, obj]);
    } else if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            collectStrings(obj[i], `${prefix}[${i}]`, out);
        }
    } else if (obj && typeof obj === "object") {
        for (const [key, value] of Object.entries(obj)) {
            collectStrings(value, prefix ? `${prefix}.${key}` : key, out);
        }
    }
}

const localeFiles = ["en.json", "ja.json", "zh.json", "fr.json"];

for (const file of localeFiles) {
    const locale = JSON.parse(
        readFileSync(`src/locales/${file}`, "utf8"),
    ) as LocaleTree;
    const entries: [string, string][] = [];
    collectStrings(locale, "", entries);

    for (const [path, value] of entries) {
        // Match any occurrence of "Crystal" or "Crystals" as a word
        const crystalPattern = /crystal(?:s)?\b/gi;
        let match: RegExpExecArray | null;

        while ((match = crystalPattern.exec(value)) !== null) {
            const idx = match.index;
            const preceding = value.slice(Math.max(0, idx - 5), idx);

            assert.ok(
                preceding.endsWith("Tech "),
                `${file} "${path}": "Crystal(s)" must be prefixed with "Tech". Found: "...${value.slice(Math.max(0, idx - 10), idx + match[0].length + 5)}..."`,
            );

            assert.strictEqual(
                value[idx],
                "C",
                `${file} "${path}": "Crystal" must be capitalized. Found: "${match[0]}"`,
            );

            assert.strictEqual(
                value[idx - 5],
                "T",
                `${file} "${path}": "Tech" must be capitalized. Found: "${value.slice(idx - 5, idx + match[0].length)}"`,
            );
        }
    }
}
