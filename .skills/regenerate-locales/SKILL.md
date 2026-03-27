---
name: regenerate-locales
description: Regenerate all non-English locale JSON files by translating from src/locales/en.json. Use this skill whenever the user asks to update translations, regenerate locales, sync locale files, translate the app, add a new language, or mentions i18n/localization work. Also trigger when the user says things like "update ja.json", "fix translations", "sync translations", or "regenerate zh.json".
---

# Regenerate Locale Files

Translate all non-English locale files in `src/locales/` based on the English source file `src/locales/en.json`.

`src/locales/en.json` is the source of truth for locale structure, keys, placeholders, and default English copy.

`src/locales/term-mappings/<locale>.json` is the authoritative source of truth for any locale-specific in-game terminology that must not be replaced by direct translation.

## Process

1. Read `src/locales/en.json` to get the current English strings.
2. List all other `.json` files in `src/locales/` (e.g., `ja.json`, `zh.json`).
3. For each non-English locale file, read `src/locales/term-mappings/<locale>.json` if it exists.
4. Translate the locale normally for all unmapped paths.
5. Apply the mapped target values after translation to the exact locale paths listed in the term-mapping file.
6. Write the final locale file.

## Locale Term Mappings

### Directory format

- Store locale-specific term maps in `src/locales/term-mappings/`.
- Use one file per locale: `ja.json`, `zh.json`, `fr.json`, etc.
- Each file is keyed by locale path, so identical English terms can be mapped differently in different contexts if needed later.

### File shape

```json
{
    "locale": "ja",
    "sourceLocale": "en",
    "mappings": {
        "skills.attack_boost": {
            "source": "Attack Boost",
            "target": "攻撃力強化"
        }
    }
}
```

### Hard rules

- Treat every mapped `target` as authoritative in-game terminology.
- Never overwrite or override a mapped target with AI translation, direct translation, English proper-noun preservation, style normalization, or "better wording".
- If a mapped path conflicts with the previous locale file, the term-mapping file wins.
- Reapply mapped targets after translation as the final locale-value override step.
- If a locale does not have a file in `src/locales/term-mappings/<locale>.json`, proceed without term overrides for that locale.

## Translation Rules

### Structure
- The output JSON must have the **exact same key structure** as `en.json` -- same nesting, same keys, same order.
- If `en.json` has added new keys since the last generation, add them. If keys were removed, remove them. The structure must be a 1:1 mirror.
- **Exception: ARIA-only locale keys must not exist.** Do not add or preserve dedicated accessibility-only paths such as `ariaLabel`, `aria-label`, or similar keys in locale files. If they appear in `en.json` or another locale, remove them from every locale instead of translating them.

### What to translate
- Translate the **values** (the English text), not the keys.
- Translate naturally and idiomatically for the target language. Avoid overly literal translations.
- For gaming terminology (skills, stats, UI terms), use the conventions common in that language's gaming community.
- For any path present in `src/locales/term-mappings/<locale>.json`, do **not** translate the value freely. Use the mapped `target` exactly.
- For `skills.short`, optimize for shorter character length than the full `skills` label whenever possible, but only if the shortened label still preserves context and stays anchored to the authoritative in-game terminology for that locale.
- **CRITICAL RULE FOR `languageNames`**: Do NOT copy `en.json`'s language names (e.g. "English", "Japanese (日本語)"). You MUST use the exact translated names specified in the "Language-specific notes" section below (e.g. "英語 (English)" for ja.json). This is a frequent error, so double-check your `languageNames` output.

### What NOT to translate
- **Interpolation placeholders** like `{name}`, `{version}`, `{treeLabel}`, `{subject}`, `{ownerLink}`, `{gameLink}`, etc. -- keep these exactly as-is within the translated text.
- **HTML tags** like `<br>` -- preserve them in place.
- **Proper nouns / brand names**: `"Backpack Planner"`, `"GitHub"`, `"HEX"`, `"PvE"`, `"PvP"`, `"PWA"` -- keep in English unless `src/locales/term-mappings/<locale>.json` provides a canonical localized value for that exact path.
- **Numeric/symbol-only values**: `"+1"`, `"+10"`, `"−1"`, `"−10"`, `"+100"`, `"https://.../#1;2;3"` -- keep as-is.
- **Format-only template strings** where the value is purely placeholders: e.g., `"{appName} {version}"`, `"{appName} - {gameName}"`, `"{appName} - {gameName} {version}"` -- keep identical to English.
- **ARIA / accessibility-only copy**: Do not create translated locale entries specifically for ARIA labels. ARIA should stay hardcoded in code, or code may reuse an existing non-ARIA UI string only when it already matches the element without introducing a dedicated aria-only locale key.

### `skills.short` rules
- Treat `skills.short` as compact UI labels, not full translations.
- The primary goal is shorter character length for faster reading in tight UI spaces.
- Never shorten a label if the result changes the stat meaning or makes the label ambiguous in context.
- Always preserve context so the shortened label still reads as the same gameplay stat in the UI.
- Keep the same gameplay meaning as the full `skills.<id>` label.
- If a locale term-mapping file defines a `skills.short.*` path, that mapped target is authoritative.
- Shortened labels should still use the locale's proper in-game terminology roots rather than inventing unrelated shorthand.

### Language-specific notes

**Japanese (ja.json)**:
- `languageNames` values should show the language name in Japanese, with the native script in parentheses where appropriate (e.g., `"英語 (English)"`, `"日本語"`, `"中国語 (中文)"`).
- Use katakana for loanwords that are commonly written in katakana in gaming contexts.
- Use appropriate particles and natural sentence structure.
- For `skills.short`, prefer established compact forms that reduce character count while preserving meaning, such as dropping `力` when still clear (`攻撃強化`, `防御強化`) or using well-understood abbreviations like `グロ`, `ダメ`, `スキクリ`, and `通常クリ`.

**Chinese Simplified (zh.json)**:
- `languageNames` values should show the language name in Chinese, with the native script in parentheses where appropriate (e.g., `"英语 (English)"`, `"日语 (日本語)"`, `"中文"`).
- Use simplified Chinese characters.

### For any new languages added in the future
- Follow the same pattern: `languageNames` shows each language name in the new language, with native script in parentheses for non-native languages.
- The new locale's own language entry should just be the native name without parenthetical.

## Output

Write each translated locale file using the Write tool. Output valid, pretty-printed JSON with 4-space indentation matching the style of `en.json`.

After writing all files, briefly summarize what changed (new keys added, removed keys, number of strings translated, and which locale term-mapping files were applied).
