<script lang="ts">
    import { HexagonIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import { formatNumber } from "../mathUtil";
    import { openTechCrystalsOwnedModal } from "../techCrystalModal";
    import {
        techCrystalsSpent,
        techCrystalsOwned,
        techCrystalsFromActivePreset,
    } from "../techCrystalStore";

    const DEFAULT_TOOLTIP_SUBJECT = "your";

    export let disabled: boolean | undefined = false;
    export let tooltipSubject: string = DEFAULT_TOOLTIP_SUBJECT;

    // When disabled (preview mode), read from active preset's stored buildCode
    // When enabled (personal mode), use reactive stores
    $: owned = disabled
        ? $techCrystalsFromActivePreset.owned
        : $techCrystalsOwned;
    $: spent = disabled
        ? $techCrystalsFromActivePreset.spent
        : $techCrystalsSpent;
    $: hasOwned = owned > 0;
</script>

<Button
    on:click={() => {
        openTechCrystalsOwnedModal(
            owned,
            tooltipSubject !== DEFAULT_TOOLTIP_SUBJECT
                ? tooltipSubject
                : undefined,
        );
    }}
    tooltipText={`Change ${tooltipSubject} Tech Crystal owned (budget)`}
    icon={HexagonIcon}
    iconClass="button-icon button-icon-filled"
    iconWeight="fill"
    {disabled}
>
    Tech Crystals spent:<br />
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
        color: var(--text);
    }

    :global(.button-icon-filled) {
        fill: currentColor;
        stroke: none;
    }
</style>
