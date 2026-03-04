import assert from "node:assert";
import { hexToOklch, oklchToHex, hexToRgb, rgbToOklch } from "../src/lib/themeEngine.ts";

// hexToOklch should return { h, c, l }
const result = hexToOklch("#2692FF");
assert.ok(typeof result.l === "number", "hexToOklch must return l");
assert.ok(result.l > 0 && result.l < 1, `l should be between 0 and 1, got ${result.l}`);

// Round-trip: oklchToHex -> hexToOklch should be close
const hex = oklchToHex(0.65, 0.2, 260);
const back = hexToOklch(hex);
assert.ok(Math.abs(back.l - 0.65) < 0.03, `Round-trip l: expected ~0.65, got ${back.l}`);
assert.ok(Math.abs(back.h - 260) < 5, `Round-trip h: expected ~260, got ${back.h}`);
assert.ok(Math.abs(back.c - 0.2) < 0.03, `Round-trip c: expected ~0.2, got ${back.c}`);

// Gray hex should return very low chroma
const gray = hexToOklch("#808080");
assert.ok(gray.c < 0.01, `Gray chroma should be near 0, got ${gray.c}`);
assert.ok(typeof gray.l === "number", "Gray must also return l");
