const { chromium } = require('playwright');
const path = require('path');

async function run() {
    console.log('Starting Playwright (High-Level Focus)...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    const shot = async (name) => {
        const p = path.join(__dirname, '..', '..', '..', 'showcase-video', 'public', name);
        await page.screenshot({ path: p });
        console.log(`[SUCCESS] Saved ${name}`);
    };

    try {
        // Late PvE build from package.json: |,k'7.a.a.1,k.k..k.k.'2.a:3;;;9W7
        const latePveHash = ",k'7.a.a.1,k.k..k.k.'2.a:3;;;9W7";
        const url = `http://localhost:5173/#${latePveHash}`;

        console.log(`Navigating to Late PvE build: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        console.log('Navigation complete. Waiting for hydration...');
        await page.waitForTimeout(5000);

        // 1. Capture the main build showcase
        await shot('late_pve.png');

        // 2. Capture the sharing UI (High-Level Feature)
        console.log('Opening Share UI...');
        // Look for the share button in the HUD or side menu
        const shareBtn = await page.$('button[aria-label*="share"]');
        if (shareBtn) {
            await shareBtn.click();
            await page.waitForTimeout(1000);
            await shot('share_ui.png');
        } else {
            console.log('Share button not found in HUD, checking general UI...');
            await shot('app_main_view.png');
        }

    } catch (e) {
        console.error('Fatal error during capture:', e);
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
}

run();
