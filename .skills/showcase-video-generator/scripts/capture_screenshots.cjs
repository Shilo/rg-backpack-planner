const { chromium, devices } = require('playwright');
const path = require('path');

async function run() {
    console.log('Starting Playwright (Mobile-First Focus)...');

    // Use iPhone 14 / Pro Max resolution as a standard popular mobile size
    const mobileDevice = devices['iPhone 14 Pro Max'];
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        ...mobileDevice,
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3
    });
    const page = await context.newPage();

    const shot = async (name) => {
        const p = path.join(__dirname, '..', '..', '..', 'showcase-video', 'public', name);
        await page.screenshot({ path: p });
        console.log(`[SUCCESS] Saved ${name}`);
    };

    const clickByText = async (text, selector = 'button') => {
        console.log(`Attempting to click "${text}"...`);
        try {
            const locator = page.locator(selector).filter({ hasText: new RegExp(`^${text}$`, 'i') }).first();
            // If exact match doesn't work, try partial
            const count = await locator.count();
            if (count === 0) {
                console.log(`Exact match for "${text}" not found, trying partial...`);
                await page.locator(selector).filter({ hasText: new RegExp(text, 'i') }).first().click({ timeout: 10000 });
            } else {
                await locator.click({ timeout: 10000 });
            }
            console.log(`Clicked "${text}"`);
        } catch (e) {
            console.log(`[FAILED] clickByText("${text}"): ${e.message}`);
            await page.screenshot({ path: path.join(__dirname, '..', '..', '..', 'showcase-video', 'public', 'debug_fail.png') });
            throw e;
        }
    };

    try {
        // Late PvE build from package.json: |,k'7.a.a.1,k.k..k.k.'2.a:3;;;9W7
        const latePveHash = ",k'7.a.a.1,k.k..k.k.'2.a:3;;;9W7";
        const midBuildHash = ",k'3.a.a.1.1.1,k.k..k.k.'2.a:3;;;9W7"; // Hypothetical mid-build hash
        const urlBase = 'http://localhost:5173/#';

        // 1. Capture Late PvE (Initial)
        console.log(`Navigating to Late PvE build...`);
        await page.goto(`${urlBase}${latePveHash}`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(5000);
        await shot('mobile_late_pve.png');

        // 2. Capture Mid-Game Build
        console.log(`Navigating to Mid-Game build...`);
        await page.goto(`${urlBase}${midBuildHash}`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(5000);
        await shot('mobile_mid_build.png');

        // 3. Capture Settings Menu
        console.log('Opening Side Menu...');
        await page.click('.menu-button', { timeout: 5000 });
        await page.waitForSelector('.side-menu.open', { timeout: 5000 });

        console.log('Switching to Settings Tab...');
        await clickByText('Settings', '.tab-bar__tab-button');
        await page.waitForTimeout(1000);
        await shot('mobile_settings.png');

    } catch (e) {
        console.error('Fatal error during capture:', e);
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
}

run();
