const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loadTranslations, getAvailableLocales } = require('../../.skills/showcase-video-generator/scripts/locale_helper.cjs');

const showcaseDir = path.join(__dirname, '..');
const locales = getAvailableLocales();

console.log(`Rendering videos for locales: ${locales.join(', ')}\n`);

for (const locale of locales) {
    const outDir = path.join(showcaseDir, 'out', locale);
    fs.mkdirSync(outDir, { recursive: true });

    const translations = loadTranslations(locale);
    const props = { locale, translations };

    const propsFile = path.join(outDir, '_props.json');
    fs.writeFileSync(propsFile, JSON.stringify(props));

    console.log(`\n========== Rendering: ${locale} ==========\n`);

    try {
        // Render video
        console.log(`[${locale}] Rendering video...`);
        execSync(
            `npx remotion render src/index.ts Showcase out/${locale}/backpack_planner_showcase.mp4 --props=${propsFile}`,
            { cwd: showcaseDir, stdio: 'inherit' }
        );

        // Render snapshot
        console.log(`[${locale}] Rendering snapshot...`);
        execSync(
            `npx remotion still src/index.ts Showcase out/${locale}/backpack_planner_snapshot.png --frame=0 --props=${propsFile}`,
            { cwd: showcaseDir, stdio: 'inherit' }
        );

        console.log(`[${locale}] Done.`);
    } catch (e) {
        console.error(`[${locale}] Render failed:`, e.message);
    } finally {
        // Clean up temp props file
        if (fs.existsSync(propsFile)) {
            fs.unlinkSync(propsFile);
        }
    }
}

console.log('\nAll locale videos rendered successfully.');
