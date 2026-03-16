<script lang="ts">
    import { TechCrystalIcon } from "./customIcons";
    import Button from "./Button.svelte";
    import { openTechCrystalsOwnedModal } from "./techCrystalModal";
    import { techCrystalsSpent, techCrystalsOwned } from "./techCrystalStore";
    import { buildContextMenuOpenForOverlayRaise } from "./buildContextMenuOverlayRaiseStore";
    import { formatNumber } from "svelte-whisper";
    import { t } from "svelte-whisper";

    $: hasOwned = $techCrystalsOwned > 0;
    $: tooltipText = hasOwned
        ? $t("techCrystals.displayTooltipSpentOwned")
        : $t("techCrystals.displayTooltipSpentOnly");

    /** When target is body, move node to body so it escapes parent stacking context (z-index 5). */
    function portal(node: HTMLElement, target: HTMLElement | null) {
        let parent: ParentNode | null = null;
        let next: ChildNode | null = null;
        if (target) {
            parent = node.parentNode;
            next = node.nextSibling;
            target.appendChild(node);
        }
        return {
            update(newTarget: HTMLElement | null) {
                if (!newTarget && parent) {
                    if (next) parent.insertBefore(node, next);
                    else parent.appendChild(node);
                    parent = null;
                    next = null;
                } else if (newTarget && newTarget !== target) {
                    parent = node.parentNode;
                    next = node.nextSibling;
                    newTarget.appendChild(node);
                    target = newTarget;
                }
            },
            destroy() {
                if (parent && node.parentNode === document.body) {
                    if (next) parent.insertBefore(node, next);
                    else parent.appendChild(node);
                }
            },
        };
    }
</script>

<span class="crystal-wrap">
    {#if $buildContextMenuOpenForOverlayRaise}
        <span
            class="crystal-placeholder currency-display"
            aria-hidden="true"
        >
            <span class="currency-spent">
                {formatNumber($techCrystalsSpent)}
            </span>
            {#if hasOwned}
                <span class="currency-separator"> / </span>
                <span class="currency-owned"
                    >{formatNumber($techCrystalsOwned)}</span
                >
            {/if}
            <TechCrystalIcon
                size={26}
                weight="fill"
                aria-hidden="true"
            />
        </span>
    {/if}
    <span
        class="crystal-overlay"
        class:active={$buildContextMenuOpenForOverlayRaise}
        use:portal={$buildContextMenuOpenForOverlayRaise ? document.body : null}
    >
        <Button
            class="currency-display"
            type="button"
            aria-label={$t("techCrystals.displayTooltipSpentOwned")}
            {tooltipText}
            on:click={() => openTechCrystalsOwnedModal($techCrystalsOwned)}
            arrow="right"
        >
            <span
                class="currency-spent"
                class:is-negative={$techCrystalsSpent > $techCrystalsOwned &&
                    hasOwned}
            >
                {formatNumber($techCrystalsSpent)}
            </span>
            {#if hasOwned}
                <span class="currency-separator"> / </span>
                <span class="currency-owned"
                    >{formatNumber($techCrystalsOwned)}</span
                >
            {/if}
            <TechCrystalIcon
                size={26}
                weight="fill"
                aria-hidden="true"
                style="color: var(--text-muted);"
            />
        </Button>
    </span>
</span>

<style>
    .crystal-wrap {
        display: inline-flex;
        position: relative;
    }

    /* Same size as button (currency-display + border) so reset button doesn't shift */
    .crystal-placeholder {
        visibility: hidden;
        pointer-events: none;
        border: var(--border-width) solid transparent;
    }

    .crystal-overlay {
        display: contents;
    }

    .crystal-overlay.active {
        display: block;
        position: fixed;
        top: max(var(--bar-pad), var(--safe-top));
        right: max(var(--bar-pad), var(--safe-right));
        z-index: var(--z-index-hud-above-context-backdrop);
    }

    :global(.currency-display) {
        border-radius: var(--radius-lg) !important;
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-xs) !important;
        padding: var(--spacing-sm) var(--spacing-md) var(--spacing-sm)
            var(--spacing-lg);
        font-weight: var(--weight-bold);
        font-size: var(--font-lg) !important;
        letter-spacing: var(--tracking);
    }

    :global(.currency-display .button-text) {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-sm);
        line-height: var(--leading-none);
    }

    :global(.currency-display svg) {
        display: block;
    }

    .currency-spent {
        text-align: right;
        color: var(--text);
    }

    .currency-spent.is-negative {
        color: var(--accent-danger);
    }

    .currency-separator {
        color: var(--text-muted);
    }

    .currency-owned {
        color: var(--text);
    }
</style>
