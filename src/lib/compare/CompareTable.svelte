<script lang="ts" context="module">
    type SectionHeader = {
        text: string;
        icon?: any;
        iconWeight?: string;
    };

    export interface CompareRow {
        label: string;
        valueA: number;
        valueB: number;
        format: "number" | "percent";
    }

    export interface CompareSection {
        header: SectionHeader;
        rows: CompareRow[];
    }
</script>

<script lang="ts">
    import { getIndicator } from "./compareStats";
    import { formatNumber, formatPercent } from "svelte-whisper";

    export let sections: CompareSection[] = [];
    export let activeSide: "a" | "b" = "a";
    export let labelA: string = "";
    export let labelB: string = "";
</script>

<table
    class="compare-table"
    class:active-a={activeSide === "a"}
    class:active-b={activeSide === "b"}
>
    <tbody>
        {#each sections as section, i}
            <tr class="compare-table__header">
                {#if i === 0}
                    <td colspan="2">
                        <span class="compare-table__header-content">
                            {#if section.header.icon}
                                <svelte:component
                                    this={section.header.icon}
                                    weight={section.header.iconWeight ?? "regular"}
                                    size="1.2em"
                                />
                            {/if}
                            {section.header.text}
                        </span>
                    </td>
                    <td class="compare-table__header-label compare-table__header-label--left">
                        <span class="compare-table__header-label-text">{labelA}</span>
                    </td>
                    <td class="compare-table__header-label compare-table__header-label--right">
                        <span class="compare-table__header-label-text">{labelB}</span>
                    </td>
                {:else}
                    <td colspan="4">
                        <span class="compare-table__header-content">
                            {#if section.header.icon}
                                <svelte:component
                                    this={section.header.icon}
                                    weight={section.header.iconWeight ?? "regular"}
                                    size="1.2em"
                                />
                            {/if}
                            {section.header.text}
                        </span>
                    </td>
                {/if}
            </tr>
            {#each section.rows as row}
                {@const activeValue = activeSide === "a" ? row.valueA : row.valueB}
                {@const referenceValue = activeSide === "a" ? row.valueB : row.valueA}
                {@const indicator = getIndicator(activeValue, referenceValue)}
                <tr class="compare-table__row">
                    <td class="compare-table__label">{row.label}</td>
                    <td
                        class="compare-table__indicator"
                        class:indicator-higher={indicator === "higher"}
                        class:indicator-lower={indicator === "lower"}
                        class:indicator-equal={indicator === "equal"}
                    >
                        {#if indicator === "higher"}▲{:else if indicator === "lower"}▼{:else}–{/if}
                    </td>
                    <td class="compare-table__value-a">
                        {row.format === "percent"
                            ? formatPercent(row.valueA)
                            : formatNumber(row.valueA)}
                    </td>
                    <td class="compare-table__value-b">
                        {row.format === "percent"
                            ? formatPercent(row.valueB)
                            : formatNumber(row.valueB)}
                    </td>
                </tr>
            {/each}
        {/each}
    </tbody>
</table>

<style>
    .compare-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: var(--font-base);
    }

    .compare-table__header td {
        background: color-mix(in srgb, var(--accent) 8%, var(--bg-input));
        color: var(--text-muted);
        font-weight: var(--weight-bold);
        letter-spacing: var(--tracking);
        padding: var(--spacing-sm) var(--spacing-md);
        border-top: var(--border-width) solid var(--border-subtle);
    }

    .compare-table tbody tr:first-child td {
        border-top: none;
    }

    .compare-table__header-content {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
    }

    .compare-table__header-content :global(svg) {
        color: var(--accent-light);
    }

    .compare-table__header-label {
        text-align: right;
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        color: var(--text-disabled);
        vertical-align: middle;
    }

    /* Left label: overflow to the left into the section title space */
    .compare-table__header-label--left {
        position: relative;
        overflow: visible;
    }

    .compare-table__header-label--left .compare-table__header-label-text {
        position: absolute;
        right: var(--spacing-md);
        top: 50%;
        transform: translateY(-50%);
        white-space: nowrap;
    }

    /* Right label: truncate with ellipsis */
    .compare-table__header-label--right .compare-table__header-label-text {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 70px;
        margin-left: auto;
    }

    .compare-table__row td {
        padding: var(--spacing-sm) var(--spacing-md);
        border-top: var(--border-width) solid var(--border-subtle);
    }

    .compare-table__label {
        color: var(--text-muted);
    }

    .compare-table__indicator {
        width: 16px;
        text-align: center;
        font-size: var(--font-xs);
    }

    .indicator-higher {
        color: var(--accent);
    }

    .indicator-lower {
        color: var(--negative);
    }

    .indicator-equal {
        color: var(--text-disabled);
    }

    .compare-table__value-a,
    .compare-table__value-b {
        text-align: right;
        font-weight: var(--weight-bold);
        font-variant-numeric: tabular-nums;
        color: var(--text);
    }

    /* Active column: surface background + accent text */
    .active-a .compare-table__value-a,
    .active-b .compare-table__value-b {
        background: var(--surface);
        color: var(--accent);
    }

    /* Inactive column: muted text */
    .active-a .compare-table__value-b,
    .active-b .compare-table__value-a {
        color: var(--text-muted);
    }
</style>
