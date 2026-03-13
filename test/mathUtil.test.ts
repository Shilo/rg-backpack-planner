import assert from "node:assert";
import { evaluateSimpleMath } from "../src/lib/mathUtil.ts";

// Basic arithmetic
assert.strictEqual(evaluateSimpleMath("2+3"), 5);
assert.strictEqual(evaluateSimpleMath("10-4"), 6);
assert.strictEqual(evaluateSimpleMath("3*7"), 21);

// Multiplication precedence
assert.strictEqual(evaluateSimpleMath("2+3*4"), 14);
assert.strictEqual(evaluateSimpleMath("3*4+2"), 14);
assert.strictEqual(evaluateSimpleMath("1+2*3+4"), 11);

// Whitespace handling
assert.strictEqual(evaluateSimpleMath(" 2 + 3 "), 5);
assert.strictEqual(evaluateSimpleMath("10 * 2"), 20);

// Floor result
assert.strictEqual(evaluateSimpleMath("7"), 7);
assert.strictEqual(evaluateSimpleMath("0"), 0);

// Chained operations
assert.strictEqual(evaluateSimpleMath("1+2+3"), 6);
assert.strictEqual(evaluateSimpleMath("10-3-2"), 5);
assert.strictEqual(evaluateSimpleMath("2*3*4"), 24);

// Invalid expressions return null
assert.strictEqual(evaluateSimpleMath(""), null);
assert.strictEqual(evaluateSimpleMath("abc"), null);
assert.strictEqual(evaluateSimpleMath("+"), null);
assert.strictEqual(evaluateSimpleMath("2+"), null);
assert.strictEqual(evaluateSimpleMath("+2"), null);
assert.strictEqual(evaluateSimpleMath("2++3"), null);
assert.strictEqual(evaluateSimpleMath("2.5+3"), null);
