/**
 * Visual color review script — captures screenshots of the tree across
 * multiple theme presets and dark/light modes for manual evaluation.
 *
 * Reuses a running preview server on port 4173 if available,
 * otherwise starts one (requires dist/ to exist — run npm run build first).
 *
 * Usage: npx tsx test/colorVisualReview.ui.ts
 */
import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, type Browser } from "playwright";
import packageInfo from "../package.json";

const PORT = 4173;
const DEV_SERVER_URL = `http://127.0.0.1:${PORT}`;
const APP_URL = `${DEV_SERVER_URL}/rg-backpack-planner/`;
const OUT_DIR = "test/output/color-review";
const VERSION_KEY = "rg-backpack-planner-latest-used-version";
const THEME_KEY = "rg-backpack-planner-theme-color";
const DARK_KEY = "rg-backpack-planner-dark-mode";

const PRESETS = [
    { name: "sky",     h: 234, c: 0.18 },
    { name: "cyan",    h: 198, c: 0.14 },
    { name: "rose",    h: 350, c: 0.26 },
    { name: "amber",   h: 55,  c: 0.24 },
    { name: "neutral", h: 260, c: 0.02 },
];

async function isServerRunning(): Promise<boolean> {
    try {
        const r = await fetch(APP_URL);
        return r.ok;
    } catch {
        return false;
    }
}

async function waitForServer(timeoutMs = 30_000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await isServerRunning()) return;
        await delay(300);
    }
    throw new Error(`Timed out waiting for preview server at ${APP_URL}`);
}

async function stopChildProcess(child: ReturnType<typeof spawn>): Promise<void> {
    if (child.exitCode !== null) return;
    child.kill();
    await Promise.race([once(child, "exit"), delay(3_000)]);
    if (child.exitCode === null && child.pid) {
        try {
            const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
            await once(killer, "exit");
        } catch { /* best effort */ }
    }
}

async function run() {
    mkdirSync(OUT_DIR, { recursive: true });

    const serverAlreadyRunning = await isServerRunning();
    let previewServer: ReturnType<typeof spawn> | null = null;

    if (!serverAlreadyRunning) {
        console.log("Starting preview server...");
        previewServer = spawn(
            "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
            { cwd: process.cwd(), shell: true, stdio: "ignore" },
        );
        await waitForServer();
    } else {
        console.log("Using existing preview server on port 4173");
    }

    let browser: Browser | undefined;
    try {
        // Match the pattern used by existing captureScreenshot.ui.test.ts
        browser = await chromium.launch({ headless: false });

        for (const dark of [true, false]) {
            const modeLabel = dark ? "dark" : "light";

            for (const preset of PRESETS) {
                console.log(`Capturing: ${preset.name} / ${modeLabel}`);

                for (const viewport of [
                    { label: "desktop", width: 1280, height: 800 },
                    { label: "mobile",  width: 390,  height: 844 },
                ]) {
                    const context = await browser.newContext({
                        viewport: { width: viewport.width, height: viewport.height },
                    });

                    // Pre-set localStorage before the first page load
                    await context.addInitScript(({ themeKey, darkKey, versionKey, theme, dark, version }: {
                        themeKey: string; darkKey: string; versionKey: string;
                        theme: { h: number; c: number }; dark: boolean; version: string;
                    }) => {
                        localStorage.setItem(themeKey, JSON.stringify(theme));
                        localStorage.setItem(darkKey, dark ? "true" : "false");
                        localStorage.setItem(versionKey, version);
                        // Suppress touch action prompt
                        localStorage.setItem("rg-backpack-planner-node-touch-action", "0");
                    }, {
                        themeKey: THEME_KEY,
                        darkKey: DARK_KEY,
                        versionKey: VERSION_KEY,
                        theme: { h: preset.h, c: preset.c },
                        dark,
                        version: packageInfo.version ?? "0.4.8",
                    });

                    const page = await context.newPage();

                    await page.goto(APP_URL);
                    await page.waitForSelector('[data-node-id="0"]', {
                        state: "visible",
                        timeout: 15_000,
                    });
                    // Let theme and layout fully settle
                    await delay(600);

                    // Children unlock at tierUpper(1, maxLevel=100) = level 20.
                    // Strategy:
                    //   region-top-left root    → level 20 via fast JS dispatch (active, children become available)
                    //   region-bottom-left root → level 20 via fast JS dispatch (active, children become available)
                    //   region-right root       → left untouched (stays available)
                    // Result: locked / available / active all visible in one shot.
                    // Level the top-left and bottom-left region roots to 20 via Playwright clicks.
                    // Capture node IDs first so the selector stays stable as state changes.
                    const REGIONS = ["region-top-left", "region-bottom-left", "region-right"] as const;
                    for (const regionClass of REGIONS) {
                        const nodeId = await page
                            .locator(`.button.node.${regionClass}`)
                            .first()
                            .getAttribute("data-node-id");
                        if (nodeId) {
                            const loc = page.locator(`.button.node[data-node-id="${nodeId}"]`);
                            for (let i = 0; i < 20; i++) {
                                await loc.click();
                            }
                        }
                    }
                    // Children of all 3 leveled roots are now "available"

                    // Debug: count states for verification
                    const stateCounts = await page.evaluate(() => ({
                        locked:    document.querySelectorAll(".button.node.locked").length,
                        available: document.querySelectorAll(".button.node.available").length,
                        active:    document.querySelectorAll(".button.node.active").length,
                        maxed:     document.querySelectorAll(".button.node.maxed").length,
                    }));
                    console.log(`  states: ${JSON.stringify(stateCounts)}`);
                    await delay(300);

                    await page.screenshot({
                        path: `${OUT_DIR}/${preset.name}-${modeLabel}-${viewport.label}.png`,
                    });

                    await context.close();
                }
            }
        }

        console.log(`\nDone! Screenshots saved to ${OUT_DIR}/`);
    } finally {
        await browser?.close();
        if (previewServer) await stopChildProcess(previewServer);
    }
}

run().catch((e) => { console.error(e); process.exit(1); });
