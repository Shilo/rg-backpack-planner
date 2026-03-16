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
        openTechCrystalsOwnedModal(owned, resolvedTooltipSubject);
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
    {$t("techCrystals.spentLabel")}<br />
    <span
        class="tech-crystals-spent"
        class:is-negative={spent > owned && hasOwned}
    >
        {formatNumber(spent)}
    </span>
    <span class="tech-crystals-separator"> / </span>
    <span class="tech-crystals-owned">{formatNumber(owned)}</span>
</Button>

<style>
    .tech-crystals-spent {
        color: var(--text);
    }

    .tech-crystals-spent.is-negative {
        color: var(--accent-danger);
    }

    .tech-crystals-separator {
        color: var(--text-muted);
    }

    .tech-crystals-owned {
        color: var(--text-muted);
    }

    :global(.button-icon-filled) {
        fill: currentColor;
        stroke: none;
    }
</style>
