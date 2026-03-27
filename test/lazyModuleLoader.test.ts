import assert from "node:assert/strict";
import { createLazyModuleLoader } from "../src/lib/lazyModuleLoader.ts";

type TestKey = "pending" | "failing";

let notifyCount = 0;
let pendingLoadCalls = 0;
let failingLoadCalls = 0;
let resolvePendingModule:
    | ((module: { default: string }) => void)
    | null = null;

const pendingModulePromise = new Promise<{ default: string }>((resolve) => {
    resolvePendingModule = resolve;
});

const originalConsoleError = console.error;
const loggedErrors: unknown[][] = [];
console.error = (...args: unknown[]) => {
    loggedErrors.push(args);
};

try {
    const loader = createLazyModuleLoader<TestKey, string>(
        {
            pending: () => {
                pendingLoadCalls += 1;
                return pendingModulePromise;
            },
            failing: async () => {
                failingLoadCalls += 1;
                throw new Error("Chunk missing");
            },
        },
        () => {
            notifyCount += 1;
        },
        "test lazy page",
    );

    assert.equal(loader.getState("pending"), "idle");
    assert.equal(loader.getComponent("pending"), null);

    const pendingLoad = loader.ensure("pending");
    assert.equal(loader.getState("pending"), "loading");
    assert.equal(loader.getComponent("pending"), null);
    assert.equal(pendingLoadCalls, 1);

    const duplicatePendingLoad = loader.ensure("pending");
    assert.strictEqual(duplicatePendingLoad, pendingLoad);
    assert.equal(pendingLoadCalls, 1);

    resolvePendingModule?.({ default: "PendingPage" });
    assert.equal(await pendingLoad, "PendingPage");
    assert.equal(loader.getState("pending"), "loaded");
    assert.equal(loader.getComponent("pending"), "PendingPage");
    assert.ok(notifyCount >= 2);

    assert.equal(await loader.ensure("pending"), "PendingPage");
    assert.equal(pendingLoadCalls, 1);

    const failedLoadResult = await loader.ensure("failing");
    assert.equal(failedLoadResult, null);
    assert.equal(loader.getState("failing"), "error");
    assert.equal(loader.getComponent("failing"), null);
    assert.equal(failingLoadCalls, 1);
    assert.equal(loggedErrors.length, 1);
} finally {
    console.error = originalConsoleError;
}
