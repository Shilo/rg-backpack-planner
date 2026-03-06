import assert from "node:assert";
import {
    nextTierTargetLevel,
    previousTierTargetLevel,
} from "../src/lib/tierLeveling.ts";

const maxLevel = 100;

assert.strictEqual(nextTierTargetLevel(0, maxLevel), 20);
assert.strictEqual(nextTierTargetLevel(15, maxLevel), 20);
assert.strictEqual(nextTierTargetLevel(20, maxLevel), 40);
assert.strictEqual(nextTierTargetLevel(100, maxLevel), 100);

assert.strictEqual(previousTierTargetLevel(0, maxLevel), 0);
assert.strictEqual(previousTierTargetLevel(1, maxLevel), 0);
assert.strictEqual(previousTierTargetLevel(15, maxLevel), 0);
assert.strictEqual(previousTierTargetLevel(20, maxLevel), 0);
assert.strictEqual(previousTierTargetLevel(21, maxLevel), 20);
assert.strictEqual(previousTierTargetLevel(55, maxLevel), 40);
assert.strictEqual(previousTierTargetLevel(100, maxLevel), 80);

assert.strictEqual(previousTierTargetLevel(1, 1), 0);
assert.strictEqual(previousTierTargetLevel(0, 1), 0);
assert.strictEqual(nextTierTargetLevel(0, 1), 1);
