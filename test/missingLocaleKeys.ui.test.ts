// Server: Vite dev server on port 5175.
// Cycles through every locale, opening all lazy-loaded components in each,
// then reports any missing translation keys detected by svelte-whisper.
//
// Lazy-loaded component map:
//   SideMenu          → SideMenuSettingsPage, SideMenuStatisticsPage, SideMenuControlsPage
//   SideMenuSettingsPage → RootSettingsPage, NodeSettingsPage, AppearanceSettingsPage,
//                          GeneralSettingsPage, AboutSettingsPage
//   AboutSettingsPage → DebugInfoSection (via advanced/system info accordion)
//   ComposeScreenshot → ComposeScreenshotContent
//
// Missing keys are captured via page.on('console') matching svelte-whisper's
// console.warn format: `svelte-whisper: Missing "key" for locale "locale"`
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

const DEV_PORT = 5175;
const DEV_SERVER_URL = `http://127.0.0.1:${DEV_PORT}`;
const APP_URL = `${DEV_SERVER_URL}/rg-backpack-planner/`;
const DEV_SERVER_START_TIMEOUT_MS = 20_000;
const DEV_SERVER_POLL_DELAY_MS = 250;
const CURRENT_VERSION = packageInfo.version ?? "0.1.0";
const DEVTOOLS_HIDE_STYLE_ID = "rgbp-hide-svelte-whisper-devtools";
const DEVTOOLS_HIDE_STYLE_TEXT =
    "#svelte-whisper-devtools { display: none !important; }";
const LOCALES = ["en", "ja", "zh", "fr"];
const LOG_FILE_LABEL = "test/missingLocaleKeys.ui.output.log";
const LOG_FILE_URL = new URL(
    "./missingLocaleKeys.ui.output.log",
    import.meta.url,
);
const LOG_FILE_PATH = fileURLToPath(LOG_FILE_URL);

type MissingKey = { locale: string; key: string };

type UiSession = {
    browser: Browser;
    context: BrowserContext;
    page: Page;
    stopServer: () => Promise<void>;
};

// ── Helpers ─────────────────────────────────────────────────────────────

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

async function bootSession(): Promise<UiSession> {
    const devServer =
        process.platform === "win32"
            ? spawn(
                  `npm run dev -- --host 127.0.0.1 --port ${DEV_PORT} --strictPort`,
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
                      String(DEV_PORT),
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

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();

        await context.addInitScript((version: string) => {
            localStorage.setItem(
                "rg-backpack-planner-latest-used-version",
                version,
            );
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

function resetLogFile() {
    writeFileSync(LOG_FILE_URL, "", "utf8");
}

function log(line = "") {
    console.log(line);
    appendFileSync(LOG_FILE_URL, `${line}\n`, "utf8");
}

// ── Missing key capture ─────────────────────────────────────────────────

const MISSING_KEY_REGEX =
    /^svelte-whisper: Missing "(.+)" for locale "(.+)"$/;

function parseMissingKeyWarning(text: string): MissingKey | null {
    const match = text.match(MISSING_KEY_REGEX);
    if (!match) return null;
    return { key: match[1], locale: match[2] };
}

// ── UI interaction helpers ──────────────────────────────────────────────

async function waitForAppReady(page: Page): Promise<void> {
    await page.waitForSelector('[data-node-id="0"]', { state: "visible" });
}

async function installOverlayHideStyle(page: Page): Promise<void> {
    await page.evaluate(
        ({
            hideStyleId,
            hideStyleText,
        }: {
            hideStyleId: string;
            hideStyleText: string;
        }) => {
            let style = document.getElementById(hideStyleId) as
                | HTMLStyleElement
                | null;
            if (!style) {
                style = document.createElement("style");
                style.id = hideStyleId;
                document.head.appendChild(style);
            }

            style.textContent = hideStyleText;
        },
        {
            hideStyleId: DEVTOOLS_HIDE_STYLE_ID,
            hideStyleText: DEVTOOLS_HIDE_STYLE_TEXT,
        },
    );
}

async function assertOverlayHideStyleInstalled(page: Page): Promise<void> {
    const overlayInfo = await page.evaluate((hideStyleId: string) => {
        const existingHost = document.getElementById("svelte-whisper-devtools");
        const host = existingHost ?? document.createElement("div");

        host.id = "svelte-whisper-devtools";
        if (!existingHost) {
            document.body.appendChild(host);
        }

        const display = getComputedStyle(host).display;
        if (!existingHost) {
            host.remove();
        }

        return {
            display,
            existingHost: !!existingHost,
            styleExists: !!document.getElementById(hideStyleId),
            headHasStyle: !!document.head?.querySelector(`#${hideStyleId}`),
        };
    }, DEVTOOLS_HIDE_STYLE_ID);

    assert.strictEqual(
        overlayInfo.display,
        "none",
        `Expected init script to hide the svelte-whisper overlay on app navigations (${JSON.stringify(overlayInfo)})`,
    );
}

async function switchLocale(page: Page, locale: string): Promise<void> {
    // Set locale in localStorage and reload so svelte-whisper picks it up
    // on init. Reload also resets the internal missingKeys Set, ensuring
    // each locale's warnings fire fresh.
    await page.evaluate(
        (loc: string) =>
            localStorage.setItem("rg-backpack-planner-locale", loc),
        locale,
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await installOverlayHideStyle(page);
    await waitForAppReady(page);
    await assertOverlayHideStyleInstalled(page);
    await delay(300);
}

async function openSideMenu(page: Page): Promise<void> {
    const menuBtn = page.locator(".menu-button");
    await menuBtn.click();
    await page.waitForSelector(".side-menu.open", { state: "visible" });
    await delay(200);
}

async function closeSideMenu(page: Page): Promise<void> {
    const backdrop = page.locator(".menu-backdrop");
    if ((await backdrop.count()) > 0) {
        await backdrop.click();
        await delay(200);
    }
}

async function clickSideMenuTab(page: Page, tabLabel: string): Promise<void> {
    // Bottom nav bar tab buttons inside .side-menu
    const tab = page.locator(
        `.side-menu .tab-bar__tab-button:has-text("${tabLabel}")`,
    );
    if ((await tab.count()) > 0) {
        await tab.click();
        await delay(300);
    }
}

async function clickSideMenuTabByIndex(
    page: Page,
    index: number,
): Promise<void> {
    const tabs = page.locator(
        ".side-menu .bottom-nav-bar .tab-bar__tab-button",
    );
    const count = await tabs.count();
    if (index < count) {
        await tabs.nth(index).click();
        await delay(300);
    }
}

async function navigateToSettingsPage(
    page: Page,
    pageId: string,
): Promise<void> {
    const navBtn = page.locator(`[data-page="${pageId}"]`);
    if ((await navBtn.count()) > 0) {
        await navBtn.click();
        await delay(300);
    }
}

async function goBackInSettings(page: Page): Promise<void> {
    const backBtn = page.locator(
        ".settings-page-container .settings-page__back-button",
    );
    if ((await backBtn.count()) > 0) {
        await backBtn.first().click();
        await delay(300);
    }
}

async function openAdvancedSection(page: Page): Promise<void> {
    // The advanced accordion in AboutSettingsPage uses the system information title
    const accordion = page.locator(".accordion-trigger").last();
    if ((await accordion.count()) > 0) {
        await accordion.click();
        await delay(500);
    }
}

async function openComposeScreenshot(page: Page): Promise<void> {
    await page.keyboard.press("F9");
    await page
        .waitForSelector(".fullscreen-modal", {
            state: "visible",
            timeout: 10_000,
        })
        .catch(() => {});
    await delay(500);
}

async function closeComposeScreenshot(page: Page): Promise<void> {
    const closeBtn = page.locator(
        ".fullscreen-modal .fullscreen-modal__close-btn",
    );
    if ((await closeBtn.count()) > 0) {
        await closeBtn.click();
        await delay(300);
    } else {
        await page.keyboard.press("Escape");
        await delay(300);
    }
}

// ── Load all lazy components ────────────────────────────────────────────

async function loadAllLazyComponents(page: Page): Promise<void> {
    // 1. Open side menu — statistics tab (index 0, lazy: SideMenuStatisticsPage)
    await openSideMenu(page);
    await clickSideMenuTabByIndex(page, 0);
    await delay(300);

    // 2. Switch to controls tab (index 2, lazy: SideMenuControlsPage)
    await clickSideMenuTabByIndex(page, 2);
    await delay(300);

    // 3. Switch to settings tab (index 1, lazy: SideMenuSettingsPage → RootSettingsPage)
    await clickSideMenuTabByIndex(page, 1);
    await delay(300);

    // 4. Navigate to each settings sub-page
    // General (lazy: GeneralSettingsPage)
    await navigateToSettingsPage(page, "general");
    await goBackInSettings(page);

    // Appearance (lazy: AppearanceSettingsPage)
    await navigateToSettingsPage(page, "appearance");
    await goBackInSettings(page);

    // Node (lazy: NodeSettingsPage)
    await navigateToSettingsPage(page, "node");
    await goBackInSettings(page);

    // About (lazy: AboutSettingsPage)
    await navigateToSettingsPage(page, "about");
    // Open advanced/system information section (lazy: DebugInfoSection)
    await openAdvancedSection(page);
    await delay(500);
    await goBackInSettings(page);

    // 5. Close side menu
    await closeSideMenu(page);

    // 6. Open compose screenshot (lazy: ComposeScreenshotContent)
    await openComposeScreenshot(page);
    await closeComposeScreenshot(page);
}

// ── Main ────────────────────────────────────────────────────────────────

resetLogFile();
log(`Missing Locale Keys Test`);
log(`========================`);
log(`Locales: ${LOCALES.join(", ")}`);
log();

let session: UiSession | null = null;

try {
    session = await bootSession();
    const { page, browser, stopServer } = session;

    // Collect missing keys from console.warn
    const missingKeys: MissingKey[] = [];
    const seenKeys = new Set<string>();

    page.on("console", (msg) => {
        if (msg.type() !== "warning") return;
        const parsed = parseMissingKeyWarning(msg.text());
        if (!parsed) return;
        const id = `${parsed.locale}\0${parsed.key}`;
        if (seenKeys.has(id)) return;
        seenKeys.add(id);
        missingKeys.push(parsed);
    });

    // Navigate to the app
    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
    await installOverlayHideStyle(page);
    await waitForAppReady(page);
    await assertOverlayHideStyleInstalled(page);
    log("App loaded.\n");

    for (const locale of LOCALES) {
        log(`── Locale: ${locale} ──`);

        // Switch locale (reloads the page)
        await switchLocale(page, locale);
        log(`  Switched to ${locale}`);

        // Load all lazy components to trigger all $t() calls
        await loadAllLazyComponents(page);
        log(`  All lazy components loaded`);

        // Let any remaining reactive updates settle
        await delay(300);
        log();
    }

    // ── Report ──────────────────────────────────────────────────────────

    log(`\n══ Results ══`);
    log(`Total missing keys: ${missingKeys.length}`);

    if (missingKeys.length > 0) {
        // Group by locale
        const byLocale = new Map<string, string[]>();
        for (const { locale, key } of missingKeys) {
            let keys = byLocale.get(locale);
            if (!keys) {
                keys = [];
                byLocale.set(locale, keys);
            }
            keys.push(key);
        }

        for (const [locale, keys] of byLocale) {
            log(`\n  [${locale}] ${keys.length} missing key(s):`);
            for (const key of keys.sort()) {
                log(`    - ${key}`);
            }
        }
    }
    log();

    await browser.close();
    await stopServer();

    if (missingKeys.length > 0) {
        log(`FAIL: ${missingKeys.length} missing translation key(s) found.`);
        log(`See ${LOG_FILE_LABEL} for details.`);
        process.exit(1);
    }

    log("PASS: No missing translation keys.");
} catch (error) {
    log(`\nFATAL: ${error}`);
    if (session) {
        await session.browser.close().catch(() => {});
        await session.stopServer().catch(() => {});
    }
    process.exit(1);
}
