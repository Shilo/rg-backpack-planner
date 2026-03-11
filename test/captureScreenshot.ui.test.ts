// Server: Vite preview server on port 4173 (Vite preview default).
// Requires a production build in dist/ — run "npm run build" or use the "Test UI"
// launch config (which has preLaunchTask: "npm: build"). Preview is used here because
// capture tests exercise the fully-built app (CSS inlining, asset bundling) rather than
// Vite's dev-server transform pipeline.
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

const DEV_SERVER_URL = "http://127.0.0.1:4173";
const APP_URL = `${DEV_SERVER_URL}/rg-backpack-planner/`;
const DEV_SERVER_START_TIMEOUT_MS = 30_000;
const DEV_SERVER_POLL_DELAY_MS = 250;
const COMPOSE_LOAD_TIMEOUT_MS = 20_000;
const CURRENT_VERSION = packageInfo.version ?? "0.1.0";
const LOG_FILE_LABEL = "test/captureScreenshot.ui.output.log";
const LOG_FILE_URL = new URL("./captureScreenshot.ui.output.log", import.meta.url);
const LOG_FILE_PATH = fileURLToPath(LOG_FILE_URL);

type CaptureUiSession = {
    browser: Browser;
    context: BrowserContext;
    page: Page;
    stopServer: () => Promise<void>;
};

function npmCommand() {
    return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function stopChildProcess(child: ReturnType<typeof spawn>): Promise<void> {
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

    throw new Error(`Timed out waiting for preview server at ${url}`);
}

async function bootCaptureUiSession(): Promise<CaptureUiSession> {
    const previewServer =
        process.platform === "win32"
            ? spawn(
                  "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
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
                      "preview",
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
        await stopChildProcess(previewServer);
    };

    try {
        await waitForServer(DEV_SERVER_URL, DEV_SERVER_START_TIMEOUT_MS);

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

        await context.addInitScript((version: string) => {
            localStorage.setItem("rg-backpack-planner-latest-used-version", version);
            localStorage.setItem("rg-backpack-planner-node-touch-action", "0");
        }, CURRENT_VERSION);

        const page = await context.newPage();
        return { browser, context, page, stopServer };
    } catch (error) {
        await stopServer();
        throw error;
    }
}

async function waitForTreeReady(page: Page): Promise<void> {
    await page.waitForSelector('[data-node-id="0"]', { state: "visible", timeout: 15_000 });
}

async function resetCapturePage(page: Page): Promise<void> {
    if (!page.url().startsWith(DEV_SERVER_URL)) {
        await page.goto(APP_URL);
        await waitForTreeReady(page);
    }

    await page.evaluate((version: string) => {
        localStorage.clear();
        localStorage.setItem("rg-backpack-planner-latest-used-version", version);
        localStorage.setItem("rg-backpack-planner-node-touch-action", "0");
    }, CURRENT_VERSION);

    await page.goto(APP_URL);
    await waitForTreeReady(page);
}

async function getTreeTransform(page: Page): Promise<string> {
    return page.evaluate(() => {
        const canvas = document.querySelector(".tree-canvas") as HTMLElement | null;
        return canvas?.style.transform ?? "";
    });
}

async function openComposeScreenshot(page: Page): Promise<void> {
    // Click menu button to open side menu
    await page.click('[aria-label="Menu"]');
    // Click "Share Build" button to open share sub-menu
    await page.getByRole("button", { name: /Share Build/i }).first().click();
    // Click "Share screenshot" to open compose modal
    await page.getByRole("button", { name: /Share screenshot/i }).click();
    // Wait for compose modal to appear
    await page.waitForSelector(".fullscreen-modal", { state: "visible" });
}

async function waitForComposeImageLoaded(page: Page): Promise<void> {
    // Wait for loading indicator to disappear
    await page.waitForSelector(".compose-loading", {
        state: "detached",
        timeout: COMPOSE_LOAD_TIMEOUT_MS,
    });
}

async function closeComposeScreenshot(page: Page): Promise<void> {
    await page.click(".bottom-nav-bar__close-button");
    await page.waitForSelector(".fullscreen-modal", { state: "detached" });
}

async function zoomTree(page: Page, deltaY: number): Promise<void> {
    const viewport = page.locator(".tree-viewport");
    const box = await viewport.boundingBox();
    if (!box) throw new Error("Tree viewport not found");

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, deltaY);
    // Allow tree to settle after zoom
    await delay(200);
}

async function panTree(page: Page, dx: number, dy: number): Promise<void> {
    const viewport = page.locator(".tree-viewport");
    const box = await viewport.boundingBox();
    if (!box) throw new Error("Tree viewport not found");

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + dx, cy + dy, { steps: 5 });
    await page.mouse.up();
    await delay(150);
}

function resetLogFile() {
    writeFileSync(LOG_FILE_URL, "", "utf8");
}

function logLine(line = "") {
    console.log(line);
    appendFileSync(LOG_FILE_URL, `${line}\n`, "utf8");
}

type Scenario = {
    name: string;
    run: (page: Page) => Promise<void>;
};

const scenarios: Scenario[] = [
    {
        name: "Default zoom → open compose",
        async run(page) {
            await openComposeScreenshot(page);
            await waitForComposeImageLoaded(page);
            // Verify image is shown (not error state)
            const imageCount = await page.locator(".image-viewer__img").count();
            assert.ok(imageCount > 0, "Expected image to be visible in compose modal");
            await closeComposeScreenshot(page);
        },
    },
    {
        name: "Zoom in → open compose → close → view state restored",
        async run(page) {
            // Zoom in (negative deltaY = scroll up = zoom in)
            await zoomTree(page, -600);
            const transformBefore = await getTreeTransform(page);
            assert.ok(transformBefore, "Expected a non-empty tree transform after zoom-in");

            await openComposeScreenshot(page);
            await waitForComposeImageLoaded(page);
            await closeComposeScreenshot(page);

            const transformAfter = await getTreeTransform(page);
            assert.strictEqual(
                transformAfter,
                transformBefore,
                "Tree transform should be restored to zoomed-in state after closing compose",
            );
        },
    },
    {
        name: "Zoom out → open compose → close → view state restored",
        async run(page) {
            // Zoom out (positive deltaY = scroll down = zoom out)
            await zoomTree(page, 600);
            const transformBefore = await getTreeTransform(page);
            assert.ok(transformBefore, "Expected a non-empty tree transform after zoom-out");

            await openComposeScreenshot(page);
            await waitForComposeImageLoaded(page);
            await closeComposeScreenshot(page);

            const transformAfter = await getTreeTransform(page);
            assert.strictEqual(
                transformAfter,
                transformBefore,
                "Tree transform should be restored to zoomed-out state after closing compose",
            );
        },
    },
    {
        name: "Pan tree → open compose → close → view state restored",
        async run(page) {
            // Wait for reactive focus to settle before panning
            await delay(300);
            await panTree(page, 150, 100);
            const transformBefore = await getTreeTransform(page);
            assert.ok(transformBefore, "Expected a non-empty tree transform after pan");

            await openComposeScreenshot(page);
            await waitForComposeImageLoaded(page);
            await closeComposeScreenshot(page);

            const transformAfter = await getTreeTransform(page);
            assert.strictEqual(
                transformAfter,
                transformBefore,
                "Tree transform should be restored to panned state after closing compose",
            );
        },
    },
    {
        name: "Level nodes → open compose → capture succeeds",
        async run(page) {
            // Click the first visible node button to level it
            await page.locator(".button.node").first().click();
            await delay(150);

            await openComposeScreenshot(page);
            await waitForComposeImageLoaded(page);
            const imageCount = await page.locator(".image-viewer__img").count();
            assert.ok(imageCount > 0, "Expected image after leveling nodes");
            await closeComposeScreenshot(page);
        },
    },
    {
        name: "showSkillName=false → open compose → capture succeeds",
        async run(page) {
            await page.evaluate(() => {
                localStorage.setItem("rg-backpack-planner-show-skill-name", "false");
            });
            await page.goto(APP_URL);
            await waitForTreeReady(page);

            await openComposeScreenshot(page);
            await waitForComposeImageLoaded(page);
            const imageCount = await page.locator(".image-viewer__img").count();
            assert.ok(imageCount > 0, "Expected image with showSkillName=false");
            await closeComposeScreenshot(page);
        },
    },
    {
        name: "showTier=true → open compose → capture succeeds",
        async run(page) {
            await page.evaluate(() => {
                localStorage.setItem("rg-backpack-planner-show-tier", "true");
            });
            await page.goto(APP_URL);
            await waitForTreeReady(page);

            await openComposeScreenshot(page);
            await waitForComposeImageLoaded(page);
            const imageCount = await page.locator(".image-viewer__img").count();
            assert.ok(imageCount > 0, "Expected image with showTier=true");
            await closeComposeScreenshot(page);
        },
    },
    {
        name: "textSize changed → open compose → capture succeeds",
        async run(page) {
            await page.evaluate(() => {
                // Set text size to notch 10 (a non-default value)
                localStorage.setItem("rg-backpack-planner-text-size", "10");
            });
            await page.goto(APP_URL);
            await waitForTreeReady(page);

            await openComposeScreenshot(page);
            await waitForComposeImageLoaded(page);
            const imageCount = await page.locator(".image-viewer__img").count();
            assert.ok(imageCount > 0, "Expected image with custom text size");
            await closeComposeScreenshot(page);
        },
    },
    {
        name: "closeUpZoom setting → capture at fit scale → image succeeds",
        async run(page) {
            await page.evaluate(() => {
                // TreeZoomLevel.CloseUp = 1
                localStorage.setItem("rg-backpack-planner-tree-zoom-scale", "1");
            });
            await page.goto(APP_URL);
            await waitForTreeReady(page);

            await openComposeScreenshot(page);
            await waitForComposeImageLoaded(page);
            const imageCount = await page.locator(".image-viewer__img").count();
            assert.ok(imageCount > 0, "Expected image with close-up zoom setting");
            await closeComposeScreenshot(page);
        },
    },
    {
        name: "closeUpZoom + user zoomed-in → close compose → user zoom restored",
        async run(page) {
            await page.evaluate(() => {
                localStorage.setItem("rg-backpack-planner-tree-zoom-scale", "1");
            });
            await page.goto(APP_URL);
            await waitForTreeReady(page);

            // Zoom in on top of close-up zoom
            await zoomTree(page, -400);
            const transformBefore = await getTreeTransform(page);
            assert.ok(transformBefore, "Expected non-empty transform after close-up zoom + user zoom");

            await openComposeScreenshot(page);
            await waitForComposeImageLoaded(page);
            await closeComposeScreenshot(page);

            const transformAfter = await getTreeTransform(page);
            assert.strictEqual(
                transformAfter,
                transformBefore,
                "Tree transform should be restored to user's zoomed-in state after closing compose (even with close-up zoom setting)",
            );
        },
    },
    {
        name: "locale=ja → open compose → capture succeeds",
        async run(page) {
            await page.evaluate(() => {
                localStorage.setItem("rg-backpack-planner-locale", "ja");
            });
            await page.goto(APP_URL);
            await waitForTreeReady(page);

            await openComposeScreenshot(page);
            await waitForComposeImageLoaded(page);
            const imageCount = await page.locator(".image-viewer__img").count();
            assert.ok(imageCount > 0, "Expected image with Japanese locale");
            await closeComposeScreenshot(page);
        },
    },
    {
        name: "locale=zh → open compose → capture succeeds",
        async run(page) {
            await page.evaluate(() => {
                localStorage.setItem("rg-backpack-planner-locale", "zh");
            });
            await page.goto(APP_URL);
            await waitForTreeReady(page);

            await openComposeScreenshot(page);
            await waitForComposeImageLoaded(page);
            const imageCount = await page.locator(".image-viewer__img").count();
            assert.ok(imageCount > 0, "Expected image with Chinese locale");
            await closeComposeScreenshot(page);
        },
    },
    {
        name: "showTier=true + showSkillName=false + textSize=large → capture succeeds",
        async run(page) {
            await page.evaluate(() => {
                localStorage.setItem("rg-backpack-planner-show-tier", "true");
                localStorage.setItem("rg-backpack-planner-show-skill-name", "false");
                localStorage.setItem("rg-backpack-planner-text-size", "10");
            });
            await page.goto(APP_URL);
            await waitForTreeReady(page);

            await openComposeScreenshot(page);
            await waitForComposeImageLoaded(page);
            const imageCount = await page.locator(".image-viewer__img").count();
            assert.ok(imageCount > 0, "Expected image with combined settings (showTier, no skillName, large text)");
            await closeComposeScreenshot(page);
        },
    },
    {
        name: "Switch tabs then open compose → all 3 tree images non-null",
        async run(page) {
            // Switch to the last tab and back to exercise tab switching
            const tabButtons = page.locator(".tab-bar__tab-button");
            const tabCount = await tabButtons.count();
            if (tabCount >= 3) {
                await tabButtons.nth(2).click();
                await delay(200);
                await tabButtons.nth(0).click();
                await delay(200);
            }

            await openComposeScreenshot(page);
            await waitForComposeImageLoaded(page);

            // Verify the combined image loaded (all tab)
            const imageCount = await page.locator(".image-viewer__img").count();
            assert.ok(imageCount > 0, "Expected combined image after switching tabs");

            // Switch to individual tree tabs and verify images are non-null
            const composeTabs = page.locator(".fullscreen-modal .tab-bar__tab-button");
            const composeTabCount = await composeTabs.count();
            for (let i = 1; i < composeTabCount; i += 1) {
                await composeTabs.nth(i).click();
                await delay(150);
                const tabImageCount = await page.locator(".image-viewer__img").count();
                assert.ok(tabImageCount > 0, `Expected image for compose tab ${i}`);
            }

            await closeComposeScreenshot(page);
        },
    },
];

async function runCaptureSuite(page: Page): Promise<void> {
    resetLogFile();
    logLine("===");
    logLine("Capture Screenshot UI Tests");
    logLine(`Log file: ${LOG_FILE_LABEL}`);
    logLine("===");
    logLine();

    let passed = 0;
    let failed = 0;

    for (const [index, scenario] of scenarios.entries()) {
        logLine(`Scenario ${index + 1}: ${scenario.name}`);
        logLine("---");
        try {
            await resetCapturePage(page);
            await scenario.run(page);
            logLine(`✅ PASSED`);
            passed += 1;
        } catch (error) {
            logLine(
                `❌ FAILED: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
            failed += 1;
        }
        logLine();
    }

    logLine("===");
    logLine("Capture UI Summary");
    logLine("===");
    logLine(`📊 Total tests: ${scenarios.length}`);
    logLine(`✅ Passed: ${passed}`);
    logLine(`❌ Failed: ${failed}`);
    logLine(`Log file: ${LOG_FILE_PATH}:1`);
    logLine("===");

    if (failed > 0) {
        throw new Error(`${failed} capture UI test(s) failed`);
    }
}

const session = await bootCaptureUiSession();
const { browser, page, stopServer } = session;

try {
    await runCaptureSuite(page);
} finally {
    await browser?.close();
    await stopServer?.();
}
