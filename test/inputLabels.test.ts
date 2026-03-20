import assert from "node:assert/strict";
import { getModifierLabel, getButtonLabel, getInputLabel } from "../src/lib/input/inputLabels.ts";

// Mock translation function that returns the key as-is
const t = (key: string) => key;

console.log("  inputLabels");

// --- getModifierLabel ---
{
    assert.equal(getModifierLabel("reverse", t), "input.reverse");
    assert.equal(getModifierLabel("alternate", t), "input.alternate");
    console.log("    ✓ getModifierLabel returns correct keys");
}

// --- getButtonLabel ---
{
    assert.equal(getButtonLabel("primary", "mouse", t), "input.primary.mouse");
    assert.equal(getButtonLabel("primary", "touch", t), "input.primary.touch");
    assert.equal(getButtonLabel("secondary", "mouse", t), "input.secondary.mouse");
    assert.equal(getButtonLabel("secondary", "touch", t), "input.secondary.touch");
    assert.equal(getButtonLabel("auxiliary", "mouse", t), "input.auxiliary.mouse");
    console.log("    ✓ getButtonLabel returns correct keys");
}

// --- getInputLabel: no modifier ---
{
    const result = getInputLabel("primary", null, "mouse", t);
    assert.equal(result, "input.primary.mouse");
    console.log("    ✓ getInputLabel without modifier returns button label only");
}

// --- getInputLabel: with modifier ---
{
    const result = getInputLabel("primary", "reverse", "mouse", t);
    assert.equal(result, "input.reverse" + "input.modifierSeparator" + "input.primary.mouse");
    console.log("    ✓ getInputLabel with modifier returns 'modifier + separator + button'");
}

console.log("  ✓ inputLabels\n");
