import assert from "node:assert";
import { existsSync, readFileSync } from "node:fs";

type LocaleTree = Record<string, unknown>;

type TermMappingEntry = {
    source: string;
    target: string;
    evidence?: string;
    notes?: string;
};

type LocaleTermMappingFile = {
    locale: string;
    sourceLocale: string;
    mappings: Record<string, TermMappingEntry>;
};

function parseJsonFile<T>(path: string): T {
    return JSON.parse(readFileSync(path, "utf8")) as T;
}

function get(locale: LocaleTree, path: string): string {
    const value = path.split(".").reduce<unknown>((current, key) => {
        if (Array.isArray(current)) {
            return current[Number(key)];
        }
        if (current && typeof current === "object") {
            return (current as Record<string, unknown>)[key];
        }
        return undefined;
    }, locale);

    if (typeof value !== "string") {
        throw new Error(`Expected string at locale path "${path}"`);
    }

    return value;
}

function getBranch(locale: LocaleTree, path: string): unknown {
    return path.split(".").reduce<unknown>((current, key) => {
        if (Array.isArray(current)) {
            return current[Number(key)];
        }
        if (current && typeof current === "object") {
            return (current as Record<string, unknown>)[key];
        }
        return undefined;
    }, locale);
}

function collectStringPaths(value: unknown, prefix = ""): string[] {
    if (typeof value === "string") {
        return prefix ? [prefix] : [];
    }
    if (Array.isArray(value)) {
        return value.flatMap((entry, index) => collectStringPaths(entry, `${prefix}.${index}`));
    }
    if (value && typeof value === "object") {
        return Object.entries(value).flatMap(([key, entry]) => {
            const path = prefix ? `${prefix}.${key}` : key;
            return collectStringPaths(entry, path);
        });
    }
    return [];
}

const mappingPath = "src/locales/term-mappings/ja.json";
assert.ok(
    existsSync(mappingPath),
    `${mappingPath} should exist as the canonical Japanese in-game term map`,
);

const en = parseJsonFile<LocaleTree>("src/locales/en.json");
const ja = parseJsonFile<LocaleTree>("src/locales/ja.json");
const mapping = parseJsonFile<LocaleTermMappingFile>(mappingPath);

assert.strictEqual(mapping.locale, "ja", "mapping locale should be ja");
assert.strictEqual(mapping.sourceLocale, "en", "mapping sourceLocale should be en");

const requiredPaths = [
    "app.gameName",
    "trees.guardian",
    "skills.attack_boost",
    "skills.global_atk",
    "techCrystals.spentLabel",
];

for (const path of requiredPaths) {
    assert.ok(mapping.mappings[path], `expected required mapping for ${path}`);
}

for (const path of collectStringPaths(getBranch(en, "controls"), "controls")) {
    assert.ok(mapping.mappings[path], `expected authoritative controls mapping for ${path}`);
}

for (const [path, entry] of Object.entries(mapping.mappings)) {
    assert.ok(entry.source, `mapping ${path} should define source`);
    assert.ok(entry.target, `mapping ${path} should define target`);
    assert.strictEqual(
        get(en, path),
        entry.source,
        `mapping ${path} should match en.json source text`,
    );
    assert.strictEqual(
        get(ja, path),
        entry.target,
        `mapping ${path} should match ja.json target text`,
    );
}

const skillSource = readFileSync(".skills/regenerate-locales/SKILL.md", "utf8");
assert.match(
    skillSource,
    /src\/locales\/term-mappings\/<locale>\.json/,
    "regenerate-locales skill should document the per-locale term-mapping path",
);
assert.match(
    skillSource,
    /authoritative/i,
    "regenerate-locales skill should describe mapped in-game terms as authoritative",
);
assert.match(
    skillSource,
    /never overwrite|never override/i,
    "regenerate-locales skill should forbid overriding mapped in-game terms",
);
assert.match(
    skillSource,
    /apply.*after translation/i,
    "regenerate-locales skill should require reapplying mapped terms after translation",
);
assert.match(
    skillSource,
    /skills\.short/i,
    "regenerate-locales skill should document rules for skills.short labels",
);
assert.match(
    skillSource,
    /shorter character length|shorter length|compact/i,
    "regenerate-locales skill should say skills.short labels optimize for shorter character length",
);
assert.match(
    skillSource,
    /preserve context/i,
    "regenerate-locales skill should require preserving context for skills.short labels",
);
assert.match(
    skillSource,
    /in-game terminology|authoritative.*terminology/i,
    "regenerate-locales skill should keep skills.short labels anchored to in-game terminology",
);
