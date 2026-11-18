<script lang="ts">
    import { TranslateIcon, CaretDownIcon, CheckIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import { portal } from "../portal";
    import { t, getLocale, setLocale, getLocales, detectLocale, localeName } from "svelte-whisper";
    import { FALLBACK_LOCALE } from "../i18n";

    let dropdownButtonElement: HTMLButtonElement | null = null;
    let isOpen = false;
    let x = 0;
    let y = 0;

    // Browser language first, then the fallback, then the rest by their own names.
    const preferredLocale = detectLocale() || FALLBACK_LOCALE;
    const showFallback = preferredLocale !== FALLBACK_LOCALE && getLocales().includes(FALLBACK_LOCALE);
    const otherLocales = getLocales()
        .filter((l) => l !== preferredLocale && l !== FALLBACK_LOCALE)
        .sort((a, b) => localeName(a).localeCompare(localeName(b)));

    function handleDropdownClick() {
        if (!dropdownButtonElement) return;
        const rect = dropdownButtonElement.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.bottom + 8;
        isOpen = true;
    }

    function handleLanguageSelect(localeCode: string) {
        void setLocale(localeCode);
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
                <span class="label">{t("settings.languageLabel")}</span>
                <span class="description">{t("settings.languageDescription")}</span>
            </div>
            <div class="divider"></div>
            <div class="value-container">
                <span class="language-value"
                    >{localeName(getLocale())}</span
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
        title={t("settings.languageLabel")}
        onClose={closeDropdown}
        anchorBelow
    >
        <div class="language-list">
            {#if preferredLocale}
                <Button
                    on:click={() => handleLanguageSelect(preferredLocale)}
                    class={getLocale() === preferredLocale
                        ? "selected-language"
                        : ""}
                    icon={getLocale() === preferredLocale ? CheckIcon : null}
                >
                    {localeName(preferredLocale)}
                </Button>
            {/if}

            {#if showFallback || otherLocales.length > 0}
                <div class="list-separator"></div>

                {#if showFallback}
                    <Button
                        on:click={() => handleLanguageSelect(FALLBACK_LOCALE)}
                        class={getLocale() === FALLBACK_LOCALE
                            ? "selected-language"
                            : ""}
                        icon={getLocale() === FALLBACK_LOCALE
                            ? CheckIcon
                            : null}
                    >
                        {localeName(FALLBACK_LOCALE)}
                    </Button>
                {/if}

                {#each otherLocales as localeCode}
                    {@const isSelected = getLocale() === localeCode}
                    <Button
                        on:click={() => handleLanguageSelect(localeCode)}
                        class={isSelected ? "selected-language" : ""}
                        icon={isSelected ? CheckIcon : null}
                    >
                        {localeName(localeCode)}
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
