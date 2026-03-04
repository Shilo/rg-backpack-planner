<script lang="ts">
    import { TranslateIcon, CaretDownIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import { portal } from "../portal";
    import { t, locale, getLocales } from "svelte-whisper";

    let dropdownButtonElement: HTMLButtonElement | null = null;
    let isOpen = false;
    let x = 0;
    let y = 0;

    $: selectedLocale = $locale;

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
        tooltipText={$t("settings.languageTooltip")}
    >
        <div class="button-content">
            <span class="label">{$t("settings.languageLabel")}</span>
            <div class="divider"></div>
            <div class="value-container">
                <span class="language-value"
                    >{$t(`languageNames.${selectedLocale}`)}</span
                >
                <CaretDownIcon class="caret-icon" size={16} />
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
    >
        <div class="language-list">
            {#each getLocales() as localeCode}
                {@const isSelected = selectedLocale === localeCode}
                <Button
                    on:click={() => handleLanguageSelect(localeCode)}
                    class={isSelected ? "selected-language" : ""}
                >
                    {$t(`languageNames.${localeCode}`)}
                </Button>
            {/each}
        </div>
    </ContextMenu>
</div>

<style>
    .language-dropdown-container {
        display: flex;
        width: 100%;
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
    }

    .label {
        flex: 1;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
        display: flex;
        align-items: center;
    }

    .divider {
        width: var(--border-width);
        background: var(--border);
        margin: calc(var(--spacing-sm) * -1) 0;
    }

    .value-container {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        flex-shrink: 0;
        color: var(--text);
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

    :global(.selected-language) {
        border-color: var(--border-focus);
        background: var(--bg-hover);
        color: var(--text);
    }
</style>
