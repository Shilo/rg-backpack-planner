import assert from "node:assert";
import { readFileSync } from "node:fs";

type LocaleTree = Record<string, unknown>;

function parseLocale(path: string): LocaleTree {
    return JSON.parse(readFileSync(path, "utf8"));
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

const ja = parseLocale("src/locales/ja.json");

const EXPECTED_SHORT_LABELS: Record<string, string> = {
    "skills.short.attack_boost": "攻撃強化",
    "skills.short.hp_boost": "HP強化",
    "skills.short.defense_boost": "防御強化",
    "skills.short.global_def": "グロ防御",
    "skills.short.global_hp": "グロHP",
    "skills.short.final_damage_boost": "最終ダメ",
    "skills.short.global_atk": "グロ攻撃",
    "skills.short.skill_crit": "スキクリ",
    "skills.short.counterattack_resistance": "反撃耐性",
    "skills.short.critical_hit": "通常クリ",
    "skills.short.skill_crit_resistance": "スキクリ耐性",
    "skills.short.damage_reflection_chance": "ダメ反射",
};

for (const [path, expected] of Object.entries(EXPECTED_SHORT_LABELS)) {
    assert.strictEqual(
        get(ja, path),
        expected,
        `Expected compact Japanese short skill label at ${path}`,
    );
}

const SHORTER_THAN_FULL_KEYS = [
    "attack_boost",
    "defense_boost",
    "global_def",
    "global_hp",
    "final_damage_boost",
    "global_atk",
    "skill_crit",
    "critical_hit",
    "skill_crit_resistance",
    "damage_reflection_chance",
];

for (const key of SHORTER_THAN_FULL_KEYS) {
    const fullValue = get(ja, `skills.${key}`);
    const shortValue = get(ja, `skills.short.${key}`);
    assert.ok(
        shortValue.length < fullValue.length,
        `Expected skills.short.${key} to be shorter than skills.${key}`,
    );
}
