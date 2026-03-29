<script lang="ts" context="module">
    export type { CompareRow, CompareSection } from "./compareStats";
</script>

<script lang="ts">
    import { getIndicator, type CompareSection } from "./compareStats";
    import { formatNumber, formatPercent, t } from "svelte-whisper";
    import { showToast } from "../toast";
    import { shareTextNative } from "../buildData/share";
    import appPackage from "../../../package.json";

    export let sections: CompareSection[] = [];
    export let activeSide: "a" | "b" = "a";
    export let labelA: string = "";
    export let labelB: string = "";

    const appProductionUrl = (appPackage?.app?.productionUrl ?? undefined) as
        | string
        | undefined;

    $: localizedAppName = $t("app.name");
    $: codeblockTitle = appProductionUrl
        ? `[${localizedAppName}](${appProductionUrl})`
        : localizedAppName;
    $: codeblockHeader = `### 🎒 ${codeblockTitle} ${$t("statistics.header")}`;

    function buildCompareText(
        _sections: CompareSection[],
        _activeSide: "a" | "b",
        _labelA: string,
        _labelB: string,
    ): string {
        const normalize = (v: string) =>
            v.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();

        // label and diffPart are kept separate so the diff can be right-aligned
        // within the label column at render time.
        type Row = { label: string; diffPart: string; c1: string; c2: string; isSection: boolean };
        const rows: Row[] = [];

        for (let si = 0; si < _sections.length; si++) {
            const section = _sections[si];
            rows.push({
                label: normalize(section.header.text),
                diffPart: "",
                c1: si === 0 ? normalize(_labelA) : "",
                c2: si === 0 ? normalize(_labelB) : "",
                isSection: true,
            });

            for (const row of section.rows) {
                // Always diff A (left) vs B (right) so the sign is unambiguous in text
                const indicator = getIndicator(row.valueA, row.valueB);
                const diff = Math.abs(row.valueA - row.valueB);
                const diffText =
                    row.format === "percent"
                        ? formatPercent(diff)
                        : formatNumber(diff);
                // diff value is to the left of the arrow icon
                const diffPart =
                    indicator === "higher"
                        ? `+${diffText} ▲`
                        : indicator === "lower"
                          ? `-${diffText} ▼`
                          : "";
                rows.push({
                    label: normalize(row.label),
                    diffPart,
                    c1:
                        row.format === "percent"
                            ? formatPercent(row.valueA)
                            : formatNumber(row.valueA),
                    c2:
                        row.format === "percent"
                            ? formatPercent(row.valueB)
                            : formatNumber(row.valueB),
                    isSection: false,
                });
            }
        }

        // Column 0 width must fit: label + 1 gap + diffPart (or just label for equal/section rows)
        const w0 = Math.max(
            3,
            ...rows.map((r) =>
                r.diffPart ? r.label.length + 1 + r.diffPart.length : r.label.length,
            ),
        );
        const w1 = Math.max(3, ...rows.map((r) => r.c1.length));
        const w2 = Math.max(3, ...rows.map((r) => r.c2.length));
        const divider = `| ${"-".repeat(w0)} | ${"-".repeat(w1)} | ${"-".repeat(w2)} |`;

        // Render column 0: label left-aligned, diffPart right-aligned within w0
        const renderC0 = (r: Row) =>
            r.diffPart
                ? r.label.padEnd(w0 - r.diffPart.length) + r.diffPart
                : r.label.padEnd(w0);

        const lines: string[] = [];
        for (const row of rows) {
            if (row.isSection) {
                lines.push(divider);
                lines.push(
                    `| ${renderC0(row)} | ${row.c1.padEnd(w1)} | ${row.c2.padEnd(w2)} |`,
                );
                lines.push(divider);
            } else {
                lines.push(
                    `| ${renderC0(row)} | ${row.c1.padEnd(w1)} | ${row.c2.padEnd(w2)} |`,
                );
            }
        }
        lines.push(divider);
        return lines.join("\n");
    }

    $: compareText = buildCompareText(sections, activeSide, labelA, labelB);

    $: codeblockFull = `${codeblockHeader}\n\`\`\`\n${compareText}\n\`\`\``;

    export async function copy(): Promise<void> {
        try {
            await navigator.clipboard.writeText(codeblockFull);
            showToast($t("toast.copied"));
        } catch {
            const fallback = document.createElement("textarea");
            fallback.value = codeblockFull;
            fallback.setAttribute("readonly", "true");
            fallback.style.position = "fixed";
            fallback.style.opacity = "0";
            document.body.appendChild(fallback);
            fallback.select();
            const copied = document.execCommand("copy");
            document.body.removeChild(fallback);
            if (copied) {
                showToast($t("toast.copied"));
            } else {
                showToast($t("toast.unableToCopy"), { tone: "negative" });
            }
        }
    }

    export async function share(): Promise<void> {
        const result = await shareTextNative(codeblockFull);
        if (result === "copied") {
            showToast($t("share.fallbackCopiedToast"));
        } else if (result === "failed") {
            showToast($t("share.shareFailedToast"), { tone: "negative" });
        }
    }
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
                    <td colspan="3">
                        <div class="compare-table__first-header-inner">
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
                            <span class="compare-table__header-label-text">{labelA}</span>
                        </div>
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
                {@const absDiff = Math.abs(row.valueA - row.valueB)}
                {@const diffText = row.format === "percent" ? formatPercent(absDiff) : formatNumber(absDiff)}
                <tr class="compare-table__row">
                    <td class="compare-table__label">{row.label}</td>
                    <td class="compare-table__indicator">
                        {#if indicator === "higher"}<span class="compare-table__indicator-inner"><span>+{diffText}</span><span>▲</span></span>{:else if indicator === "lower"}<span class="compare-table__indicator-inner"><span>-{diffText}</span><span>▼</span></span>{:else}–{/if}
                    </td>
                    <td
                        class="compare-table__value-a"
                        class:value-higher={activeSide === "a" && indicator === "higher"}
                        class:value-lower={activeSide === "a" && indicator === "lower"}
                    >
                        {row.format === "percent"
                            ? formatPercent(row.valueA)
                            : formatNumber(row.valueA)}
                    </td>
                    <td
                        class="compare-table__value-b"
                        class:value-higher={activeSide === "b" && indicator === "higher"}
                        class:value-lower={activeSide === "b" && indicator === "lower"}
                    >
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

    .compare-table__first-header-inner {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
    }

    .compare-table__first-header-inner .compare-table__header-content {
        flex: 0 0 auto;
    }

    .compare-table__first-header-inner .compare-table__header-label-text {
        flex: 1 1 0;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: right;
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        color: var(--text-disabled);
        letter-spacing: initial;
    }

    .compare-table__header-label {
        text-align: right;
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        color: var(--text-disabled);
        vertical-align: middle;
    }

    /* Active label: accent color + bold */
    .active-a .compare-table__first-header-inner .compare-table__header-label-text {
        color: var(--accent);
    }

    .active-b .compare-table__header-label--right .compare-table__header-label-text {
        color: var(--accent);
    }

    /* Right label: truncate with ellipsis */
    .compare-table__header-label--right .compare-table__header-label-text {
        display: block;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        color: var(--text-disabled);
        letter-spacing: initial;
    }

    .compare-table__row td {
        padding: var(--spacing-sm) var(--spacing-md);
        border-top: var(--border-width) solid var(--border-subtle);
    }

    .compare-table__label {
        width: 100%;
        color: var(--text-muted);
    }

    .compare-table__indicator {
        white-space: nowrap;
        text-align: right;
        font-size: var(--font-xs);
        color: var(--text-muted);
    }

    .compare-table__indicator-inner {
        display: inline-flex;
        align-items: center;
        gap: 0.25em;
    }


    .compare-table__value-a,
    .compare-table__value-b {
        width: 1px;
        white-space: nowrap;
        text-align: right;
        font-weight: var(--weight-bold);
        font-variant-numeric: tabular-nums;
        color: var(--text);
    }

    .active-a .compare-table__value-a,
    .active-b .compare-table__value-b {
        background: var(--surface);
    }

    .value-higher {
        color: var(--accent);
    }

    .value-lower {
        color: var(--accent-danger);
    }
</style>
