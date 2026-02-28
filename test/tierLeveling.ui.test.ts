import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import packageInfo from "../package.json";
import {
    chromium,
    type Browser,
    type BrowserContext,
    type Page,
} from "playwright";
import { tierSweepCases } from "./tierLeveling.shared.ts";

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

const firstCase = tierSweepCases[0];
const session = await bootTierUiSession();
const { browser, page, stopServer } = session;

try {
    console.log(`Tier UI stub: ${firstCase?.name ?? "missing case"}`);
    await page.goto(APP_URL);
    await ensureTierUiReady(page);
} finally {
    await browser?.close();
    await stopServer?.();
}
