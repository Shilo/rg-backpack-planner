import assert from "node:assert";
import {
    statTotalValue,
    globalTotalValue,
    dodgeTotalValue,
    skillTypeTotalValue,
    finalDamageTotalValue,
} from "../src/config/skillValueFns.ts";

// statTotalValue tests
assert.strictEqual(statTotalValue(0), 0);
assert.strictEqual(statTotalValue(1), 5); // tier 0, lvl 1 -> 0 + 1 * 5
assert.strictEqual(statTotalValue(10), 50); // tier 0, lvl 10 -> 0 + 10 * 5
assert.strictEqual(statTotalValue(20), 100); // tier 0, lvl 20 -> 0 + 20 * 5
assert.strictEqual(statTotalValue(21), 110); // tier 1, lvl 21 -> 100 + 1 * 10
assert.strictEqual(statTotalValue(40), 300); // tier 1, lvl 40 -> 100 + 20 * 10
assert.strictEqual(statTotalValue(41), 315); // tier 2, lvl 41 -> 300 + 1 * 15
assert.strictEqual(statTotalValue(100), 1500); // tier 4, lvl 100 -> 1000 + 20 * 25

// globalTotalValue tests
assert.strictEqual(globalTotalValue(0), 0);
assert.strictEqual(globalTotalValue(1), 0.2); // tier 0, lvl 1 -> 0 + 1 * 0.2
assert.strictEqual(globalTotalValue(10), 2); // tier 0, lvl 10 -> 0 + 10 * 0.2
assert.strictEqual(globalTotalValue(11), 2.4); // tier 1, lvl 11 -> 2 + 1 * 0.4
assert.strictEqual(globalTotalValue(50), 30); // tier 4, lvl 50 -> 20 + 10 * 1.0 = 30

// dodgeTotalValue tests
assert.strictEqual(dodgeTotalValue(0), 0);
assert.strictEqual(dodgeTotalValue(1), 0.001);
assert.strictEqual(dodgeTotalValue(10), 0.01);

// skillTypeTotalValue tests
assert.strictEqual(skillTypeTotalValue(0), 0);
assert.strictEqual(skillTypeTotalValue(1), 0.04);
assert.strictEqual(skillTypeTotalValue(10), 0.4);

// finalDamageTotalValue tests
assert.strictEqual(finalDamageTotalValue(0), 0);
assert.strictEqual(finalDamageTotalValue(1), 0.2);
assert.strictEqual(finalDamageTotalValue(10), 0.2); // one-time unlock
