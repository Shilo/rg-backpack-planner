const { chromium, devices } = require('playwright');
const path = require('path');

async function run() {
    console.log('Starting Playwright (Mobile-First Focus)...');

    const mobileDevice = devices['iPhone 14 Pro Max'];
    const browser = await chromium.launch({ headless: true });

    let mPage;
    let desktopContext;

    const shot = async (name, p_page) => {
        const p = path.join(__dirname, '..', '..', '..', 'showcase-video', 'public', name);
        await p_page.screenshot({ path: p });
        console.log(`[SUCCESS] Saved ${name}`);
    };

    const urlBase = 'http://localhost:5173/#';
    const hashes = {
        late_pve: ",k'7.a.a.1,k.k..k.k.'2.a:3;;;9W7",
        late_pvp: "k'4..k.k..a,k'7.a.a.1;k..k.'2.k.k..a,k'7.a.a.1;k'4..k.k..a,k'7.a.a.1;aox",
        mid_pve: ",k..k.'2.k.k..a:3;;;37W",
        full_tier: "1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1"
    };

    try {
        console.log(`--- CAPTURING MOBILE ---`);
        const mobileContext = await browser.newContext({
            ...mobileDevice,
            viewport: { width: 393, height: 852 },
            deviceScaleFactor: 3
        });
        mPage = await mobileContext.newPage();

        console.log(`Navigating to Late PvE (Mobile)...`);
        await mPage.goto(`${urlBase}${hashes.late_pve}`, { waitUntil: 'networkidle' });
        await mPage.waitForTimeout(3000);
        await shot('mobile_late_pve.png', mPage);

        console.log(`Navigating to Mid-Game PvE (Mobile)...`);
        await mPage.goto(`${urlBase}${hashes.mid_pve}`, { waitUntil: 'networkidle' });
        await mPage.waitForTimeout(3000);
        await shot('mobile_mid_pve.png', mPage);

        console.log(`Capturing Statistics for Late PvE (Mobile)...`);
        await mPage.goto(`${urlBase}${hashes.late_pve}`, { waitUntil: 'networkidle' });
        await mPage.waitForTimeout(3000);
        await mPage.click('.menu-button', { timeout: 10000 });
        await mPage.waitForSelector('.side-menu.open', { timeout: 10000 });

        console.log('Switching to Statistics tab (Index 0)...');
        await mPage.locator('.tab-bar__tab-button').nth(0).click({ timeout: 5000 });
        await mPage.waitForTimeout(1000);
        await shot('mobile_stats.png', mPage);

        console.log(`Capturing Settings for Outro (Mobile - Authentic Clone Sequence)...`);
        // Navigate to Late PvP
        await mPage.goto(`${urlBase}${hashes.late_pvp}`, { waitUntil: 'networkidle' });
        await mPage.waitForTimeout(5000);

        // Open menu
        await mPage.click('.menu-button', { timeout: 10000 });
        await mPage.waitForSelector('.side-menu.open', { timeout: 10000 });

        // Switch to Settings tab (Index 1)
        console.log('Switching to Settings tab (Index 1)...');
        await mPage.locator('.tab-bar__tab-button').nth(1).click({ timeout: 5000 });
        await mPage.waitForTimeout(2000);

        // Find and click "Clone" button (case-insensitive)
        console.log('Clicking Clone button...');
        const cloneButton = mPage.locator('.side-menu button').filter({ hasText: /clone/i }).first();
        await cloneButton.click({ timeout: 10000 });

        // Wait for modal and confirm
        console.log('Waiting for modal confirmation...');
        const confirmButton = mPage.locator('button[data-modal-confirm]');
        await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
        await confirmButton.click();

        // Wait for reload (URL will change to base # without the share data)
        console.log('Waiting for reload and navigation...');
        try {
            await mPage.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 });
        } catch (e) {
            console.log('Navigation wait timeout (continuing anyway):', e.message);
        }
        await mPage.waitForTimeout(3000);

        // Re-open menu to take the final clean screenshot
        console.log('Re-opening menu for final clean screenshot...');
        await mPage.click('.menu-button', { timeout: 10000 });
        await mPage.waitForSelector('.side-menu.open', { timeout: 10000 });

        // Ensure we are on Settings tab (Index 1) - persisting from last session hopefully, but double check
        await mPage.locator('.tab-bar__tab-button').nth(1).click({ timeout: 5000 });
        await mPage.waitForTimeout(1000);

        await shot('mobile_settings.png', mPage);

        await mobileContext.close();

        console.log(`--- CAPTURING DESKTOP ---`);
        desktopContext = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            deviceScaleFactor: 2
        });
        const dPage = await desktopContext.newPage();

        console.log(`Navigating to Late PvP (Desktop)...`);
        await dPage.goto(`${urlBase}${hashes.late_pvp}`, { waitUntil: 'networkidle' });
        await dPage.waitForTimeout(3000);
        await shot('desktop_late_pvp.png', dPage);

        await desktopContext.close();

    } catch (e) {
        console.error('Fatal error during capture:', e);
        if (mPage) {
            const errorPath = path.join(__dirname, '..', '..', '..', 'showcase-video', 'public', 'mobile_error_debug.png');
            await mPage.screenshot({ path: errorPath });
            console.log(`Saved error diagnostic to mobile_error_debug.png`);
        }
    } finally {
        await browser.close();
    }
}

run();
