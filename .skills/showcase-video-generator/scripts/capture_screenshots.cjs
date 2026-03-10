const { chromium } = require('playwright');
const path = require('path');

async function run() {
    console.log('Starting Playwright...');
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
        console.log('Navigating to http://localhost:5173/ ...');
        await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
        console.log('Navigation complete. Waiting for manual hydration...');
        await page.waitForTimeout(5000);

        // 1. Showcase "Late PvE"
        console.log('Step 1: Build Preview');
        try {
            await page.click('.menu-button', { timeout: 3000 });
            await page.waitForTimeout(500);
            await clickByText('Settings');
            await page.waitForTimeout(500);
            await clickByText('Preview');
            await page.waitForTimeout(1000);
            await clickByText('Late PvE');
            await page.waitForTimeout(3000);
            await shot('late_pve.png');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
        } catch (e) { console.log('Build preview sequence encountered errors, continuing...'); }

        // 2. Node interaction
        console.log('Step 2: Node Interaction');
        try {
            const nodes = await page.$$('.tree-node, [data-node-id]');
            console.log(`Found ${nodes.length} nodes`);
            if (nodes.length > 5) {
                const node = nodes[nodes.length - 3];
                await node.click({ clickCount: 5 });
                await page.waitForTimeout(500);
                await shot('node_interaction.png');
                await node.click({ button: 'right' });
                await page.waitForTimeout(1000);
                await shot('context_menu.png');
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
            }
        } catch (e) { console.log('Node interaction sequence encountered errors, continuing...'); }

        // 3. Settings scroll
        console.log('Step 3: Settings Scroll');
        try {
            await page.click('.menu-button', { timeout: 3000 });
            await page.waitForTimeout(500);
            await clickByText('Settings');
            await page.waitForTimeout(500);
            await shot('settings_top.png');
            await page.evaluate(() => {
                const panel = document.querySelector('.side-menu-content') || document.querySelector('[role="dialog"]');
                if (panel) panel.scrollTop = 1000;
            });
            await page.waitForTimeout(1000);
            await shot('settings_bottom.png');
        } catch (e) { console.log('Settings scroll sequence encountered errors, continuing...'); }

    } catch (e) {
        console.error('Fatal error during capture:', e);
    } finally {
        console.log('Closing browser...');
        await browser.close();
    }
}

run();
