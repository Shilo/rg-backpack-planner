import assert from "node:assert";
import { truncateText } from "../src/lib/stringUtil.ts";

assert.strictEqual(truncateText("Hello World", 25), "Hello World");
assert.strictEqual(
    truncateText("This is a very long string that should be truncated", 25),
    "This is a very long strin..."
);
assert.strictEqual(truncateText(null), "");
assert.strictEqual(truncateText(undefined), "");
assert.strictEqual(truncateText("", 10), "");
assert.strictEqual(truncateText("Short", 2), "Sh...");
