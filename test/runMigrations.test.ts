import assert from "node:assert";
import { compareVersions } from "../src/lib/migrations/runMigrations.ts";

// compareVersions(a, b): -1 if a < b, 0 if a === b, 1 if a > b

assert.strictEqual(compareVersions("0.9", "1.0"), -1, "0.9 < 1.0");
assert.strictEqual(compareVersions("1.0", "1.1"), -1, "1.0 < 1.1");
assert.strictEqual(compareVersions("1.1", "1.2"), -1, "1.1 < 1.2");
assert.strictEqual(compareVersions("0.9", "1.2"), -1, "0.9 < 1.2");

assert.strictEqual(compareVersions("1.0", "0.9"), 1, "1.0 > 0.9");
assert.strictEqual(compareVersions("1.2", "1.0"), 1, "1.2 > 1.0");

assert.strictEqual(compareVersions("1.0", "1.0"), 0, "1.0 === 1.0");
assert.strictEqual(compareVersions("1.2", "1.2"), 0, "1.2 === 1.2");

assert.strictEqual(compareVersions("unknown", "1.0"), -1, "unknown < 1.0");
assert.strictEqual(compareVersions("1.0", "unknown"), 1, "1.0 > unknown");
assert.strictEqual(compareVersions("unknown", "unknown"), 0, "unknown === unknown");

// Numeric parts: 1.10 > 1.9
assert.strictEqual(compareVersions("1.9", "1.10"), -1, "1.9 < 1.10");
assert.strictEqual(compareVersions("1.10", "1.9"), 1, "1.10 > 1.9");
