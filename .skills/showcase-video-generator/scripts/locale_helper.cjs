const path = require('path');
const fs = require('fs');
const { addDictionary, setLocale, tr, init } = require(path.join(__dirname, '..', '..', '..', 'showcase-video', 'node_modules', 'svelte-whisper'));

const LOCALES_DIR = path.join(__dirname, '..', '..', '..', 'showcase-video', 'locales');

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

let initialized = false;

function initLocales() {
    if (initialized) return;

    const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
        const locale = path.basename(file, '.json');
        const dict = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf-8'));
        addDictionary(locale, dict);
    }

    init({ fallback: 'en', detect: false });
    initialized = true;
}

function loadTranslations(locale) {
    initLocales();

    const localeFile = path.join(LOCALES_DIR, `${locale}.json`);
    if (!fs.existsSync(localeFile)) {
        console.warn(`[locale_helper] Locale "${locale}" not found, falling back to "en"`);
        setLocale('en');
    } else {
        setLocale(locale);
    }

    const translations = {};
    for (const key of TRANSLATION_KEYS) {
        translations[key] = tr(key);
    }
    return translations;
}

function getAvailableLocales() {
    return fs.readdirSync(LOCALES_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => path.basename(f, '.json'));
}

module.exports = { loadTranslations, getAvailableLocales, TRANSLATION_KEYS };
