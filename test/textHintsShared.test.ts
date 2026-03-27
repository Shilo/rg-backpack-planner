import assert from "node:assert";
import { parseTextHints } from "../src/lib/textHints.ts";

const parsed = parseTextHints(
    "Add levels using node action setting [[+1, +10, +Tier]]",
);
assert.deepStrictEqual(parsed, [
    { text: "Add levels using node action setting ", isHint: false },
    { text: "+1, +10, +Tier", isHint: true, className: "text-hint" },
]);

assert.deepStrictEqual(parseTextHints("HUD (Heads-Up Display)"), [
    { text: "HUD (Heads-Up Display)", isHint: false },
]);

assert.deepStrictEqual(
    parseTextHints("Add levels [[shared hint]]", "hint-override"),
    [
        { text: "Add levels ", isHint: false },
        { text: "shared hint", isHint: true, className: "hint-override" },
    ],
);
