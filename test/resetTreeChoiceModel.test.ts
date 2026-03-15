import assert from "node:assert";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const modelPath = resolve("src/lib/resetTreeChoiceModel.ts");

assert.ok(
    existsSync(modelPath),
    "Reset tree choice state should live in src/lib/resetTreeChoiceModel.ts.",
);

if (existsSync(modelPath)) {
    const modelModule = await import("../src/lib/resetTreeChoiceModel.ts");
    const buildResetTreeChoiceState = (modelModule as {
        buildResetTreeChoiceState?: (activeLevels: number[] | null | undefined) => {
            choices: Array<{ id: string; enabled: boolean }>;
            branchTotals: Record<string, number>;
            totalLevels: number;
            canResetTree: boolean;
        };
    }).buildResetTreeChoiceState;

    assert.strictEqual(
        typeof buildResetTreeChoiceState,
        "function",
        "resetTreeChoiceModel should export buildResetTreeChoiceState(activeLevels).",
    );

    if (typeof buildResetTreeChoiceState === "function") {
        const activeLevels = [
            1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            2, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            3, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ];
        const state = buildResetTreeChoiceState(activeLevels);

        assert.deepStrictEqual(
            state.choices.map((choice) => choice.id),
            ["orange", "blue", "yellow", "tree"],
            "Reset choices should be ordered orange, blue, yellow, then whole tree.",
        );
        assert.deepStrictEqual(
            state.branchTotals,
            { yellow: 1, orange: 2, blue: 3 },
            "Choice model should report branch totals for yellow, orange, and blue.",
        );
        assert.deepStrictEqual(
            state.choices.map((choice) => choice.enabled),
            [true, true, true, true],
            "Every reset choice should be enabled when that branch or tree has levels.",
        );
        assert.strictEqual(
            state.totalLevels,
            6,
            "Choice model should report the total active-tree levels.",
        );
        assert.strictEqual(
            state.canResetTree,
            true,
            "Choice model should mark the active tree as resettable when it has levels.",
        );

        const emptyState = buildResetTreeChoiceState(Array(30).fill(0));
        assert.deepStrictEqual(
            emptyState.choices.map((choice) => choice.enabled),
            [false, false, false, false],
            "All reset choices should disable when the active tree is empty.",
        );
        assert.strictEqual(
            emptyState.canResetTree,
            false,
            "Choice model should mark an empty active tree as not resettable.",
        );
    }
}

console.log("resetTreeChoiceModel: all tests passed");
