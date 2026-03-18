<script lang="ts">
    import { TranslateIcon, CaretDownIcon, CheckIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import { portal } from "../portal";
    import { t, locale, getLocales, getFallbackLocale } from "svelte-whisper";

    const fallbackLocale = getFallbackLocale();

    let dropdownButtonElement: HTMLButtonElement | null = null;
    let isOpen = false;
    let x = 0;
    let y = 0;

    $: selectedLocale = $locale;

    // Determine preferred locale based on browser settings
    $: preferredLocale = (() => {
        const available = getLocales();
        if (typeof navigator === "undefined" || available.length === 0)
            return available[0] || fallbackLocale;
        for (const lang of navigator.languages || [navigator.language]) {
            const base = lang.split("-")[0];
            if (available.includes(lang)) return lang;
            if (available.includes(base)) return base;
        }
        return available[0] || fallbackLocale;
    })();

    // Always sort the fallbackLocale to the top after preferredLocale
    $: isFallbackPreferred = preferredLocale === fallbackLocale;
    $: hasFallback = getLocales().includes(fallbackLocale);
    $: showFallback = hasFallback && !isFallbackPreferred;

    $: otherLocales = Array.from(new Set(getLocales()))
        .filter((l) => l !== preferredLocale && l !== fallbackLocale)
        .sort((a, b) => {
            const nameA = $t(`languageNames.${a}`) || a;
            const nameB = $t(`languageNames.${b}`) || b;
            return nameA.localeCompare(nameB);
        });

    function handleDropdownClick() {
        if (!dropdownButtonElement) return;
        const rect = dropdownButtonElement.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.bottom + 8;
        isOpen = true;
    }

    function handleLanguageSelect(localeCode: string) {
        void locale.set(localeCode);
        isOpen = false;
    }

    function closeDropdown() {
        isOpen = false;
    }
</script>

<div class="language-dropdown-container">
    <Button
        bind:element={dropdownButtonElement}
        on:click={handleDropdownClick}
        icon={TranslateIcon}
        class="language-button"
        arrow="down"
    >
        <div class="button-content">
            <div class="label-group">
                <span class="label">{$t("settings.languageLabel")}</span>
                <span class="description">{$t("settings.languageDescription")}</span>
            </div>
            <div class="divider"></div>
            <div class="value-container">
                <span class="language-value"
                    >{$t(`languageNames.${selectedLocale}`)}</span
                >
            </div>
        </div>
    </Button>
</div>

<div use:portal class="dropdown-menu-portal" class:menu-open={isOpen}>
    <ContextMenu
        {x}
        {y}
        {isOpen}
        title={$t("settings.languageLabel")}
        onClose={closeDropdown}
        anchorBelow
    >
        <div class="language-list">
            {#if preferredLocale}
                <Button
                    on:click={() => handleLanguageSelect(preferredLocale)}
                    class={selectedLocale === preferredLocale
                        ? "selected-language"
                        : ""}
                    icon={selectedLocale === preferredLocale ? CheckIcon : null}
                >
                    {$t(`languageNames.${preferredLocale}`)}
                </Button>
            {/if}

            {#if showFallback || otherLocales.length > 0}
                <div class="list-separator"></div>

                {#if showFallback}
                    <Button
                        on:click={() => handleLanguageSelect(fallbackLocale)}
                        class={selectedLocale === fallbackLocale
                            ? "selected-language"
                            : ""}
                        icon={selectedLocale === fallbackLocale
                            ? CheckIcon
                            : null}
                    >
                        {$t(`languageNames.${fallbackLocale}`)}
                    </Button>
                {/if}

                {#each otherLocales as localeCode}
                    {@const isSelected = selectedLocale === localeCode}
                    <Button
                        on:click={() => handleLanguageSelect(localeCode)}
                        class={isSelected ? "selected-language" : ""}
                        icon={isSelected ? CheckIcon : null}
                    >
                        {$t(`languageNames.${localeCode}`)}
                    </Button>
                {/each}
            {/if}
        </div>
    </ContextMenu>
</div>

<style>
    .language-dropdown-container {
        display: flex;
        width: 100%;
        min-width: 0;
    }

    :global(.language-button) {
        flex: 1;
        width: 100%;
    }

    :global(.language-button .button-text) {
        flex: 1;
        display: flex;
        min-width: 0;
        align-self: stretch;
    }

    .button-content {
        display: flex;
        align-items: stretch;
        justify-content: space-between;
        width: 100%;
        gap: var(--spacing-md);
        min-width: 0;
        flex-wrap: wrap;
    }

    .label-group {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
        justify-content: center;
        text-align: left;
    }

    .label {
        white-space: normal;
        overflow-wrap: anywhere;
    }

    .description {
        font-size: var(--font-sm);
        color: var(--text-disabled);
        line-height: var(--leading);
        white-space: normal;
        overflow-wrap: anywhere;
    }

    .divider {
        width: var(--border-width);
        background: var(--border);
        margin: calc(var(--spacing-sm) * -1) 0;
        flex-shrink: 0;
    }

    .value-container {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        min-width: 0;
        color: var(--text);
    }

    .language-value {
        white-space: normal;
        overflow-wrap: anywhere;
        text-align: right;
        min-width: 0;
    }

    :global(.language-button .caret-icon) {
        flex-shrink: 0;
    }

    .dropdown-menu-portal {
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        pointer-events: none;
        z-index: var(--z-index-context-menu-over-modal);
    }

    .dropdown-menu-portal.menu-open {
        pointer-events: auto;
    }

    .language-list {
        max-height: min(400px, 40vh);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        min-width: 160px;
    }

    .list-separator {
        height: var(--border-width);
        background: var(--border);
        margin: calc(var(--spacing-sm) * -1) 0;
        flex-shrink: 0;
    }

    :global(.selected-language) {
        background: color-mix(
            in srgb,
            var(--surface) 78%,
            var(--accent)
        ) !important;
        border-color: color-mix(
            in srgb,
            var(--accent) 55%,
            var(--border)
        ) !important;
        color: var(--text);
    }

    @media (hover: hover) {
        :global(.selected-language:not(:disabled):hover) {
            filter: var(--brightness-hover);
        }
    }

    :global(.selected-language:not(:disabled):active) {
        filter: var(--brightness-hover);
    }

    :global(.selected-language:focus-visible) {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }
</style>
