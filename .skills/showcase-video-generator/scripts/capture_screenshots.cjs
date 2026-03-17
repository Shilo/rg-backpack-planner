const { chromium, devices } = require('playwright');
const path = require('path');

async function run() {
    console.log('Starting Playwright (Dual-Frame Capture)...');

    const mobileDevice = devices['iPhone 14 Pro Max'];
    const browser = await chromium.launch({ headless: true });

    let mPage;

    const shot = async (name, p_page) => {
        const p = path.join(__dirname, '..', '..', '..', 'showcase-video', 'public', name);
        await p_page.screenshot({ path: p });
        console.log(`[SUCCESS] Saved ${name}`);
    };

    const urlBase = 'http://localhost:5173/#';
    const hashes = {
        late_pve: ",k'7.a.a.1,k.k..k.k.'2.a:3;;;9W7",
        late_pvp: "k'4..k.k..a,k'7.a.a.1;k..k.'2.k.k..a,k'7.a.a.1;k'4..k.k..a,k'7.a.a.1;aox",
    };

    try {
        // ── CONTEXT 1: Onboarding suppressed ──
        console.log(`--- CONTEXT 1: Mobile (Onboarding Suppressed) ---`);
        const mobileContext = await browser.newContext({
            ...mobileDevice,
            viewport: { width: 393, height: 852 },
            deviceScaleFactor: 3
        });
        await mobileContext.addInitScript(() => {
            localStorage.setItem('rg-backpack-planner-onboarding-seen', 'true');
        });
        mPage = await mobileContext.newPage();

        // Slide 1 Left: Late PvE
        console.log('Capturing Late PvE (Slide 1 Left)...');
        await mPage.goto(`${urlBase}${hashes.late_pve}`, { waitUntil: 'networkidle' });
        await mPage.waitForTimeout(3000);
        await shot('mobile_late_pve.png', mPage);

        // Slide 1 Right: Late PvP with NodeContentMenu on node 7
        console.log('Capturing Late PvP with NodeContentMenu on node 7 (Slide 1 Right)...');
        await mPage.goto(`${urlBase}${hashes.late_pvp}`, { waitUntil: 'networkidle' });
        await mPage.waitForTimeout(3000);
        await mPage.locator('button[data-node-id="7"]').click({ button: 'right' });
        await mPage.waitForSelector('.context-menu', { state: 'visible', timeout: 5000 });
        await mPage.waitForTimeout(500);
        // Click +Tier button in the context menu before capturing
        console.log('Clicking +Tier button in context menu...');
        await mPage.locator('.context-menu button.node-ctx-btn.positive').nth(2).click();
        await mPage.waitForTimeout(1000);
        await shot('mobile_late_pvp_context.png', mPage);

        // Slide 3 Left: Statistics page
        console.log('Capturing Statistics (Slide 3 Left)...');
        await mPage.goto(`${urlBase}${hashes.late_pve}`, { waitUntil: 'networkidle' });
        await mPage.waitForTimeout(3000);
        await mPage.click('.menu-button', { timeout: 10000 });
        await mPage.waitForSelector('.side-menu.open', { timeout: 10000 });
        console.log('Switching to Statistics tab (Index 0)...');
        await mPage.locator('.tab-bar__tab-button').nth(0).click({ timeout: 5000 });
        await mPage.waitForTimeout(1000);
        await shot('mobile_stats.png', mPage);

        // Slide 3 Right: Compose Screenshot stats tab
        console.log('Capturing Compose Screenshot stats tab (Slide 3 Right)...');
        // Close side menu via Escape
        await mPage.keyboard.press('Escape');
        await mPage.waitForTimeout(500);
        // Open ComposeScreenshot via F9
        await mPage.keyboard.press('F9');
        await mPage.waitForSelector('.fullscreen-modal', { state: 'visible', timeout: 10000 });
        await mPage.waitForTimeout(1000);
        // Switch to stats tab (index 1)
        console.log('Switching to stats tab in Compose Screenshot...');
        await mPage.locator('.fullscreen-modal .tab-bar__tab-button').nth(1).click({ timeout: 5000 });
        await mPage.waitForTimeout(2000);
        await shot('mobile_compose_stats.png', mPage);
        // Close compose
        await mPage.keyboard.press('Escape');
        await mPage.waitForTimeout(500);

        // Slide 4 Left: Settings (Clone sequence)
        console.log('Capturing Settings (Slide 4 Left - Clone Sequence)...');
        await mPage.goto(`${urlBase}${hashes.late_pvp}`, { waitUntil: 'networkidle' });
        await mPage.waitForTimeout(5000);
        await mPage.click('.menu-button', { timeout: 10000 });
        await mPage.waitForSelector('.side-menu.open', { timeout: 10000 });
        console.log('Switching to Settings tab (Index 1)...');
        await mPage.locator('.tab-bar__tab-button').nth(1).click({ timeout: 5000 });
        await mPage.waitForTimeout(2000);
        console.log('Clicking Clone button...');
        const cloneButton = mPage.locator('.side-menu button').filter({ hasText: /clone/i }).first();
        await cloneButton.click({ timeout: 10000 });
        console.log('Waiting for modal confirmation...');
        const confirmButton = mPage.locator('button[data-modal-confirm]');
        await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
        await confirmButton.click();
        console.log('Waiting for reload and navigation...');
        try {
            await mPage.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 });
        } catch (e) {
            console.log('Navigation wait timeout (continuing anyway):', e.message);
        }
        await mPage.waitForTimeout(3000);
        console.log('Re-opening menu for settings screenshot...');
        await mPage.click('.menu-button', { timeout: 10000 });
        await mPage.waitForSelector('.side-menu.open', { timeout: 10000 });
        await mPage.locator('.tab-bar__tab-button').nth(1).click({ timeout: 5000 });
        await mPage.waitForTimeout(1000);
        await shot('mobile_settings.png', mPage);

        // Slide 4 Right: General Settings
        console.log('Capturing General Settings (Slide 4 Right)...');
        await mPage.locator('[data-page="general"]').click({ timeout: 5000 });
        await mPage.waitForTimeout(1000);
        await shot('mobile_general_settings.png', mPage);

        await mobileContext.close();

        // ── CONTEXT 2: Onboarding enabled ──
        console.log(`--- CONTEXT 2: Mobile (Onboarding Enabled) ---`);
        const onboardingContext = await browser.newContext({
            ...mobileDevice,
            viewport: { width: 393, height: 852 },
            deviceScaleFactor: 3
        });
        await onboardingContext.addInitScript(() => {
            localStorage.setItem('rg-backpack-planner-onboarding-seen', 'false');
        });
        const oPage = await onboardingContext.newPage();

        // Slide 2 Left: Onboarding Step 1
        console.log('Capturing Onboarding Step 1 (Slide 2 Left)...');
        await oPage.goto(`${urlBase}${hashes.late_pvp}`, { waitUntil: 'networkidle' });
        await oPage.waitForSelector('.onboarding-overlay', { state: 'visible', timeout: 10000 });
        await oPage.waitForTimeout(2000);
        await shot('mobile_onboarding_step1.png', oPage);

        // Slide 2 Right: Onboarding Step 2
        console.log('Advancing to Onboarding Step 2 (Slide 2 Right)...');
        await oPage.click('button[aria-label="Next step"]', { timeout: 5000 });
        await oPage.waitForTimeout(1500);
        await shot('mobile_onboarding_step2.png', oPage);

        await onboardingContext.close();

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
