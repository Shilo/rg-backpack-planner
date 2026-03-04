import assert from "node:assert";
import { formatNumber } from "../src/lib/mathUtil.ts";

// Because toLocaleString can behave differently depending on system locale,
// we just test that it formats the number by comparing with the built-in result.
assert.strictEqual(formatNumber(1000), (1000).toLocaleString());
assert.strictEqual(formatNumber(1234567.89), (1234567.89).toLocaleString());
assert.strictEqual(formatNumber(0), (0).toLocaleString());
