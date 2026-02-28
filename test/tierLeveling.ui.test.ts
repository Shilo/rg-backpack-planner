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
import { truncateText } from "../src/lib/stringUtil.ts";
import type { Node as TreeNode } from "../src/types/tree.ts";
import {
    applyExpectedTargetTransition,
    buildExpectedBranchLevels,
    buildRoundTripSequence,
    buildSeededScenarioCase,
    collectAncestors,
    createYellowBranchFixture,
    expectedTierIndex,
    expectedTierUpper,
    formatTierStateGroup,
    formatTierStepState,
    nextStableTier,
    partitionYellowBranchRoles,
    tierExplicitScenarioCases,
    tierSeededInvariantCases,
    tierSweepCases,
    uniqueBoundaryLevels,
    YELLOW_BRANCH_LENGTH,
    type ScenarioCase,
    type ScenarioExpectedStates,
    type SweepCase,
} from "./tierLeveling.shared.ts";

const DEV_SERVER_URL = "http://127.0.0.1:4173";
const APP_URL = `${DEV_SERVER_URL}/rg-backpack-planner/`;
const PLAYWRIGHT_INDICATOR_STORE_MODULE_URL = new URL(
    "./src/lib/dev/playwrightIndicatorStore.dev.ts",
    APP_URL,
).href;
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
const RUN_FULL_UI_TWO_STEP_MATRIX = process.env.RG_TIER_UI_SKIP_MATRIX !== "1";
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

type PlaywrightIndicatorState = {
    title: string;
    detail: string | null;
    tooltip: string;
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

function expectedUiTiersForLevels(levels: number[]): number[] {
    return yellowBranchNodes.map((node, index) =>
        expectedTierIndex(levels[index] ?? 0, node.maxLevel),
    );
}

async function waitForRenderedYellowBranch(
    page: Page,
    expectedLevels: number[],
): Promise<void> {
    const expectedTiers = expectedUiTiersForLevels(expectedLevels);

    await page.waitForFunction(
        ({
            levels,
            tiers,
        }: {
            levels: number[];
            tiers: number[];
        }) => {
            return levels.every((expectedLevel, index) => {
                const node = document.querySelector(`[data-node-id="${index}"]`);
                if (!node) {
                    return false;
                }

                const levelBadge = node.querySelector(".node-level");
                const levelText =
                    levelBadge?.textContent?.replaceAll(",", "").trim() ?? "";
                const level = levelText === "" ? 0 : Number(levelText);
                const tierBadge = node.querySelector(".node-tier");
                const tierText =
                    tierBadge?.textContent?.replaceAll(",", "").trim() ?? "";
                const tier = tierText === "" ? 0 : Number(tierText);

                return (
                    Number.isFinite(level) &&
                    level === expectedLevel &&
                    Number.isFinite(tier) &&
                    tier === (tiers[index] ?? 0)
                );
            });
        },
        {
            levels: expectedLevels,
            tiers: expectedTiers,
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

async function setPlaywrightIndicatorState(
    page: Page,
    state: PlaywrightIndicatorState | null,
): Promise<void> {
    await page.evaluate(
        async ({
            moduleUrl,
            nextState,
        }: {
            moduleUrl: string;
            nextState: PlaywrightIndicatorState | null;
        }) => {
            const { setPlaywrightIndicatorState } = await import(moduleUrl);
            setPlaywrightIndicatorState(nextState);
        },
        {
            moduleUrl: PLAYWRIGHT_INDICATOR_STORE_MODULE_URL,
            nextState: state,
        },
    );
}

function buildPlaywrightIndicatorState(
    caseLabel: string,
): PlaywrightIndicatorState {
    const separator = ": ";
    const separatorIndex = caseLabel.indexOf(separator);

    if (separatorIndex === -1) {
        return {
            title: caseLabel,
            detail: null,
            tooltip: "UI test in progress",
        };
    }

    return {
        title: caseLabel.slice(0, separatorIndex),
        detail: caseLabel.slice(separatorIndex + separator.length),
        tooltip: "UI test in progress",
    };
}

function buildMatrixProgressIndicatorState(
    completed: number,
    total: number,
): PlaywrightIndicatorState {
    return {
        title: "Two-Step Matrix Test 1",
        detail: `${completed.toLocaleString()} / ${total.toLocaleString()}`,
        tooltip: "UI test in progress",
    };
}

async function waitForPlaywrightIndicator(
    page: Page,
    state: PlaywrightIndicatorState,
): Promise<void> {
    const expectedDetail = state.detail ? truncateText(state.detail) : null;

    await page.waitForFunction(
        ({
            detail,
            title,
        }: {
            detail: string | null;
            title: string;
        }) => {
            const indicator = document.querySelector(".preview-indicator-button");
            if (!(indicator instanceof HTMLElement)) {
                return false;
            }

            const titleText = indicator
                .querySelector(".indicator-title")
                ?.textContent?.trim();
            if (titleText !== title) {
                return false;
            }

            if (detail === null) {
                return indicator.querySelector(".build-name") === null;
            }

            const detailText = indicator
                .querySelector(".build-name")
                ?.textContent?.trim();
            return detailText === detail;
        },
        {
            detail: expectedDetail,
            title: state.title,
        },
    );
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
    return formatTierStateGroup({
        groupLabel: "actual",
        levels: actual.levels,
        tiers: actual.tiers,
    });
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

function meetsStableTierHoldFloor(params: {
    level: number;
    maxLevel: TreeNode["maxLevel"];
    tier: number;
}): boolean {
    const { level, maxLevel, tier } = params;

    if (tier <= 0) return true;
    if (level <= 0) return false;
    if (maxLevel <= 1) return true;
    if (tier === 1) return true;

    return level >= expectedTierUpper(tier - 1, maxLevel);
}

function inferStableTierFromObservedState(params: {
    levels: number[];
    nodes: TreeNode[];
    targetIndex: number;
}): number {
    const { levels, nodes, targetIndex } = params;
    const targetNode = nodes[targetIndex];
    if (!targetNode) return 0;

    const roles = partitionYellowBranchRoles(nodes, targetIndex);
    const targetLevel = levels[targetIndex] ?? 0;

    for (let candidateTier = 5; candidateTier > 0; candidateTier -= 1) {
        if (
            !meetsStableTierHoldFloor({
                level: targetLevel,
                maxLevel: targetNode.maxLevel,
                tier: candidateTier,
            })
        ) {
            continue;
        }

        const wrappedTier = Math.max(candidateTier - 1, 0);
        let satisfiesContract = true;

        nodes.forEach((node, index) => {
            if (!satisfiesContract || index === targetIndex) return;

            const requiredTier = roles.ancestors.has(index)
                ? candidateTier
                : wrappedTier;
            const requiredLevel = expectedTierUpper(requiredTier, node.maxLevel);
            if ((levels[index] ?? 0) < requiredLevel) {
                satisfiesContract = false;
            }
        });

        if (satisfiesContract) {
            return candidateTier;
        }
    }

    return 0;
}

function assertUiInvariantState(params: {
    caseName: string;
    currentLevels: number[];
    stepIndex: number;
    targetIndex: number;
    targetLevel: number;
    actual: UiBranchState;
}): void {
    const { caseName, currentLevels, stepIndex, targetIndex, targetLevel, actual } =
        params;
    const node = yellowBranchNodes[targetIndex];
    if (!node) {
        throw new Error(
            `${caseName} step ${stepIndex} targets missing node ${targetIndex}`,
        );
    }

    const previousLevel = currentLevels[targetIndex] ?? 0;
    const clampedTarget = Math.min(Math.max(targetLevel, 0), node.maxLevel);
    const currentStableTier = inferStableTierFromObservedState({
        levels: currentLevels,
        nodes: yellowBranchNodes,
        targetIndex,
    });
    const actualStableTier = inferStableTierFromObservedState({
        levels: actual.levels,
        nodes: yellowBranchNodes,
        targetIndex,
    });
    const roles = partitionYellowBranchRoles(yellowBranchNodes, targetIndex);

    if ((actual.levels[targetIndex] ?? 0) !== clampedTarget) {
        throw new Error(
            `${caseName} step ${stepIndex} target ${targetIndex} expected level ${clampedTarget}, got ${
                actual.levels[targetIndex] ?? 0
            }`,
        );
    }

    if (clampedTarget > previousLevel && actualStableTier < currentStableTier) {
        throw new Error(
            `${caseName} step ${stepIndex} target ${targetIndex} stable tier decreased during increment (${currentStableTier} -> ${actualStableTier})`,
        );
    }

    if (clampedTarget < previousLevel && actualStableTier > currentStableTier) {
        throw new Error(
            `${caseName} step ${stepIndex} target ${targetIndex} stable tier increased during decrement (${currentStableTier} -> ${actualStableTier})`,
        );
    }

    if (clampedTarget === previousLevel && actualStableTier !== currentStableTier) {
        throw new Error(
            `${caseName} step ${stepIndex} target ${targetIndex} stable tier changed without a level change (${currentStableTier} -> ${actualStableTier})`,
        );
    }

    yellowBranchNodes.forEach((branchNode, index) => {
        const actualLevel = actual.levels[index] ?? 0;

        if (actualLevel < 0 || actualLevel > branchNode.maxLevel) {
            throw new Error(
                `${caseName} step ${stepIndex} node ${index} exceeded bounds: ${actualLevel}`,
            );
        }

        if (index === targetIndex) return;

        const previousNodeLevel = currentLevels[index] ?? 0;
        const assignedTier = roles.ancestors.has(index)
            ? actualStableTier
            : Math.max(actualStableTier - 1, 0);
        const assignedLevel = expectedTierUpper(
            assignedTier,
            branchNode.maxLevel,
        );

        if (clampedTarget === previousLevel) {
            if (actualLevel !== previousNodeLevel) {
                throw new Error(
                    `${caseName} step ${stepIndex} node ${index} expected level ${previousNodeLevel}, got ${actualLevel}`,
                );
            }

            return;
        }

        if (clampedTarget > previousLevel) {
            const expectedLevel = Math.max(previousNodeLevel, assignedLevel);
            if (actualLevel !== expectedLevel) {
                throw new Error(
                    `${caseName} step ${stepIndex} node ${index} expected level ${expectedLevel}, got ${actualLevel}`,
                );
            }

            return;
        }

        if (actualLevel > previousNodeLevel) {
            throw new Error(
                `${caseName} step ${stepIndex} node ${index} increased during decrement (${previousNodeLevel} -> ${actualLevel})`,
            );
        }

        if (actualLevel < assignedLevel) {
            throw new Error(
                `${caseName} step ${stepIndex} node ${index} dropped below floor ${assignedLevel}, got ${actualLevel}`,
            );
        }
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
    const indicatorState = buildPlaywrightIndicatorState(caseLabel);
    await setPlaywrightIndicatorState(page, indicatorState);
    await waitForPlaywrightIndicator(page, indicatorState);

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

async function runUiInvariantCase(params: {
    caseName: string;
    caseLabel: string;
    operations: ScenarioCase["operations"];
    page: Page;
}): Promise<number> {
    const { caseName, caseLabel, operations, page } = params;

    logUiTierLine(caseLabel);
    logUiTierLine("---");
    await resetTierUiPage(page);
    const indicatorState = buildPlaywrightIndicatorState(caseLabel);
    await setPlaywrightIndicatorState(page, indicatorState);
    await waitForPlaywrightIndicator(page, indicatorState);

    let currentLevels = new Array(YELLOW_BRANCH_LENGTH).fill(0);
    let failingStepIndex = 0;

    try {
        for (const [stepIndex, operation] of operations.entries()) {
            failingStepIndex = stepIndex;
            const previousLevel = currentLevels[operation.index] ?? 0;
            const node = yellowBranchNodes[operation.index];
            if (!node) {
                throw new Error(
                    `${caseName} step ${stepIndex} targets missing node ${operation.index}`,
                );
            }

            const clampedTarget = Math.min(
                Math.max(operation.targetLevel, 0),
                node.maxLevel,
            );

            await setNodeToLevel(page, operation.index, operation.targetLevel);
            const actual = await readYellowBranchState(page);

            logUiTierLine(
                `step ${stepIndex + 1} [index ${operation.index}] (${previousLevel} -> ${clampedTarget})`,
            );
            formatUiActualStepState(actual).forEach((line) => {
                logUiTierLine(line);
            });
            logUiTierLine();

            assertUiInvariantState({
                caseName,
                currentLevels,
                stepIndex,
                targetIndex: operation.index,
                targetLevel: operation.targetLevel,
                actual,
            });

            currentLevels = [...actual.levels];
        }

        logUiTierLine(`✅ PASSED (${operations.length} steps)`);
        return operations.length;
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

async function runUiTwoStepMatrixPreflight(page: Page): Promise<number> {
    const { nodes, levels: startingLevels } = createYellowBranchFixture();
    const zeroLevels = [...startingLevels];
    const candidateLevelsByTarget = nodes.map((node) =>
        uniqueBoundaryLevels(node.maxLevel),
    );
    const totalSequences =
        candidateLevelsByTarget.reduce(
            (total, levels) => total + levels.length,
            0,
        ) ** 2;
    let sequenceCount = 0;

    await resetTierUiPage(page);
    const indicatorState = buildMatrixProgressIndicatorState(
        0,
        totalSequences,
    );
    await setPlaywrightIndicatorState(page, indicatorState);
    await waitForPlaywrightIndicator(page, indicatorState);

    try {
        for (const [firstTargetIndex, firstTargetNode] of nodes.entries()) {
            const firstCandidateLevels = candidateLevelsByTarget[firstTargetIndex] ?? [];

            for (const firstTargetLevel of firstCandidateLevels) {
                const firstStableTier = nextStableTier({
                    previousLevel: 0,
                    nextLevel: firstTargetLevel,
                    currentStableTier: 0,
                    maxLevel: firstTargetNode.maxLevel,
                });
                const firstExpectedLevels = applyExpectedTargetTransition({
                    currentLevels: zeroLevels,
                    nodes,
                    previousLevel: 0,
                    nextLevel: firstTargetLevel,
                    stableTier: firstStableTier,
                    targetIndex: firstTargetIndex,
                });

                await syncYellowBranchLevels(page, firstExpectedLevels);

                for (const [secondTargetIndex, secondTargetNode] of nodes.entries()) {
                    const secondCandidateLevels =
                        candidateLevelsByTarget[secondTargetIndex] ?? [];
                    const secondStartingLevel =
                        firstExpectedLevels[secondTargetIndex] ?? 0;
                    const secondCurrentStableTier = inferStableTierFromObservedState({
                        levels: firstExpectedLevels,
                        nodes,
                        targetIndex: secondTargetIndex,
                    });

                    for (const secondTargetLevel of secondCandidateLevels) {
                        const secondStableTier = nextStableTier({
                            previousLevel: secondStartingLevel,
                            nextLevel: secondTargetLevel,
                            currentStableTier: secondCurrentStableTier,
                            maxLevel: secondTargetNode.maxLevel,
                        });
                        const secondExpectedLevels = applyExpectedTargetTransition({
                            currentLevels: firstExpectedLevels,
                            nodes,
                            previousLevel: secondStartingLevel,
                            nextLevel: secondTargetLevel,
                            stableTier: secondStableTier,
                            targetIndex: secondTargetIndex,
                        });

                        await syncYellowBranchLevels(page, secondExpectedLevels);

                        sequenceCount += 1;
                        if (
                            sequenceCount % 250 === 0 ||
                            sequenceCount === totalSequences
                        ) {
                            await setPlaywrightIndicatorState(
                                page,
                                buildMatrixProgressIndicatorState(
                                    sequenceCount,
                                    totalSequences,
                                ),
                            );
                        }
                    }
                }
            }
        }

        return sequenceCount;
    } catch (error) {
        throw new Error(
            `Two-step matrix failed after ${sequenceCount.toLocaleString()} / ${totalSequences.toLocaleString()} sequences: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
}

async function runTierUiSuite(page: Page): Promise<void> {
    resetUiTierLogFile();
    logUiTierLine("===");
    logUiTierLine("Tier Leveling Tests");
    logUiTierLine(`Log file: ${UI_TIER_LOG_FILE_LABEL}`);
    logUiTierLine("===");
    logUiTierLine();

    const total =
        (RUN_FULL_UI_TWO_STEP_MATRIX ? 1 : 0) +
        tierSweepCases.length +
        tierExplicitScenarioCases.length +
        tierSeededInvariantCases.length;
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

        for (const [index, testCase] of tierExplicitScenarioCases.entries()) {
            await runUiCase({
                caseName: testCase.name,
                caseLabel: `Explicit Scenario Test ${index + 1}: ${testCase.name}`,
                page,
                steps: buildScenarioExpectedSteps(testCase, testCase.expectedStates),
            });
            passed++;
        }

        for (const [index, testCase] of tierSeededInvariantCases.entries()) {
            const generatedCase = buildSeededScenarioCase(testCase);
            await runUiInvariantCase({
                caseName: generatedCase.name,
                caseLabel: `Seeded Invariant Test ${index + 1}: ${generatedCase.name}`,
                operations: generatedCase.operations,
                page,
            });
            passed++;
        }

        if (RUN_FULL_UI_TWO_STEP_MATRIX) {
            logUiTierLine("Two-Step Matrix Test 1: Yellow cross-target boundary matrix");
            logUiTierLine("---");
            const sequences = await runUiTwoStepMatrixPreflight(page);
            logUiTierLine(`✅ PASSED (${sequences} sequences)`);
            logUiTierLine();
            passed++;
        }
    } catch (error) {
        failed = 1;
        suiteError = error;
    }

    logUiTierLine("===");
    logUiTierLine("Tier Leveling Summary");
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
    await setPlaywrightIndicatorState(page, null);
} finally {
    await browser?.close();
    await stopServer?.();
}
