// Server: Vite dev server on port 5174.
// Requires dev server (not preview) because tests dynamically import treeLevelsStore.ts
// from the browser via page.evaluate(). Only the dev server can transform and serve
// TypeScript source files on demand. Port 5174 avoids conflict with the preview server
// (port 4173) used by captureScreenshot.ui.test.ts.
import assert from "node:assert/strict";
import { appendFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import packageInfo from "../package.json";
import {
    chromium,
    type Browser,
    type BrowserContext,
    type Page,
} from "playwright";
import { applyLevelChange } from "../src/lib/tierLeveling.ts";
import {
    createYellowBranchFixture,
    directionalScenarioCases,
    expectedTiersForLevels,
    YELLOW_BRANCH_LENGTH,
    type DirectionalScenarioCase,
} from "./tierLeveling.shared.ts";

const DEV_SERVER_URL = "http://127.0.0.1:5174";
const APP_URL = `${DEV_SERVER_URL}/rg-backpack-planner/`;
const TREE_LEVELS_STORE_MODULE_URL = new URL(
    "/src/lib/treeLevelsStore.ts",
    DEV_SERVER_URL,
).href;
const DEV_SERVER_START_TIMEOUT_MS = 20_000;
const DEV_SERVER_POLL_DELAY_MS = 250;
const CURRENT_VERSION = packageInfo.version ?? "0.1.0";
const UI_TIER_LOG_FILE_LABEL = "test/tierLeveling.ui.output.log";
const UI_TIER_LOG_FILE_URL = new URL(
    "./tierLeveling.ui.output.log",
    import.meta.url,
);
const UI_TIER_LOG_FILE_PATH = fileURLToPath(UI_TIER_LOG_FILE_URL);

type TierUiSession = {
    browser: Browser;
    context: BrowserContext;
    page: Page;
    stopServer: () => Promise<void>;
};

type UiBranchState = {
    levels: number[];
    tiers: number[];
};

const yellowBranchNodes = createYellowBranchFixture().nodes;

function npmCommand() {
    return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function stopChildProcess(
    child: ReturnType<typeof spawn>,
): Promise<void> {
    if (child.exitCode !== null) return;

    child.kill();
    await Promise.race([once(child, "exit"), delay(5_000)]);

    if (child.exitCode === null && child.pid) {
        const killer = spawn(
            process.platform === "win32" ? "taskkill" : "kill",
            process.platform === "win32"
                ? ["/pid", String(child.pid), "/t", "/f"]
                : ["-9", String(child.pid)],
            { stdio: "ignore" },
        );
        await once(killer, "exit");
    }
}

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return;
            }
        } catch {
            // Wait for server startup.
        }
        await delay(DEV_SERVER_POLL_DELAY_MS);
    }

    throw new Error(`Timed out waiting for dev server at ${url}`);
}

async function bootTierUiSession(): Promise<TierUiSession> {
    const devServer =
        process.platform === "win32"
            ? spawn(
                  "npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",
                  {
                      cwd: process.cwd(),
                      shell: true,
                      stdio: "ignore",
                  },
              )
            : spawn(
                  npmCommand(),
                  [
                      "run",
                      "dev",
                      "--",
                      "--host",
                      "127.0.0.1",
                      "--port",
                      "5174",
                      "--strictPort",
                  ],
                  {
                      cwd: process.cwd(),
                      stdio: "ignore",
                  },
              );

    const stopServer = async () => {
        await stopChildProcess(devServer);
    };

    try {
        await waitForServer(DEV_SERVER_URL, DEV_SERVER_START_TIMEOUT_MS);

        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();

        await context.addInitScript((version: string) => {
            localStorage.setItem("rg-backpack-planner-latest-used-version", version);
            localStorage.setItem("rg-backpack-planner-node-touch-action", "0");
            localStorage.setItem("rg-backpack-planner-onboarding-seen", "true");
        }, CURRENT_VERSION);

        const page = await context.newPage();
        return { browser, context, page, stopServer };
    } catch (error) {
        await stopServer();
        throw error;
    }
}

async function ensureTierUiReady(page: Page): Promise<void> {
    await page.waitForSelector('[data-node-id="0"]', { state: "visible" });
}

function resetUiTierLogFile() {
    writeFileSync(UI_TIER_LOG_FILE_URL, "", "utf8");
}

function logUiTierLine(line = "") {
    console.log(line);
    appendFileSync(UI_TIER_LOG_FILE_URL, `${line}\n`, "utf8");
}

function nodeSelector(index: number): string {
    return `[data-node-id="${index}"]`;
}

function parseNodeBadgeValue(text: string | null): number {
    const normalized = (text ?? "").replaceAll(",", "").trim();
    if (normalized === "") return 0;
    const value = Number(normalized);
    if (!Number.isFinite(value)) {
        throw new Error(`Invalid badge value: ${text ?? "<null>"}`);
    }
    return value;
}

async function readYellowBranchState(page: Page): Promise<UiBranchState> {
    const levels: number[] = [];

    for (let index = 0; index < YELLOW_BRANCH_LENGTH; index += 1) {
        const node = page.locator(nodeSelector(index));
        if ((await node.count()) === 0) {
            throw new Error(`Missing node ${index}`);
        }

        const levelBadge = page.locator(
            `.node-level-badge[data-node-id="${index}"]`,
        );
        let level = 0;
        if ((await levelBadge.count()) > 0) {
            const badgeText = (await levelBadge.textContent())?.trim() ?? "";
            level =
                badgeText.length > 0
                    ? parseNodeBadgeValue(badgeText)
                    : (yellowBranchNodes[index]?.maxLevel ?? 0);
        }
        levels.push(level);
    }

    const tiers = expectedTiersForLevels(yellowBranchNodes, levels);
    return { levels, tiers };
}

async function waitForRenderedYellowBranch(
    page: Page,
    expectedLevels: number[],
): Promise<void> {
    await page.waitForFunction(
        ({
            levels,
            maxLevels,
        }: {
            levels: number[];
            maxLevels: number[];
        }) => {
            return levels.every((expectedLevel, index) => {
                const badge = document.querySelector(
                    `.node-level-badge[data-node-id="${index}"]`,
                );
                if (!badge) {
                    return expectedLevel === 0;
                }

                const levelText = badge.textContent?.replaceAll(",", "").trim() ?? "";
                const level =
                    levelText === ""
                        ? (maxLevels[index] ?? 0)
                        : Number(levelText);

                return Number.isFinite(level) && level === expectedLevel;
            });
        },
        {
            levels: expectedLevels,
            maxLevels: yellowBranchNodes.map((node) => node.maxLevel),
        },
    );
}

async function syncYellowBranchLevels(
    page: Page,
    branchLevels: number[],
): Promise<void> {
    await page.evaluate(
        async ({
            nextBranchLevels,
            treeLevelsStoreUrl,
        }: {
            nextBranchLevels: number[];
            treeLevelsStoreUrl: string;
        }) => {
            const storeModule = await import(treeLevelsStoreUrl);
            const { treeLevels, setTreeLevels } = storeModule as {
                treeLevels: {
                    subscribe: (fn: (levels: number[][]) => void) => () => void;
                };
                setTreeLevels: (index: number, levels: number[]) => void;
            };

            let currentTrees: number[][] = [];
            const unsubscribe = treeLevels.subscribe((value: number[][]) => {
                currentTrees = value.map((levels: number[]) => [...levels]);
            });
            unsubscribe();

            if (currentTrees.length === 0) {
                throw new Error("Tree levels store is not initialized");
            }

            const nextActiveTree = [...(currentTrees[0] ?? [])];
            for (let index = 0; index < nextBranchLevels.length; index += 1) {
                nextActiveTree[index] = nextBranchLevels[index] ?? 0;
            }

            setTreeLevels(0, nextActiveTree);
        },
        {
            nextBranchLevels: branchLevels,
            treeLevelsStoreUrl: TREE_LEVELS_STORE_MODULE_URL,
        },
    );

    await waitForRenderedYellowBranch(page, branchLevels);
}

async function resetTierUiPage(page: Page): Promise<void> {
    if (!page.url().startsWith(DEV_SERVER_URL)) {
        await page.goto(APP_URL);
        await ensureTierUiReady(page);
    }

    await page.evaluate((version: string) => {
        localStorage.clear();
        localStorage.setItem("rg-backpack-planner-latest-used-version", version);
        localStorage.setItem("rg-backpack-planner-node-touch-action", "0");
        localStorage.setItem("rg-backpack-planner-onboarding-seen", "true");
    }, CURRENT_VERSION);

    await page.goto(APP_URL);
    await ensureTierUiReady(page);
}

async function setNodeToLevel(
    page: Page,
    index: number,
    targetLevel: number,
): Promise<void> {
    const current = await readYellowBranchState(page);
    const { levels: nextLevels, deltas } = applyLevelChange({
        nodes: yellowBranchNodes,
        levels: current.levels,
        index,
        targetLevel,
    });

    if (deltas.length === 0) return;

    await syncYellowBranchLevels(
        page,
        yellowBranchNodes.map((_, nodeIndex) => nextLevels[nodeIndex] ?? 0),
    );
}

function assertUiStateEqual(
    caseName: string,
    expectedLevels: number[],
    actual: UiBranchState,
) {
    const expectedTiers = expectedTiersForLevels(yellowBranchNodes, expectedLevels);
    assert.deepStrictEqual(
        actual.levels,
        expectedLevels,
        `${caseName} levels mismatch`,
    );
    assert.deepStrictEqual(actual.tiers, expectedTiers, `${caseName} tiers mismatch`);
}

async function runUiScenario(
    page: Page,
    testCase: DirectionalScenarioCase,
): Promise<number> {
    await resetTierUiPage(page);
    if (testCase.initialLevels) {
        const seededLevels = yellowBranchNodes.map(
            (_, index) => testCase.initialLevels?.[index] ?? 0,
        );
        await syncYellowBranchLevels(page, seededLevels);
    }
    let stepCount = 0;

    for (const [stepIndex, step] of testCase.steps.entries()) {
        await setNodeToLevel(page, step.index, step.targetLevel);
        const actual = await readYellowBranchState(page);
        assertUiStateEqual(
            `${testCase.name} step ${stepIndex + 1}`,
            step.expectedLevels,
            actual,
        );

        logUiTierLine(
            `step ${stepIndex + 1} [index ${step.index}] -> ${step.targetLevel}`,
        );
        logUiTierLine(`- expected levels: [${step.expectedLevels.join(", ")}]`);
        logUiTierLine(`- actual levels:   [${actual.levels.join(", ")}]`);
        logUiTierLine();

        stepCount += 1;
    }

    return stepCount;
}

async function runTierUiSuite(page: Page): Promise<void> {
    resetUiTierLogFile();
    logUiTierLine("===");
    logUiTierLine("Tier Leveling UI Tests");
    logUiTierLine(`Log file: ${UI_TIER_LOG_FILE_LABEL}`);
    logUiTierLine("===");
    logUiTierLine();

    let passed = 0;
    let failed = 0;

    for (const [index, testCase] of directionalScenarioCases.entries()) {
        logUiTierLine(`Scenario ${index + 1}: ${testCase.name}`);
        logUiTierLine("---");
        try {
            const steps = await runUiScenario(page, testCase);
            logUiTierLine(`✅ PASSED (${steps} steps)`);
            passed += 1;
        } catch (error) {
            logUiTierLine(
                `❌ FAILED: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
            failed += 1;
        }
        logUiTierLine();
    }

    logUiTierLine("===");
    logUiTierLine("Tier UI Summary");
    logUiTierLine("===");
    logUiTierLine(`📊 Total tests: ${directionalScenarioCases.length}`);
    logUiTierLine(`✅ Passed: ${passed}`);
    logUiTierLine(`❌ Failed: ${failed}`);
    logUiTierLine(`Log file: ${UI_TIER_LOG_FILE_PATH}:1`);
    logUiTierLine("===");

    if (failed > 0) {
        throw new Error(`${failed} UI tier test(s) failed`);
    }
}

const session = await bootTierUiSession();
const { browser, page, stopServer } = session;

try {
    await runTierUiSuite(page);
} finally {
    await browser?.close();
    await stopServer?.();
}
