<script lang="ts">
    import { onMount, tick } from "svelte";
    import { TechCrystalIcon } from "./customIcons";
    import Button from "./Button.svelte";
    import { openTechCrystalsOwnedModal } from "./techCrystalModal";
    import { techCrystalsSpent, techCrystalsOwned } from "./techCrystalStore";
    import { formatNumber } from "svelte-whisper";
    import { t } from "svelte-whisper";
    import { formatCompact } from "./mathUtil";
    import { getKeyboardActionLabel } from "./input";
    import { appTitleVisible } from "./appTitleVisibleStore";

    export let activeTreeIndex = 0;

    $: hasOwned = $techCrystalsOwned > 0;
    $: tooltipText = hasOwned
        ? $t("techCrystals.displayTooltipSpentOwned")
        : $t("techCrystals.displayTooltipSpentOnly");

    type AnimState = "" | "pulse" | "overspend";
    let animState: AnimState = "";
    let prevSpent = NaN;
    let prevOwned = NaN;
    let ready = false;

    onMount(() => {
        const id = requestAnimationFrame(() => {
            ready = true;
        });
        const onResize = () => {
            if ($appTitleVisible) {
                cancelAnimationFrame(overlapRafId);
                overlapRafId = requestAnimationFrame(checkOverlap);
            }
        };
        window.addEventListener("resize", onResize);
        return () => {
            cancelAnimationFrame(id);
            cancelAnimationFrame(overlapRafId);
            window.removeEventListener("resize", onResize);
        };
    });

    $: if (ready && ($techCrystalsSpent !== prevSpent || $techCrystalsOwned !== prevOwned)) {
        const isOverBudget = $techCrystalsSpent > $techCrystalsOwned && $techCrystalsOwned > 0;
        prevSpent = $techCrystalsSpent;
        prevOwned = $techCrystalsOwned;
        triggerAnim(isOverBudget ? "overspend" : "pulse");
    } else {
        prevSpent = $techCrystalsSpent;
        prevOwned = $techCrystalsOwned;
    }

    let wrapperEl: HTMLDivElement;

    async function triggerAnim(state: AnimState) {
        animState = "";
        await tick();
        void wrapperEl?.offsetWidth; // force reflow so the browser sees the class removal
        animState = state;
    }

    function onAnimEnd() {
        animState = "";
    }

    // Dynamic overlap detection with AppTitleDisplay
    let overlapping = false;
    let overlapRafId = 0;

    function checkOverlap() {
        const titleEl = document.querySelector(".app-title-display");
        if (!titleEl || !wrapperEl) {
            overlapping = false;
            return;
        }
        const titleRect = titleEl.getBoundingClientRect();
        const crystalRect = wrapperEl.getBoundingClientRect();
        overlapping = titleRect.right + 8 > crystalRect.left;
    }

    $: if ($appTitleVisible) {
        cancelAnimationFrame(overlapRafId);
        overlapRafId = requestAnimationFrame(checkOverlap);
    } else {
        cancelAnimationFrame(overlapRafId);
        overlapping = false;
    }
</script>

<div
    bind:this={wrapperEl}
    class="currency-anim-wrapper"
    class:anim-pulse={animState === "pulse"}
    class:anim-shake={animState === "overspend"}
    class:title-visible={overlapping}
    on:animationend|self={onAnimEnd}
>
    <Button
        class="currency-display"
        type="button"
        aria-label={$t("techCrystals.displayTooltipSpentOwned")}
        {tooltipText}
        shortcut={getKeyboardActionLabel("budget", $t)}
        on:click={() => openTechCrystalsOwnedModal($techCrystalsOwned, undefined, activeTreeIndex)}
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
                >{formatCompact($techCrystalsOwned)}</span
            >
        {/if}
        <TechCrystalIcon
            size={26}
            weight="fill"
            aria-hidden="true"
            style="color: var(--text-muted);"
        />
    </Button>
</div>

<style>
    .currency-anim-wrapper {
        display: inline-flex;
        transition: opacity 350ms ease;
    }

    .currency-anim-wrapper.title-visible {
        opacity: 0;
        pointer-events: none;
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
        color: var(--text-disabled);
    }

    .currency-owned {
        color: var(--text-disabled);
    }

    /* ═══ Value-change animations ═══ */

    .currency-anim-wrapper.anim-pulse {
        animation: currency-pulse 350ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .currency-anim-wrapper.anim-shake {
        animation: currency-shake 450ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes currency-pulse {
        0% {
            transform: scale(1);
        }
        35% {
            transform: scale(1.08);
        }
        100% {
            transform: scale(1);
        }
    }

    @keyframes currency-shake {
        0% {
            transform: translateX(0) scale(1);
        }
        12% {
            transform: translateX(-3px) scale(1.06);
        }
        24% {
            transform: translateX(3px) scale(1.06);
        }
        36% {
            transform: translateX(-2px) scale(1.04);
        }
        48% {
            transform: translateX(2px) scale(1.04);
        }
        60% {
            transform: translateX(-1px) scale(1.02);
        }
        72% {
            transform: translateX(1px);
        }
        100% {
            transform: translateX(0);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .currency-anim-wrapper {
            transition: none;
        }

        .currency-anim-wrapper.anim-pulse,
        .currency-anim-wrapper.anim-shake {
            animation: none;
        }
    }
</style>
