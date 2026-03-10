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

    const shot = async (name, p_page = page) => {
        const p = path.join(__dirname, '..', '..', '..', 'showcase-video', 'public', name);
        await p_page.screenshot({ path: p });
        console.log(`[SUCCESS] Saved ${name}`);
    };

    const clickByText = async (targetPage, text, selector = 'button') => {
        console.log(`Attempting to click "${text}"...`);
        try {
            const locator = targetPage.locator(selector).filter({ hasText: new RegExp(`^${text}$`, 'i') }).first();
            const count = await locator.count();
            if (count === 0) {
                console.log(`Exact match for "${text}" not found, trying partial...`);
                await targetPage.locator(selector).filter({ hasText: new RegExp(text, 'i') }).first().click({ timeout: 10000 });
            } else {
                await locator.click({ timeout: 10000 });
            }
            console.log(`Clicked "${text}"`);
        } catch (e) {
            console.log(`[FAILED] clickByText("${text}"): ${e.message}`);
            await targetPage.screenshot({ path: path.join(__dirname, '..', '..', '..', 'showcase-video', 'public', 'debug_fail.png') });
            throw e;
        }
    };

    const urlBase = 'http://localhost:5173/#';
    const hashes = {
        late_pve: ",k'7.a.a.1,k.k..k.k.'2.a:3;;;9W7",
        late_pvp: "k'4..k.k..a,k'7.a.a.1;k..k.'2.k.k..a,k'7.a.a.1;k'4..k.k..a,k'7.a.a.1;aox",
        mid_pve: ",k..k.'2.k.k..a:3;;;37W",
        full_tier: "1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1"
    };

    try {
        // 1. Capture Mobile Assets
        console.log(`--- CAPTURING MOBILE ---`);
        const mobileContext = await browser.newContext({
            ...devices['iPhone 14 Pro Max'],
            viewport: { width: 393, height: 852 },
            deviceScaleFactor: 3
        });
        const mPage = await mobileContext.newPage();

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
        await mPage.click('.menu-button', { timeout: 5000 });
        await mPage.waitForSelector('.side-menu.open', { timeout: 5000 });
        await clickByText(mPage, 'Statistics', '.tab-bar__tab-button');
        await mPage.waitForTimeout(1000);
        await shot('mobile_stats.png', mPage);

        console.log(`Capturing Settings for Outro (Mobile - Late PvP)...`);
        // Clear state to avoid session pollution
        await mPage.evaluate(() => localStorage.clear());
        await mPage.goto(`${urlBase}${hashes.late_pvp}`, { waitUntil: 'networkidle' });
        await mPage.waitForTimeout(5000);

        await mPage.click('.menu-button', { timeout: 10000 });
        await mPage.waitForSelector('.side-menu.open', { timeout: 10000 });

        console.log(`Cleaning UI...`);
        await mPage.evaluate(() => {
            const sections = Array.from(document.querySelectorAll('.side-menu-section, .preview-section'));
            for (const s of sections) {
                if (s.textContent.includes('PREVIEW BUILD') || s.classList.contains('preview-section')) {
                    s.remove();
                }
            }
            // Also hide any floating preview indicators
            const previews = document.querySelectorAll('[class*="preview"], .preview-indicator, .preview-banner');
            previews.forEach(p => {
                if (p instanceof HTMLElement) p.style.display = 'none';
            });
        });

        console.log(`Switching to Settings tab...`);
        await clickByText(mPage, 'Settings', '.tab-bar__tab-button');
        await mPage.waitForTimeout(3000);
        await shot('mobile_settings.png', mPage);

        await mobileContext.close();

        // 2. Capture Desktop Assets
        console.log(`--- CAPTURING DESKTOP ---`);
        const desktopContext = await browser.newContext({
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
    } finally {
        await browser.close();
    }
}

run();
