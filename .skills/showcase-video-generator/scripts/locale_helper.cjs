const path = require('path');
const fs = require('fs');

// Showcase overlay text is a flat JSON file per locale with no placeholders,
// so a plain lookup with an English fallback is all that is needed.
const LOCALES_DIR = path.join(__dirname, '..', '..', '..', 'showcase-video', 'locales');
const FALLBACK_LOCALE = 'en';

const TRANSLATION_KEYS = [
    'forRunGoddess',
    'planAndShare',
    'planYourBuild',
    'planFeature1',
    'planFeature2',
    'planFeature3',
    'trackYourProgress',
    'trackFeature1',
    'trackFeature2',
    'trackFeature3',
    'planTrackShare',
    'shareFeature1',
    'shareFeature2',
    'shareFeature3',
];

function readLocale(locale) {
    const file = path.join(LOCALES_DIR, `${locale}.json`);
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : null;
}

function loadTranslations(locale) {
    const fallback = readLocale(FALLBACK_LOCALE) || {};
    let dict = readLocale(locale);
    if (!dict) {
        console.warn(`[locale_helper] Locale "${locale}" not found, falling back to "${FALLBACK_LOCALE}"`);
        dict = fallback;
    }

    const translations = {};
    for (const key of TRANSLATION_KEYS) {
        translations[key] = dict[key] ?? fallback[key] ?? key;
    }
    return translations;
}

function getAvailableLocales() {
    return fs.readdirSync(LOCALES_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => path.basename(f, '.json'));
}

module.exports = { loadTranslations, getAvailableLocales, TRANSLATION_KEYS };
