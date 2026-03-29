<script lang="ts" context="module">
    type SectionHeader = {
        text: string;
        icon?: any;
        iconWeight?: string;
    };

    export interface CompareRow {
        label: string;
        activeValue: number;
        referenceValue: number;
        format: "number" | "percent";
        /** If true, higher active value is negative (e.g. TC spent) */
        invertIndicator?: boolean;
    }

    export interface CompareSection {
        header: SectionHeader;
        rows: CompareRow[];
    }
</script>

<script lang="ts">
    import type { Indicator } from "./compareStats";
    import { getIndicator } from "./compareStats";
    import { formatNumber, formatPercent } from "svelte-whisper";

    export let sections: CompareSection[] = [];
</script>

<table class="compare-table">
    <tbody>
        {#each sections as section}
            <tr class="compare-table__header">
                <td colspan="4">
                    {#if section.header.icon}
                        <svelte:component
                            this={section.header.icon}
                            weight={section.header.iconWeight ?? "regular"}
                            size={16}
                        />
                    {/if}
                    {section.header.text}
                </td>
            </tr>
            {#each section.rows as row}
                {@const indicator = getIndicator(row.activeValue, row.referenceValue)}
                {@const indicatorInverted = row.invertIndicator
                    ? indicator === "higher"
                        ? "lower"
                        : indicator === "lower"
                          ? "higher"
                          : "equal"
                    : indicator}
                <tr class="compare-table__row">
                    <td class="compare-table__label">{row.label}</td>
                    <td
                        class="compare-table__indicator"
                        class:indicator-higher={indicatorInverted === "higher"}
                        class:indicator-lower={indicatorInverted === "lower"}
                        class:indicator-equal={indicatorInverted === "equal"}
                    >
                        {#if indicator === "higher"}▲{:else if indicator === "lower"}▼{:else}•{/if}
                    </td>
                    <td class="compare-table__active">
                        {row.format === "percent"
                            ? formatPercent(row.activeValue)
                            : formatNumber(row.activeValue)}
                    </td>
                    <td class="compare-table__reference">
                        {row.format === "percent"
                            ? formatPercent(row.referenceValue)
                            : formatNumber(row.referenceValue)}
                    </td>
                </tr>
            {/each}
        {/each}
    </tbody>
</table>

<style>
    .compare-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--font-sm);
        font-family: var(--font-mono);
    }

    .compare-table__header td {
        padding: var(--spacing-xs) var(--spacing-sm);
        color: var(--text-muted);
        font-weight: 600;
        border-bottom: var(--border-width) solid var(--border);
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
    }

    .compare-table__row td {
        padding: var(--spacing-xs) var(--spacing-sm);
    }

    .compare-table__label {
        color: var(--text);
    }

    .compare-table__indicator {
        width: 16px;
        text-align: center;
        font-size: var(--font-xs);
    }

    .indicator-higher {
        color: var(--positive);
    }

    .indicator-lower {
        color: var(--negative);
    }

    .indicator-equal {
        color: var(--text-disabled);
    }

    .compare-table__active {
        text-align: right;
        color: var(--accent);
    }

    .compare-table__reference {
        text-align: right;
        color: var(--text-muted);
        opacity: 0.6;
    }
</style>
