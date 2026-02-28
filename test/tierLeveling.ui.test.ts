import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { join } from "node:path";
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
    buildExpectedBranchLevels,
    buildExpectedStateForScenario,
    buildRoundTripSequence,
    buildSeededScenarioCase,
    collectAncestors,
    createYellowBranchFixture,
    expectedTierIndex,
    formatTierStepState,
    nextStableTier,
    tierScenarioCases,
    tierSeededScenarioCases,
    tierSweepCases,
    YELLOW_BRANCH_LENGTH,
    type ScenarioCase,
    type ScenarioExpectedStates,
    type SweepCase,
} from "./tierLeveling.shared.ts";

const DEV_SERVER_URL = "http://127.0.0.1:4173";
const APP_URL = `${DEV_SERVER_URL}/rg-backpack-planner/`;
const TREE_LEVELS_STORE_MODULE_URL = new URL(
    "./src/lib/treeLevelsStore.ts",
    APP_URL,
).href;
const TECH_CRYSTAL_STORE_MODULE_URL = new URL(
    "./src/lib/techCrystalStore.ts",
    APP_URL,
).href;
const DEV_SERVER_START_TIMEOUT_MS = 20_000;
const DEV_SERVER_POLL_DELAY_MS = 250;
const BROWSER_SLOW_MO_MS = 0;
const CURRENT_VERSION = packageInfo.version ?? "0.1.0";
const UI_TIER_LOG_FILE_LABEL = "test/tierLeveling.ui.output.log";
const UI_TIER_LOG_FILE_URL = new URL(
    "./tierLeveling.ui.output.log",
    import.meta.url,
);
const UI_TIER_LOG_FILE_PATH = fileURLToPath(UI_TIER_LOG_FILE_URL);
const UI_TIER_ARTIFACTS_DIR = fileURLToPath(
    new URL("./artifacts/tier-leveling-ui/", import.meta.url),
);

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

type ExpectedUiStep = {
    expectedLevels: number[];
    nextLevel: number;
    previousLevel: number;
    stepIndex: number;
    targetIndex: number;
};

const yellowBranchNodes = createYellowBranchFixture().nodes;

function npmCommand() {
    return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function stopChildProcess(
    child: ReturnType<typeof spawn>,
): Promise<void> {
    if (child.exitCode !== null) {
        return;
    }

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
            // Server not ready yet.
        }

        await delay(DEV_SERVER_POLL_DELAY_MS);
    }

    throw new Error(`Timed out waiting for dev server at ${url}`);
}

async function bootTierUiSession(): Promise<TierUiSession> {
    const devServer =
        process.platform === "win32"
            ? spawn(
                  "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
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
                      "4173",
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

        const browser = await chromium.launch({
            headless: false,
            slowMo: BROWSER_SLOW_MO_MS,
        });
        const context = await browser.newContext();

        await context.addInitScript((version: string) => {
            localStorage.setItem(
                "rg-backpack-planner-latest-used-version",
                version,
            );
            localStorage.setItem("rg-backpack-planner-single-level-up", "false");
        }, CURRENT_VERSION);

        const page = await context.newPage();

        return {
            browser,
            context,
            page,
            stopServer,
        };
    } catch (error) {
        await stopServer();
        throw error;
    }
}

async function ensureTierUiReady(page: Page): Promise<void> {
    await page.waitForSelector('[data-node-id="0"]', { state: "visible" });
}

function resetUiTierLogFile(): void {
    writeFileSync(UI_TIER_LOG_FILE_URL, "", "utf8");
}

function logUiTierLine(line = ""): void {
    appendFileSync(UI_TIER_LOG_FILE_URL, `${line}\n`, "utf8");
}

function nodeSelector(index: number): string {
    return `[data-node-id="${index}"]`;
}

function parseNodeBadgeValue(text: string | null, label: string): number {
    const normalized = (text ?? "").replaceAll(",", "").trim();
    if (normalized === "") {
        return 0;
    }

    const value = Number(normalized);
    if (!Number.isFinite(value)) {
        throw new Error(`Invalid ${label} badge value: ${text ?? "<null>"}`);
    }

    return value;
}

async function readYellowBranchState(page: Page): Promise<UiBranchState> {
    const levels: number[] = [];
    const tiers: number[] = [];

    for (let index = 0; index < YELLOW_BRANCH_LENGTH; index += 1) {
        const node = page.locator(nodeSelector(index));
        if ((await node.count()) === 0) {
            throw new Error(`Missing node ${index}`);
        }

        const levelBadge = node.locator(".node-level");
        const tierBadge = node.locator(".node-tier");
        const level =
            (await levelBadge.count()) === 0
                ? 0
                : parseNodeBadgeValue(await levelBadge.textContent(), "level");
        const tier =
            (await tierBadge.count()) === 0
                ? 0
                : parseNodeBadgeValue(await tierBadge.textContent(), "tier");

        levels.push(level);
        tiers.push(tier);
    }

    return { levels, tiers };
}

async function waitForRenderedYellowBranch(
    page: Page,
    expectedLevels: number[],
): Promise<void> {
    await page.waitForFunction(
        (levels: number[]) => {
            return levels.every((expectedLevel, index) => {
                const node = document.querySelector(`[data-node-id="${index}"]`);
                if (!node) {
                    return false;
                }

                const badge = node.querySelector(".node-level");
                const text = badge?.textContent?.replaceAll(",", "").trim() ?? "";
                const level = text === "" ? 0 : Number(text);

                return Number.isFinite(level) && level === expectedLevel;
            });
        },
        expectedLevels,
    );
}

async function syncYellowBranchLevels(
    page: Page,
    branchLevels: number[],
): Promise<void> {
    await page.evaluate(
        async ({
            nextBranchLevels,
            techCrystalStoreUrl,
            treeLevelsStoreUrl,
        }: {
            nextBranchLevels: number[];
            techCrystalStoreUrl: string;
            treeLevelsStoreUrl: string;
        }) => {
            const [{ treeLevels, setTreeLevels }, { recalculateTechCrystalsSpent }] =
                await Promise.all([
                    import(treeLevelsStoreUrl),
                    import(techCrystalStoreUrl),
                ]);

            let currentTrees: number[][] = [];
            const unsubscribe = treeLevels.subscribe((value) => {
                currentTrees = value.map((levels) => [...levels]);
            });
            unsubscribe();

            if (currentTrees.length === 0) {
                throw new Error("Tree levels store is not initialized");
            }

            const nextActiveTree = [...(currentTrees[0] ?? [])];
            for (let index = 0; index < nextBranchLevels.length; index += 1) {
                nextActiveTree[index] = nextBranchLevels[index] ?? 0;
            }

            const nextTrees = currentTrees.map((levels, index) =>
                index === 0 ? nextActiveTree : [...levels],
            );

            setTreeLevels(0, nextActiveTree);
            recalculateTechCrystalsSpent(nextTrees);
        },
        {
            nextBranchLevels: branchLevels,
            techCrystalStoreUrl: TECH_CRYSTAL_STORE_MODULE_URL,
            treeLevelsStoreUrl: TREE_LEVELS_STORE_MODULE_URL,
        },
    );

    await waitForRenderedYellowBranch(page, branchLevels);
}

async function setNodeToLevel(
    page: Page,
    index: number,
    targetLevel: number,
): Promise<void> {
    const node = yellowBranchNodes[index];
    if (!node) {
        throw new Error(`Missing yellow-branch fixture node ${index}`);
    }

    const current = await readYellowBranchState(page);
    const { levels: nextLevels, deltas } = applyLevelChange({
        nodes: yellowBranchNodes,
        levels: current.levels,
        index,
        targetLevel: Math.min(Math.max(targetLevel, 0), node.maxLevel),
    });

    if (deltas.length === 0) {
        return;
    }

    await syncYellowBranchLevels(
        page,
        yellowBranchNodes.map((_, nodeIndex) => nextLevels[nodeIndex] ?? 0),
    );
}

function assertUiStateEqual(
    caseName: string,
    expectedLevels: number[],
    actual: UiBranchState,
): void {
    const expectedTiers = yellowBranchNodes.map((node, index) =>
        expectedTierIndex(expectedLevels[index] ?? 0, node.maxLevel),
    );

    for (let index = 0; index < YELLOW_BRANCH_LENGTH; index += 1) {
        const actualLevel = actual.levels[index] ?? 0;
        const expectedLevel = expectedLevels[index] ?? 0;
        if (actualLevel !== expectedLevel) {
            throw new Error(
                `${caseName} node ${index} level expected ${expectedLevel}, got ${actualLevel}`,
            );
        }

        const actualTier = actual.tiers[index] ?? 0;
        const expectedTier = expectedTiers[index] ?? 0;
        if (actualTier !== expectedTier) {
            throw new Error(
                `${caseName} node ${index} tier expected ${expectedTier}, got ${actualTier}`,
            );
        }
    }
}

function formatUiActualStepState(actual: UiBranchState): string[] {
    const levelTokens = actual.levels.map((level) => String(level));
    const tierTokens = actual.tiers.map((tier, index) =>
        String(tier).padStart(levelTokens[index]?.length ?? 1, " "),
    );

    return [
        `- actual levels: [${levelTokens.join(", ")}]`,
        `- actual tiers:  [${tierTokens.join(", ")}]`,
    ];
}

function buildSweepExpectedSteps(testCase: SweepCase): ExpectedUiStep[] {
    const { nodes } = createYellowBranchFixture();
    const targetNode = nodes[testCase.targetIndex];
    if (!targetNode) {
        throw new Error(`Missing sweep target node ${testCase.targetIndex}`);
    }

    const sequence = buildRoundTripSequence(targetNode.maxLevel);
    const ancestors = collectAncestors(nodes, testCase.targetIndex);
    let previousLevel = 0;
    let stableTier = 0;

    return sequence.map((targetLevel, stepIndex) => {
        const stepPreviousLevel = previousLevel;
        stableTier = nextStableTier({
            previousLevel,
            nextLevel: targetLevel,
            currentStableTier: stableTier,
            maxLevel: targetNode.maxLevel,
        });

        const expectedLevels = buildExpectedBranchLevels({
            nodes,
            targetIndex: testCase.targetIndex,
            targetLevel,
            stableTier,
            ancestors,
        });

        previousLevel = targetLevel;

        return {
            expectedLevels,
            nextLevel: targetLevel,
            previousLevel: stepPreviousLevel,
            stepIndex,
            targetIndex: testCase.targetIndex,
        };
    });
}

function buildScenarioExpectedSteps(
    testCase: ScenarioCase,
    expectedStates: ScenarioExpectedStates,
): ExpectedUiStep[] {
    const { levels: startingLevels } = createYellowBranchFixture();
    let currentLevels = [...startingLevels];

    if (expectedStates.length !== testCase.operations.length) {
        throw new Error(
            `${testCase.name} expected ${testCase.operations.length} states, got ${expectedStates.length}`,
        );
    }

    return testCase.operations.map((operation, stepIndex) => {
        const previousLevel = currentLevels[operation.index] ?? 0;
        const expectedLevels = expectedStates[stepIndex] ?? [];
        currentLevels = [...expectedLevels];

        return {
            expectedLevels,
            nextLevel: operation.targetLevel,
            previousLevel,
            stepIndex,
            targetIndex: operation.index,
        };
    });
}

async function resetTierUiPage(page: Page): Promise<void> {
    if (!page.url().startsWith(DEV_SERVER_URL)) {
        await page.goto(APP_URL);
        await ensureTierUiReady(page);
    }

    await page.evaluate((version: string) => {
        localStorage.clear();
        localStorage.setItem("rg-backpack-planner-latest-used-version", version);
        localStorage.setItem("rg-backpack-planner-single-level-up", "false");
    }, CURRENT_VERSION);

    await page.goto(APP_URL);
    await ensureTierUiReady(page);
}

function sanitizePathSegment(value: string): string {
    const sanitized = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return sanitized || "case";
}

async function captureUiFailureArtifact(
    page: Page,
    caseName: string,
    stepIndex: number,
): Promise<string> {
    const caseDir = join(UI_TIER_ARTIFACTS_DIR, sanitizePathSegment(caseName));
    mkdirSync(caseDir, { recursive: true });

    const screenshotPath = join(caseDir, `step-${stepIndex + 1}.png`);
    await page.screenshot({ fullPage: true, path: screenshotPath });

    return screenshotPath;
}

async function runUiCase(params: {
    caseName: string;
    caseLabel: string;
    page: Page;
    steps: ExpectedUiStep[];
}): Promise<number> {
    const { caseName, caseLabel, page, steps } = params;

    logUiTierLine(caseLabel);
    logUiTierLine("---");
    await resetTierUiPage(page);

    let failingStepIndex = 0;

    try {
        for (const step of steps) {
            failingStepIndex = step.stepIndex;

            await setNodeToLevel(page, step.targetIndex, step.nextLevel);
            const actual = await readYellowBranchState(page);

            formatTierStepState({
                nodes: yellowBranchNodes,
                expectedLevels: step.expectedLevels,
                previousLevel: step.previousLevel,
                nextLevel: step.nextLevel,
                stepIndex: step.stepIndex,
                targetIndex: step.targetIndex,
            })
                .slice(0, -1)
                .forEach((line) => {
                    logUiTierLine(line);
                });
            formatUiActualStepState(actual).forEach((line) => {
                logUiTierLine(line);
            });
            logUiTierLine();

            assertUiStateEqual(caseName, step.expectedLevels, actual);
        }

        logUiTierLine(`✅ PASSED (${steps.length} steps)`);
        return steps.length;
    } catch (error) {
        const screenshotPath = await captureUiFailureArtifact(
            page,
            caseName,
            failingStepIndex,
        );
        logUiTierLine(
            `❌ FAILED: ${error instanceof Error ? error.message : String(error)}`,
        );
        logUiTierLine(`Screenshot: ${screenshotPath}`);
        throw error;
    } finally {
        logUiTierLine();
    }
}

async function runTierUiSuite(page: Page): Promise<void> {
    resetUiTierLogFile();
    logUiTierLine("===");
    logUiTierLine("Tier Leveling UI Tests");
    logUiTierLine(`Log file: ${UI_TIER_LOG_FILE_LABEL}`);
    logUiTierLine("===");
    logUiTierLine();

    const total =
        tierSweepCases.length +
        tierScenarioCases.length +
        tierSeededScenarioCases.length;
    let passed = 0;
    let failed = 0;
    let suiteError: unknown = null;

    try {
        for (const [index, testCase] of tierSweepCases.entries()) {
            await runUiCase({
                caseName: testCase.name,
                caseLabel: `Tier Test ${index + 1}: ${testCase.name}`,
                page,
                steps: buildSweepExpectedSteps(testCase),
            });
            passed++;
        }

        for (const [index, testCase] of tierScenarioCases.entries()) {
            await runUiCase({
                caseName: testCase.name,
                caseLabel: `Scenario Test ${index + 1}: ${testCase.name}`,
                page,
                steps: buildScenarioExpectedSteps(
                    testCase,
                    buildExpectedStateForScenario(testCase),
                ),
            });
            passed++;
        }

        for (const [index, testCase] of tierSeededScenarioCases.entries()) {
            const generatedCase = buildSeededScenarioCase(testCase);
            await runUiCase({
                caseName: generatedCase.name,
                caseLabel: `Seeded Test ${index + 1}: ${generatedCase.name}`,
                page,
                steps: buildScenarioExpectedSteps(
                    generatedCase,
                    buildExpectedStateForScenario(generatedCase),
                ),
            });
            passed++;
        }
    } catch (error) {
        failed = 1;
        suiteError = error;
    }

    logUiTierLine("===");
    logUiTierLine("Tier Leveling UI Summary");
    logUiTierLine("===");
    logUiTierLine(`📊 Total tests: ${total}`);
    logUiTierLine(`✅ Passed: ${passed}`);
    logUiTierLine(`❌ Failed: ${failed}`);
    logUiTierLine(`Log file: ${UI_TIER_LOG_FILE_PATH}:1`);
    logUiTierLine("===");

    if (suiteError) {
        throw suiteError;
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
