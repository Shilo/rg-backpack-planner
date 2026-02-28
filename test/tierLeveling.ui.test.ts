import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import packageInfo from "../package.json";
import {
    chromium,
    type Browser,
    type BrowserContext,
    type Locator,
    type Page,
} from "playwright";
import {
    buildExpectedStateForScenario,
    createYellowBranchFixture,
    expectedTierIndex,
    tierScenarioCases,
    YELLOW_BRANCH_LENGTH,
} from "./tierLeveling.shared.ts";

const DEV_SERVER_URL = "http://127.0.0.1:4173";
const APP_URL = `${DEV_SERVER_URL}/rg-backpack-planner/`;
const DEV_SERVER_START_TIMEOUT_MS = 20_000;
const DEV_SERVER_POLL_DELAY_MS = 250;
const BROWSER_SLOW_MO_MS = 150;

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

const NODE_ACTIONS_MENU_SELECTOR = '[role="menu"][aria-label="Node actions"]';
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
        }, packageInfo.version ?? "0.1.0");

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

async function readNodeLevel(page: Page, index: number): Promise<number> {
    const node = page.locator(nodeSelector(index));
    if ((await node.count()) === 0) {
        throw new Error(`Missing node ${index}`);
    }

    const levelBadge = node.locator(".node-level");
    if ((await levelBadge.count()) === 0) {
        return 0;
    }

    return parseNodeBadgeValue(await levelBadge.textContent(), "level");
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

async function openNodeActionsMenu(page: Page, index: number): Promise<Locator> {
    const node = page.locator(nodeSelector(index));
    await node.waitFor({ state: "visible" });
    await node.click({ button: "right" });

    const menu = page.locator(NODE_ACTIONS_MENU_SELECTOR);
    await menu.waitFor({ state: "visible" });

    return menu;
}

async function clickMenuAction(menu: Locator, label: string): Promise<void> {
    const button = menu.getByRole("button", { name: label, exact: true });
    await button.waitFor({ state: "visible" });
    if (await button.isDisabled()) {
        throw new Error(`Menu action ${label} is disabled`);
    }

    await button.click();
}

async function waitForNodeLevelChange(
    page: Page,
    index: number,
    previousLevel: number,
): Promise<void> {
    await page.waitForFunction(
        ({ selector, previous }) => {
            const node = document.querySelector(selector);
            if (!node) return false;

            const badge = node.querySelector(".node-level");
            const nextText = badge?.textContent?.replaceAll(",", "").trim() ?? "";
            const nextLevel = nextText === "" ? 0 : Number(nextText);

            return Number.isFinite(nextLevel) && nextLevel !== previous;
        },
        { selector: nodeSelector(index), previous: previousLevel },
    );
}

async function closeNodeActionsMenu(page: Page): Promise<void> {
    const menu = page.locator(NODE_ACTIONS_MENU_SELECTOR);
    if ((await menu.count()) === 0) {
        return;
    }

    await page.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
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

    const clampedTarget = Math.min(Math.max(targetLevel, 0), node.maxLevel);
    let currentLevel = await readNodeLevel(page, index);

    if (currentLevel === clampedTarget) {
        return;
    }

    const menu = await openNodeActionsMenu(page, index);

    try {
        while (currentLevel !== clampedTarget) {
            const previousLevel = currentLevel;

            if (clampedTarget === 0) {
                await clickMenuAction(menu, "Reset");
            } else if (clampedTarget === node.maxLevel) {
                await clickMenuAction(menu, "Max");
            } else if (clampedTarget > currentLevel) {
                await clickMenuAction(
                    menu,
                    clampedTarget - currentLevel >= 10 ? "+10" : "+1",
                );
            } else {
                await clickMenuAction(
                    menu,
                    currentLevel - clampedTarget >= 10 ? "−10" : "−1",
                );
            }

            await waitForNodeLevelChange(page, index, previousLevel);
            currentLevel = await readNodeLevel(page, index);
        }
    } finally {
        await closeNodeActionsMenu(page);
    }
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

const firstCase = tierScenarioCases[0];
const expectedStates = firstCase
    ? buildExpectedStateForScenario(firstCase)
    : [];
const session = await bootTierUiSession();
const { browser, page, stopServer } = session;

try {
    console.log(`Tier UI stub: ${firstCase?.name ?? "missing case"}`);
    await page.goto(APP_URL);
    await ensureTierUiReady(page);
    await setNodeToLevel(page, 1, 100);
    const actual = await readYellowBranchState(page);
    assertUiStateEqual(
        firstCase?.name ?? "missing case",
        expectedStates[0] ?? [],
        actual,
    );
} finally {
    await browser?.close();
    await stopServer?.();
}
