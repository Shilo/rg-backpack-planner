import assert from "node:assert/strict";
import {
    nextTierTargetLevel,
    previousTierTargetLevel,
    tierIndex,
    tierSize,
    tierUpper,
} from "../src/lib/tierLeveling.ts";

type TargetCase = { level: number; expected: number };
type TierCase = { input: number; expected: number };
type MaxLevel = 100 | 50 | 1;

function assertTargetCases(
    label: string,
    maxLevel: MaxLevel,
    fn: (level: number, maxLevel: MaxLevel) => number,
    cases: TargetCase[],
) {
    cases.forEach(({ level, expected }) => {
        const actual = fn(level, maxLevel);
        assert.equal(
            actual,
            expected,
            `${label} expected ${expected} for level ${level} (max ${maxLevel}), got ${actual}`,
        );
    });
}

function assertTierCases(
    label: string,
    maxLevel: MaxLevel,
    fn: (value: number, maxLevel: MaxLevel) => number,
    cases: TierCase[],
) {
    cases.forEach(({ input, expected }) => {
        const actual = fn(input, maxLevel);
        assert.equal(
            actual,
            expected,
            `${label} expected ${expected} for input ${input} (max ${maxLevel}), got ${actual}`,
        );
    });
}

// Increment path: next target should jump at X9->X0->X1 boundaries.
assertTargetCases("nextTierTargetLevel", 100, nextTierTargetLevel, [
    { level: 0, expected: 20 },
    { level: 1, expected: 20 },
    { level: 19, expected: 20 },
    { level: 20, expected: 40 },
    { level: 21, expected: 40 },
    { level: 39, expected: 40 },
    { level: 40, expected: 60 },
    { level: 41, expected: 60 },
    { level: 59, expected: 60 },
    { level: 60, expected: 80 },
    { level: 61, expected: 80 },
    { level: 79, expected: 80 },
    { level: 80, expected: 100 },
    { level: 81, expected: 100 },
    { level: 100, expected: 100 },
]);

assertTargetCases("nextTierTargetLevel", 50, nextTierTargetLevel, [
    { level: 0, expected: 10 },
    { level: 1, expected: 10 },
    { level: 9, expected: 10 },
    { level: 10, expected: 20 },
    { level: 11, expected: 20 },
    { level: 19, expected: 20 },
    { level: 20, expected: 30 },
    { level: 21, expected: 30 },
    { level: 29, expected: 30 },
    { level: 30, expected: 40 },
    { level: 31, expected: 40 },
    { level: 39, expected: 40 },
    { level: 40, expected: 50 },
    { level: 41, expected: 50 },
    { level: 50, expected: 50 },
]);

assertTargetCases("nextTierTargetLevel", 1, nextTierTargetLevel, [
    { level: 0, expected: 1 },
    { level: 1, expected: 1 },
]);

// Decrement path: previous target should step down at X1->X0->X9 boundaries.
assertTargetCases("previousTierTargetLevel", 100, previousTierTargetLevel, [
    { level: 0, expected: 0 },
    { level: 1, expected: 0 },
    { level: 19, expected: 0 },
    { level: 20, expected: 0 },
    { level: 21, expected: 20 },
    { level: 39, expected: 20 },
    { level: 40, expected: 20 },
    { level: 41, expected: 40 },
    { level: 59, expected: 40 },
    { level: 60, expected: 40 },
    { level: 61, expected: 60 },
    { level: 79, expected: 60 },
    { level: 80, expected: 60 },
    { level: 81, expected: 80 },
    { level: 100, expected: 80 },
]);

assertTargetCases("previousTierTargetLevel", 50, previousTierTargetLevel, [
    { level: 0, expected: 0 },
    { level: 1, expected: 0 },
    { level: 9, expected: 0 },
    { level: 10, expected: 0 },
    { level: 11, expected: 10 },
    { level: 19, expected: 10 },
    { level: 20, expected: 10 },
    { level: 21, expected: 20 },
    { level: 29, expected: 20 },
    { level: 30, expected: 20 },
    { level: 31, expected: 30 },
    { level: 39, expected: 30 },
    { level: 40, expected: 30 },
    { level: 41, expected: 40 },
    { level: 50, expected: 40 },
]);

assertTargetCases("previousTierTargetLevel", 1, previousTierTargetLevel, [
    { level: 0, expected: 0 },
    { level: 1, expected: 0 },
]);

assert.equal(tierSize(100), 20);
assert.equal(tierSize(50), 10);
assert.equal(tierSize(1), 0);

assertTierCases("tierIndex", 100, tierIndex, [
    { input: 0, expected: 0 },
    { input: 1, expected: 1 },
    { input: 20, expected: 1 },
    { input: 21, expected: 2 },
    { input: 40, expected: 2 },
    { input: 41, expected: 3 },
    { input: 60, expected: 3 },
    { input: 61, expected: 4 },
    { input: 80, expected: 4 },
    { input: 81, expected: 5 },
    { input: 100, expected: 5 },
]);

assertTierCases("tierIndex", 50, tierIndex, [
    { input: 0, expected: 0 },
    { input: 1, expected: 1 },
    { input: 10, expected: 1 },
    { input: 11, expected: 2 },
    { input: 20, expected: 2 },
    { input: 21, expected: 3 },
    { input: 40, expected: 4 },
    { input: 41, expected: 5 },
    { input: 50, expected: 5 },
]);

assertTierCases("tierIndex", 1, tierIndex, [
    { input: 0, expected: 0 },
    { input: 1, expected: 1 },
]);

assertTierCases("tierUpper", 100, tierUpper, [
    { input: 0, expected: 0 },
    { input: 1, expected: 20 },
    { input: 2, expected: 40 },
    { input: 5, expected: 100 },
]);

assertTierCases("tierUpper", 50, tierUpper, [
    { input: 0, expected: 0 },
    { input: 1, expected: 10 },
    { input: 2, expected: 20 },
    { input: 5, expected: 50 },
]);

assertTierCases("tierUpper", 1, tierUpper, [
    { input: 0, expected: 0 },
    { input: 1, expected: 1 },
]);
