<script lang="ts">
    import { TechCrystalIcon } from "../customIcons";
    import Button from "../Button.svelte";
    import { formatNumber } from "svelte-whisper";
    import { openTechCrystalsOwnedModal } from "../techCrystalModal";
    import {
        techCrystalsSpent,
        techCrystalsOwned,
        techCrystalsFromActivePreset,
    } from "../techCrystalStore";
    import { t } from "svelte-whisper";

    export let disabled: boolean | undefined = false;
    export let tooltipSubject = "";
    export let activeTreeIndex = 0;

    // When disabled (preview mode), read from active preset's stored buildCode
    // When enabled (personal mode), use reactive stores
    $: owned = disabled
        ? $techCrystalsFromActivePreset.owned
        : $techCrystalsOwned;
    $: spent = disabled
        ? $techCrystalsFromActivePreset.spent
        : $techCrystalsSpent;
    $: hasOwned = owned > 0;
    $: resolvedTooltipSubject =
        tooltipSubject || $t("techCrystals.subjectYour");
</script>

<Button
    on:click={() => {
        openTechCrystalsOwnedModal(owned, resolvedTooltipSubject, activeTreeIndex);
    }}
    tooltipText={$t("techCrystals.changeOwnedTooltip", {
        subject: resolvedTooltipSubject,
    })}
    icon={TechCrystalIcon}
    iconClass="button-icon button-icon-filled"
    iconWeight="fill"
    arrow="right"
    {disabled}
>
    <span class="tc-layout">
        <span class="tc-header">
            <span class="tc-title">{$t("techCrystals.spentLabel")}</span>
            <span class="tc-hint">{$t("techCrystals.budgetHint")}</span>
        </span>
        <span class="tc-values">
            <span
                class="tech-crystals-spent"
                class:is-negative={spent > owned && hasOwned}
            >
                {formatNumber(spent)}
            </span>
            <span class="tech-crystals-separator"> / </span>
            <span class="tech-crystals-owned">{formatNumber(owned)}</span>
        </span>
    </span>
</Button>

<style>
    .tc-layout {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .tc-header {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
    }

    .tc-hint {
        font-size: var(--font-sm);
        color: var(--text-disabled);
        line-height: var(--leading);
    }

    .tc-values {
        border-top: var(--border-width) solid var(--border-subtle);
        padding-top: var(--spacing-sm);
        font-size: var(--font-lg);
    }

    .tech-crystals-spent {
        color: var(--text);
    }

    .tech-crystals-spent.is-negative {
        color: var(--accent-danger);
    }

    .tech-crystals-separator {
        color: var(--text-disabled);
    }

    .tech-crystals-owned {
        color: var(--text-disabled);
    }

    :global(.button-icon-filled) {
        fill: currentColor;
        stroke: none;
    }
</style>
