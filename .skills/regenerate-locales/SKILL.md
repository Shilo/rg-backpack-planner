---
name: regenerate-locales
description: Regenerate all non-English locale JSON files by translating from src/locales/en.json. Use this skill whenever the user asks to update translations, regenerate locales, sync locale files, translate the app, add a new language, or mentions i18n/localization work. Also trigger when the user says things like "update ja.json", "fix translations", "sync translations", or "regenerate zh.json".
---

# Regenerate Locale Files

Translate all non-English locale files in `src/locales/` based on the English source file `src/locales/en.json`. The English file is the single source of truth for all translations.

## Process

1. Read `src/locales/en.json` to get the current English strings.
2. List all other `.json` files in `src/locales/` (e.g., `ja.json`, `zh.json`).
3. For each non-English locale file, generate a complete translation by writing every value translated into the target language.

## Translation Rules

### Structure
- The output JSON must have the **exact same key structure** as `en.json` -- same nesting, same keys, same order.
- If `en.json` has added new keys since the last generation, add them. If keys were removed, remove them. The structure must be a 1:1 mirror.

### What to translate
- Translate the **values** (the English text), not the keys.
- Translate naturally and idiomatically for the target language. Avoid overly literal translations.
- For gaming terminology (skills, stats, UI terms), use the conventions common in that language's gaming community.
- **CRITICAL RULE FOR `languageNames`**: Do NOT copy `en.json`'s language names (e.g. "English", "Japanese (日本語)"). You MUST use the exact translated names specified in the "Language-specific notes" section below (e.g. "英語 (English)" for ja.json). This is a frequent error, so double-check your `languageNames` output.

### What NOT to translate
- **Interpolation placeholders** like `{name}`, `{version}`, `{treeLabel}`, `{subject}`, `{ownerLink}`, `{gameLink}`, etc. -- keep these exactly as-is within the translated text.
- **HTML tags** like `<br>` -- preserve them in place.
- **Proper nouns / brand names**: `"Backpack Planner"`, `"Run! Goddess"`, `"GitHub"`, `"HEX"`, `"PvE"`, `"PvP"`, `"PWA"` -- keep in English.
- **Numeric/symbol-only values**: `"+1"`, `"+10"`, `"−1"`, `"−10"`, `"+100"`, `"https://.../#1;2;3"` -- keep as-is.
- **Format-only template strings** where the value is purely placeholders: e.g., `"{appName} {version}"`, `"{appName} - {gameName}"`, `"{appName} - {gameName} {version}"` -- keep identical to English.

### Language-specific notes

**Japanese (ja.json)**:
- `languageNames` values should show the language name in Japanese, with the native script in parentheses where appropriate (e.g., `"英語 (English)"`, `"日本語"`, `"中国語 (中文)"`).
- Use katakana for loanwords that are commonly written in katakana in gaming contexts.
- Use appropriate particles and natural sentence structure.

**Chinese Simplified (zh.json)**:
- `languageNames` values should show the language name in Chinese, with the native script in parentheses where appropriate (e.g., `"英语 (English)"`, `"日语 (日本語)"`, `"中文"`).
- Use simplified Chinese characters.

### For any new languages added in the future
- Follow the same pattern: `languageNames` shows each language name in the new language, with native script in parentheses for non-native languages.
- The new locale's own language entry should just be the native name without parenthetical.

## Output

Write each translated locale file using the Write tool. Output valid, pretty-printed JSON with 4-space indentation matching the style of `en.json`.

After writing all files, briefly summarize what changed (new keys added, removed keys, number of strings translated).
