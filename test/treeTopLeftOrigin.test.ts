import assert from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { baseTree, TREE_ROOT_X, TREE_ROOT_Y } from "../src/config/baseTree";

assert.ok(TREE_ROOT_X > 0 && TREE_ROOT_Y > 0, "Root should be in top-left space.");

for (const node of baseTree) {
    assert.ok(node.x >= 0, `Node x should be non-negative: ${node.skillId}`);
    assert.ok(node.y >= 0, `Node y should be non-negative: ${node.skillId}`);
}

const treePath = resolve("src/lib/Tree.svelte");
const source = readFileSync(treePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/x1=\{link\.fromNode \? link\.fromNode\.x : rootX\}/.test(normalized)) {
    throw new Error("Tree root links should use rootX as fallback origin.");
}

if (!/y1=\{link\.fromNode \? link\.fromNode\.y : rootY\}/.test(normalized)) {
    throw new Error("Tree root links should use rootY as fallback origin.");
}

if (!/if \(node\.x > rootX\) return "right";/.test(normalized)) {
    throw new Error("Tree region split should be relative to rootX.");
}

if (!/if \(node\.y < rootY\) return "top-left";/.test(normalized)) {
    throw new Error("Tree region split should be relative to rootY.");
}
