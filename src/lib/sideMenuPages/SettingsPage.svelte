<script lang="ts">
    import { CaretLeftIcon } from "phosphor-svelte";
    import { triggerHaptic } from "../hapticsStore";
    import Accordion from "../Accordion.svelte";
    import { t } from "svelte-whisper";

    export let title: string | undefined = undefined;
    export let onBack: (() => void) | null = null;
    export let advancedTitle: string | undefined = undefined;
    export let onAdvancedOpen: (() => void) | null = null;

    let backButtonElement: HTMLButtonElement | null = null;

    export function focusBackButton() {
        backButtonElement?.focus();
    }
</script>

{#if title !== undefined}
    <div class="settings-page-header">
        {#if onBack}
            <button
                class="settings-page-back"
                type="button"
                aria-label={$t("settings.pages.backToSettings")}
                bind:this={backButtonElement}
                on:click={() => {
                    triggerHaptic();
                    onBack?.();
                }}
            >
                <CaretLeftIcon size={16} weight="bold" />
            </button>
        {/if}
        <h2 class="settings-page-title">{title}</h2>
    </div>
{/if}

<div class="settings-page-content">
    <slot />
</div>

{#if $$slots.advancedSettings}
    <Accordion title={advancedTitle ?? $t("settings.advanced")} on:toggle={(e) => { if (e.detail.isOpen) onAdvancedOpen?.(); }}>
        <slot name="advancedSettings" />
    </Accordion>
{/if}

<slot name="dangerZone" />

<style>
    .settings-page-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
    }

    .settings-page-back {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        color: var(--text-muted);
        cursor: pointer;
        transition:
            transform var(--ease),
            filter var(--ease);
        -webkit-tap-highlight-color: transparent;
    }

    .settings-page-back:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .settings-page-back:hover {
            filter: var(--brightness-hover);
        }
    }

    .settings-page-back:active {
        transform: scale(0.92);
    }

    .settings-page-title {
        margin: 0;
        font-size: var(--font-xl);
        color: var(--text);
        line-height: var(--leading-none);
    }

    .settings-page-content {
        display: grid;
        gap: var(--spacing-lg);
    }

    .settings-page-content :global(.button-arrow) {
        margin-left: calc(-1 * var(--spacing-md));
    }
</style>
