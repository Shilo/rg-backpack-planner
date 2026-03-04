import assert from "node:assert";
import {
    computeSkillBonuses,
    SKILL_DISPLAY_ORDER,
} from "../src/lib/skillBonusStore.ts";
import type { SkillId } from "../src/types/tree.ts";

// --- computeSkillBonuses tests ---

// Empty input returns empty map
{
    const result = computeSkillBonuses([], []);
    assert.strictEqual(result.size, 0);
}

// All-zero levels returns empty map
{
    const tabs = [
        {
            nodes: [
                { skillId: "attack_boost" as SkillId, maxLevel: 100 as const },
                { skillId: "hp_boost" as SkillId, maxLevel: 100 as const },
            ],
        },
    ];
    const levels = [[0, 0]];
    const result = computeSkillBonuses(levels, tabs);
    assert.strictEqual(result.size, 0);
}

// Single node with level > 0
{
    const tabs = [
        {
            nodes: [
                { skillId: "attack_boost" as SkillId, maxLevel: 100 as const },
            ],
        },
    ];
    const levels = [[1]];
    const result = computeSkillBonuses(levels, tabs);
    assert.strictEqual(result.size, 1);
    assert.strictEqual(result.get("attack_boost"), 5); // statTotalValue(1) = 5
}

// Duplicate skills across nodes are summed
{
    const tabs = [
        {
            nodes: [
                { skillId: "attack_boost" as SkillId, maxLevel: 100 as const },
                { skillId: "attack_boost" as SkillId, maxLevel: 100 as const },
            ],
        },
    ];
    const levels = [[1, 1]];
    const result = computeSkillBonuses(levels, tabs);
    assert.strictEqual(result.get("attack_boost"), 10); // 5 + 5
}

// Multiple trees with different skills
{
    const tabs = [
        {
            nodes: [
                { skillId: "attack_boost" as SkillId, maxLevel: 100 as const },
            ],
        },
        {
            nodes: [
                { skillId: "dodge" as SkillId, maxLevel: 100 as const },
            ],
        },
    ];
    const levels = [[10], [50]];
    const result = computeSkillBonuses(levels, tabs);
    assert.strictEqual(result.get("attack_boost"), 50); // statTotalValue(10) = 50
    assert.strictEqual(result.get("dodge"), 0.05); // dodgeTotalValue(50) = 0.05
}

// final_damage_boost at level 1
{
    const tabs = [
        {
            nodes: [
                { skillId: "final_damage_boost" as SkillId, maxLevel: 1 as const },
            ],
        },
    ];
    const levels = [[1]];
    const result = computeSkillBonuses(levels, tabs);
    assert.strictEqual(result.get("final_damage_boost"), 0.2);
}

// --- SKILL_DISPLAY_ORDER tests ---

// Contains all 18 skills
assert.strictEqual(SKILL_DISPLAY_ORDER.length, 18);

// No duplicates
assert.strictEqual(
    new Set(SKILL_DISPLAY_ORDER).size,
    SKILL_DISPLAY_ORDER.length,
);

// final_damage_boost is first (leaf)
assert.strictEqual(SKILL_DISPLAY_ORDER[0], "final_damage_boost");

// Stat skills are last (root)
const lastThree = SKILL_DISPLAY_ORDER.slice(-3);
assert.ok(lastThree.includes("attack_boost"));
assert.ok(lastThree.includes("hp_boost"));
assert.ok(lastThree.includes("defense_boost"));
