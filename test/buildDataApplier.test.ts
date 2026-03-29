import { get } from "svelte/store";
import type { BuildData } from "../src/lib/buildData/encoder.ts";
import { applyBuildFromUrl } from "../src/lib/buildData/applier.ts";
import { previewBuildName, setPreviewBuildName } from "../src/lib/previewBuildNameStore.ts";
import { setTechCrystalsOwned, techCrystalsOwned } from "../src/lib/techCrystalStore.ts";
import { treeLevels } from "../src/lib/treeLevelsStore.ts";
import type { Node } from "../src/types/tree.ts";

const trees: { nodes: Node[] }[] = [
    {
        nodes: [
            {
                skillId: "attack_boost",
                maxLevel: 100,
                radius: 1,
                x: 0,
                y: 0,
            },
            {
                skillId: "hp_boost",
                parent: 0,
                maxLevel: 100,
                radius: 1,
                x: 100,
                y: 0,
            },
        ],
    },
    {
        nodes: [
            {
                skillId: "defense_boost",
                maxLevel: 100,
                radius: 1,
                x: 0,
                y: 100,
            },
            {
                skillId: "dodge",
                parent: 0,
                maxLevel: 50,
                radius: 1,
                x: 100,
                y: 100,
            },
            {
                skillId: "global_def",
                parent: [0, 1],
                maxLevel: 1,
                radius: 1,
                x: 200,
                y: 100,
            },
        ],
    },
];

function assertEqual(actual: unknown, expected: unknown, message: string): void {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        throw new Error(
            `${message}. Expected ${expectedJson}, got ${actualJson}`,
        );
    }
}

const initialLevels = [
    [9, 9],
    [8, 8, 8],
];
treeLevels.set(initialLevels.map((tree) => [...tree]));
setTechCrystalsOwned(123);
setPreviewBuildName("Before");

const mismatchedTreeDefinitionsData: BuildData = {
    trees: [[1], [2], [3]],
    owned: 777,
    name: "After",
};

if (applyBuildFromUrl(trees, mismatchedTreeDefinitionsData) !== false) {
    throw new Error("Expected applyBuildFromUrl to fail on tree-definition mismatch");
}
assertEqual(
    get(treeLevels),
    initialLevels,
    "Tree levels should remain unchanged after failed apply",
);
assertEqual(
    get(techCrystalsOwned),
    123,
    "Owned crystals should remain unchanged after failed apply",
);
assertEqual(
    get(previewBuildName),
    "Before",
    "Preview build name should remain unchanged after failed apply",
);

const mismatchedCurrentTreesData: BuildData = {
    trees: [[5]],
    owned: 11,
    name: "Current mismatch",
};
if (applyBuildFromUrl(undefined, mismatchedCurrentTreesData) !== false) {
    throw new Error("Expected applyBuildFromUrl to fail on current-tree mismatch");
}
assertEqual(
    get(treeLevels),
    initialLevels,
    "Tree levels should remain unchanged after current-tree mismatch",
);
assertEqual(
    get(techCrystalsOwned),
    123,
    "Owned crystals should remain unchanged after current-tree mismatch",
);
assertEqual(
    get(previewBuildName),
    "Before",
    "Preview name should remain unchanged after current-tree mismatch",
);

const validBuild: BuildData = {
    trees: [[1], [2, 3]],
    owned: 55,
    name: "Named Preview",
};
if (applyBuildFromUrl(trees, validBuild) !== true) {
    throw new Error("Expected applyBuildFromUrl to succeed for valid input");
}
assertEqual(
    get(treeLevels),
    [
        [1, 0],
        [2, 3, 0],
    ],
    "Expected compressed tree levels to expand against provided tree definitions",
);
assertEqual(
    get(techCrystalsOwned),
    55,
    "Expected owned crystals to update for successful apply",
);
assertEqual(
    get(previewBuildName),
    "Named Preview",
    "Expected preview name to update for successful apply",
);

const unnamedBuild: BuildData = {
    trees: [[0], [0]],
    owned: 12,
};
if (applyBuildFromUrl(trees, unnamedBuild) !== true) {
    throw new Error("Expected applyBuildFromUrl to succeed for unnamed build");
}
assertEqual(
    get(previewBuildName),
    null,
    "Expected preview name to clear when URL build has no name",
);

// --- switchActivePreset tests ---
import { addPreset, getActivePresetId } from "../src/lib/buildPresetsStore.ts";
import { switchActivePreset } from "../src/lib/buildData/applier.ts";
import { encodeBuildData } from "../src/lib/buildData/encoder.ts";

{
    // decodeBuildData always returns the game's actual tree structure.
    // Reset treeLevels to 3 trees so applyBuildData length check passes.
    treeLevels.set([[], [], []]);

    const code = encodeBuildData({ trees: [[], [], []], owned: 42 });
    const preset = addPreset("Swap Test", code);

    // Pass [] for trees — no expansion needed; decoded data applied directly.
    assertEqual(
        switchActivePreset(preset.id, []),
        true,
        "switchActivePreset: returns true for valid preset",
    );
    assertEqual(
        getActivePresetId(),
        preset.id,
        "switchActivePreset: updates active preset ID",
    );
    assertEqual(
        switchActivePreset("no-such-id", []),
        false,
        "switchActivePreset: returns false for unknown preset",
    );
    console.log("✅ switchActivePreset tests passed");
}
