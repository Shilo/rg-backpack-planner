const { captureForLocale } = require('./capture_screenshots.cjs');
const { getAvailableLocales } = require('./locale_helper.cjs');

async function captureAll() {
    const locales = getAvailableLocales();
    console.log(`Capturing screenshots for locales: ${locales.join(', ')}\n`);

    for (const locale of locales) {
        console.log(`\n========== Capturing: ${locale} ==========\n`);
        await captureForLocale(locale);
    }

    console.log('\nAll locale screenshots captured successfully.');
}

captureAll();
