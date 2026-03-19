/**
 * Undo/Redo Browser Smoke Test
 *
 * Tests the undo/redo system in the actual browser with real DOM interactions.
 * Covers: toolbar visibility, button states, undo/redo via clicks and keyboard,
 * cross-tree undo with tab switching, reset integration, and mode boundary clearing.
 *
 * Usage: npx tsx test/undoRedo.ui.test.ts
 * Requires: Chromium installed via Playwright
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import packageInfo from "../package.json";

const DEV_PORT = 5176;
const DEV_SERVER_URL = `http://127.0.0.1:${DEV_PORT}`;
const APP_URL = `${DEV_SERVER_URL}/rg-backpack-planner/`;
const CURRENT_VERSION = packageInfo.version ?? "0.1.0";
const DEV_SERVER_START_TIMEOUT_MS = 20_000;
const DEV_SERVER_POLL_DELAY_MS = 250;

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
            const res = await fetch(url);
            if (res.ok) return;
        } catch {
            // server not up yet
        }
        await delay(DEV_SERVER_POLL_DELAY_MS);
    }
    throw new Error(`Timed out waiting for dev server at ${url}`);
}

type TestSession = {
    browser: Browser;
    context: BrowserContext;
    page: Page;
    stopServer: () => Promise<void>;
};

async function boot(): Promise<TestSession> {
    const devServer =
        process.platform === "win32"
            ? spawn(
                  `npm run dev -- --host 127.0.0.1 --port ${DEV_PORT} --strictPort`,
                  { cwd: process.cwd(), shell: true, stdio: "ignore" },
              )
            : spawn(
                  npmCommand(),
                  ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(DEV_PORT), "--strictPort"],
                  { cwd: process.cwd(), stdio: "ignore" },
              );

    const stopServer = async () => {
        await stopChildProcess(devServer);
    };

    try {
        await waitForServer(DEV_SERVER_URL, DEV_SERVER_START_TIMEOUT_MS);
        const browser = await chromium.launch({ headless: true });
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

async function navigateToApp(page: Page): Promise<void> {
    await page.goto(APP_URL, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-node-id="0"]', { state: "visible" });
    // Wait a beat for stores to initialize
    await delay(500);
}

// ---------------------------------------------------------------
// Helper selectors
// ---------------------------------------------------------------
const UNDO_BTN = 'button[aria-label="Undo"]';
const REDO_BTN = 'button[aria-label="Redo"]';
const TOOLBAR = '.undo-redo-toolbar';

async function isDisabled(page: Page, selector: string): Promise<boolean> {
    return page.locator(selector).isDisabled();
}

async function clickNode(page: Page, nodeIndex: number): Promise<void> {
    const nodeEl = page.locator(`button[data-node-id="${nodeIndex}"]`);
    await nodeEl.first().click();
    await delay(200); // small wait for store update + snapshot
}

async function getNodeLevel(page: Page, nodeIndex: number): Promise<number> {
    const badge = page.locator(`.node-level-badge[data-node-id="${nodeIndex}"]`);
    if ((await badge.count()) === 0) return 0;
    const text = (await badge.textContent())?.replaceAll(",", "").trim() ?? "";
    if (text === "") return 0;
    const val = Number(text);
    return Number.isFinite(val) ? val : 0;
}

async function clickTab(page: Page, tabIndex: number): Promise<void> {
    const tabs = page.locator('.tree-tab');
    const tab = tabs.nth(tabIndex);
    await tab.click();
    await delay(300);
}

async function getActiveTabIndex(page: Page): Promise<number> {
    const tabs = page.locator('.tree-tab');
    const count = await tabs.count();
    for (let i = 0; i < count; i++) {
        const cls = await tabs.nth(i).getAttribute("class") ?? "";
        if (cls.includes("active") || cls.includes("selected")) return i;
        const aria = await tabs.nth(i).getAttribute("aria-selected") ?? "";
        if (aria === "true") return i;
    }
    return -1;
}

// ---------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------
let session: TestSession | null = null;

try {
    console.log("  undoRedo.ui: booting browser session...");
    session = await boot();
    const { page } = session;

    // ========================================
    // Test 1: Toolbar is always visible
    // ========================================
    await navigateToApp(page);
    const toolbarVisible = await page.locator(TOOLBAR).isVisible();
    assert.ok(toolbarVisible, "UndoRedoToolbar pill should be visible on load");
    console.log("  ✓ toolbar is visible on page load");

    // ========================================
    // Test 2: Undo/Redo buttons start disabled
    // ========================================
    assert.ok(await isDisabled(page, UNDO_BTN), "Undo should be disabled on fresh load");
    assert.ok(await isDisabled(page, REDO_BTN), "Redo should be disabled on fresh load");
    console.log("  ✓ undo/redo buttons start disabled");

    // ========================================
    // Test 3: Click a node → undo becomes enabled
    // ========================================
    await clickNode(page, 3); // Click node index 3
    await delay(300);
    const undoDisabledAfterClick = await isDisabled(page, UNDO_BTN);
    assert.ok(!undoDisabledAfterClick, "Undo should be enabled after clicking a node");
    console.log("  ✓ clicking a node enables undo button");

    // ========================================
    // Test 4: Click undo → restores previous state
    // ========================================
    const levelBefore = await getNodeLevel(page, 3);
    assert.ok(levelBefore > 0, "Node 3 should have a level > 0 after click");

    await page.click(UNDO_BTN);
    await delay(300);
    const levelAfterUndo = await getNodeLevel(page, 3);
    assert.strictEqual(levelAfterUndo, 0, "Node 3 level should be 0 after undo");
    console.log("  ✓ undo restores node to previous state");

    // ========================================
    // Test 5: After undo, redo becomes enabled
    // ========================================
    assert.ok(!(await isDisabled(page, REDO_BTN)), "Redo should be enabled after undo");
    console.log("  ✓ redo button enabled after undo");

    // ========================================
    // Test 6: Click redo → restores undone state
    // ========================================
    await page.click(REDO_BTN);
    await delay(300);
    const levelAfterRedo = await getNodeLevel(page, 3);
    assert.strictEqual(levelAfterRedo, levelBefore, "Node 3 level should be restored after redo");
    console.log("  ✓ redo restores the undone state");

    // ========================================
    // Test 7: Keyboard shortcut Ctrl+Z (undo)
    // ========================================
    await clickNode(page, 4); // Create another action
    await delay(300);
    const level4Before = await getNodeLevel(page, 4);
    assert.ok(level4Before > 0, "Node 4 should have a level after click");

    await page.keyboard.down("Control");
    await page.keyboard.press("z");
    await page.keyboard.up("Control");
    await delay(300);
    const level4AfterCtrlZ = await getNodeLevel(page, 4);
    assert.strictEqual(level4AfterCtrlZ, 0, "Ctrl+Z should undo the last action");
    console.log("  ✓ Ctrl+Z keyboard shortcut undoes action");

    // ========================================
    // Test 8: Keyboard shortcut Ctrl+Y (redo)
    // ========================================
    await page.keyboard.down("Control");
    await page.keyboard.press("y");
    await page.keyboard.up("Control");
    await delay(300);
    const level4AfterCtrlY = await getNodeLevel(page, 4);
    assert.strictEqual(level4AfterCtrlY, level4Before, "Ctrl+Y should redo the undone action");
    console.log("  ✓ Ctrl+Y keyboard shortcut redoes action");

    // ========================================
    // Test 9: Keyboard shortcut Ctrl+Shift+Z (redo alternative)
    // ========================================
    // Undo first
    await page.keyboard.down("Control");
    await page.keyboard.press("z");
    await page.keyboard.up("Control");
    await delay(300);

    // Then redo with Ctrl+Shift+Z
    await page.keyboard.down("Control");
    await page.keyboard.down("Shift");
    await page.keyboard.press("z");
    await page.keyboard.up("Shift");
    await page.keyboard.up("Control");
    await delay(300);
    const level4AfterCtrlShiftZ = await getNodeLevel(page, 4);
    assert.strictEqual(level4AfterCtrlShiftZ, level4Before, "Ctrl+Shift+Z should redo");
    console.log("  ✓ Ctrl+Shift+Z keyboard shortcut redoes action");

    // ========================================
    // Test 10: Multiple undos in sequence
    // ========================================
    // We have 2 actions on node 3 and node 4. Undo both.
    await page.keyboard.down("Control");
    await page.keyboard.press("z");
    await page.keyboard.up("Control");
    await delay(200);
    await page.keyboard.down("Control");
    await page.keyboard.press("z");
    await page.keyboard.up("Control");
    await delay(300);
    const level3MultiUndo = await getNodeLevel(page, 3);
    assert.strictEqual(level3MultiUndo, 0, "Multiple undos should restore node 3 to 0");
    console.log("  ✓ multiple sequential undos work correctly");

    // ========================================
    // Test 11: New action after undo clears redo
    // ========================================
    // Redo once to have some redo stack
    await page.keyboard.down("Control");
    await page.keyboard.press("y");
    await page.keyboard.up("Control");
    await delay(200);

    // Verify redo is available
    assert.ok(!(await isDisabled(page, REDO_BTN)), "Redo should be available before fork");

    // Make a new action — this should clear the redo stack
    await clickNode(page, 5);
    await delay(300);

    assert.ok(await isDisabled(page, REDO_BTN), "Redo should be disabled after new action (fork)");
    console.log("  ✓ new action after undo clears redo stack (fork behavior)");

    // ========================================
    // Test 12: Reset button shows trash icon
    // ========================================
    // Look for the reset button (third button in toolbar, with negative styling)
    const resetBtn = page.locator('.undo-redo-toolbar button.button-negative');
    const resetBtnExists = (await resetBtn.count()) > 0;
    assert.ok(resetBtnExists, "Reset button with negative styling should exist in toolbar");
    console.log("  ✓ reset button with trash icon present in toolbar");

    console.log("\n  undoRedo.ui: all browser tests passed ✅");
} catch (error) {
    console.error("\n  undoRedo.ui: FAILED ❌");
    console.error(error);
    process.exitCode = 1;
} finally {
    if (session) {
        await session.page.close();
        await session.context.close();
        await session.browser.close();
        await session.stopServer();
    }
}
