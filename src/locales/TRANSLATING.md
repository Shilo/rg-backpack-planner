# Translating Backpack Planner

Project rules for the locale files in this folder. The `whisper-translate` skill from svelte-whisper reads this file; follow it together with that skill's workflow (`npx svelte-whisper check`, `keys`, `apply`).

`en.json` is the source of truth for keys, nesting, order, placeholders and the English copy. Every other locale mirrors it.

## Audience and tone

Players of the mobile game Run! Goddess planning Backpack Tech builds. Write the way that language's player community writes about the game: short, direct UI text, natural gaming vocabulary, no literal translations.

## Fixed terms

`glossary/<locale>.json` holds the official in-game terminology for that locale (taken from the game client), in the same nested shape as the locale file. Those values are authoritative:

- Never translate, rephrase, normalise or "improve" a glossary value. `apply` and `sync` write the glossary over anything else, and `check` fails when a glossary term was overwritten.
- When a sentence contains a glossary term, use the glossary's wording inside your translation.
- A locale without a glossary file has no fixed terms.

## Keep as written

- Brand and product names: `Backpack Planner`, `GitHub`, `HEX`, `PvE`, `PvP`, `PWA`, unless the glossary gives a localized value for that exact key (for example `app.gameName` in Japanese).
- Numeric or symbol-only values: `+1`, `+10`, `−1`, `−10`, `+100`, `https://…/#1;2;3`.
- Values made only of placeholders, such as `{appName} {version}` or `{appName} - {gameName}`.
- Markup inside strings, such as `<br>` and `[[Settings > Node > …]]` paths. Translate the words inside `[[…]]` so they match the translated settings labels.

## No accessibility-only keys

Do not add or keep keys that exist only for ARIA, such as `ariaLabel` or `aria-label`. ARIA text either reuses an existing visible UI string or stays in code. If such a key appears in `en.json` or another locale, remove it from every locale instead of translating it.

## `skills.short`

`skills.short.*` are compact labels for tight spaces (node badges, tables), not full translations.

- Make them shorter than the matching `skills.<id>` label wherever you can without losing meaning.
- Never shorten into something ambiguous or a different stat. The label must still read as the same gameplay stat in context.
- Build them from the locale's in-game terminology roots (see the glossary), not invented shorthand.
- A `skills.short.*` value in the glossary is authoritative.

## Languages

**Japanese (`ja`)**
- Use katakana for loanwords that the Japanese gaming community writes in katakana.
- Natural particles and sentence structure; never join a translated fragment onto a particle.
- For `skills.short`, prefer established compact forms such as dropping `力` when still clear (`攻撃強化`, `防御強化`) or abbreviations players use (`グロ`, `ダメ`, `スキクリ`, `通常クリ`).

**Chinese (`zh`)**
- Simplified Chinese characters.

**French (`fr`)**
- Use the `one` and `other` plural forms where the source has a plural group, with agreeing participles (`dépensé` / `dépensés`).

**New languages**
- Name the file with a valid language tag. Language names come from `localeName()` in code, so there are no language-name keys to translate.
