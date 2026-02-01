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

    export let disabled: boolean | undefined = false;
    export let tooltipSubject: string = "your";

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
        openTechCrystalsOwnedModal(owned, tooltipSubject);
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
        color: #ffffff;
    }

    .tech-crystals-spent.is-negative {
        color: #f87171;
    }

    .tech-crystals-separator {
        color: #c7d6ff;
    }

    .tech-crystals-owned {
        color: #e6f0ff;
    }

    :global(.button-icon-filled) {
        fill: currentColor;
        stroke: none;
    }
</style>
