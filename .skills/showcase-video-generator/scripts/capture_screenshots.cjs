const { chromium, devices } = require('playwright');
const path = require('path');

async function run() {
    console.log('Starting Playwright (Mobile-First Focus)...');

    // Use iPhone 14 / Pro Max resolution as a standard popular mobile size
    const mobileDevice = devices['iPhone 14 Pro Max'];
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        ...mobileDevice,
        viewport: { width: 393, height: 852 } // standard iPhone 14 Pro resolution
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
            await page.waitForSelector(selector, { timeout: 5000 });
            const success = await page.evaluate((t, s) => {
                const elements = Array.from(document.querySelectorAll(s));
                const target = elements.find(el => {
                    const content = el.textContent.trim().toLowerCase();
                    return content.includes(t.toLowerCase());
                });
                if (target) {
                    target.click();
                    return true;
                }
                return false;
            }, text, selector);

            if (!success) throw new Error(`Not found by evaluate search`);
            console.log(`Clicked "${text}"`);
        } catch (e) {
            console.log(`[FAILED] clickByText("${text}"): ${e.message}`);
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
        console.log('Opening Settings Menu...');
        await page.click('.menu-button', { timeout: 3000 });
        await page.waitForTimeout(1000);
        await clickByText('Settings');
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
