<script lang="ts">
    import { showToast } from "./toast";
    import { shareTextNative } from "./buildData/share";
    import appPackage from "../../package.json";
    import { t } from "svelte-whisper";

    export let rows: Array<
        [string | { text: string; icon?: any; iconWeight?: string }, string]
    > = [];
    export let emptyMessage = "";

    const appProductionUrl = (appPackage?.app?.productionUrl ?? undefined) as
        | string
        | undefined;

    const normalizeCell = (value: string) =>
        value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();

    const padCell = (value: string, width: number) => value.padEnd(width, " ");
    const getColumnWidths = (
        rowValues: Array<[string, string]>,
        minWidths: [number, number],
    ): [number, number] => {
        let widths: [number, number] = [minWidths[0], minWidths[1]];
        for (const [first, second] of rowValues) {
            widths = [
                Math.max(widths[0], first.length),
                Math.max(widths[1], second.length),
            ];
        }
        return widths;
    };

    $: resolvedEmptyMessage = emptyMessage || $t("statistics.noData");
    $: displayRows = rows.length > 0 ? rows : [[resolvedEmptyMessage, ""]];
    $: normalizedRows = displayRows.map(([first, second]) => [
        normalizeCell(typeof first === "string" ? first : first.text),
        normalizeCell(second),
    ]) as Array<[string, string]>;
    $: dataRows = normalizedRows.filter(([, second]) => second !== "");
    $: columnWidths = getColumnWidths(dataRows, [3, 3]);
    $: sectionTitles = normalizedRows
        .filter(([, second]) => second === "")
        .map(([title]) => title.length);
    $: sectionWidth = Math.max(
        columnWidths[0] + columnWidths[1] + 3,
        sectionTitles.length > 0 ? Math.max(...sectionTitles) : 0,
    );
    $: dividerRow = `| ${"-".repeat(Math.max(3, sectionWidth))} |`;
    $: markdownRows = normalizedRows.flatMap(([first, second]) => {
        if (second === "") {
            return [
                dividerRow,
                `| ${padCell(first, sectionWidth)} |`,
                dividerRow,
            ];
        }
        return [
            `| ${padCell(first, columnWidths[0])} | ${padCell(
                second,
                columnWidths[1],
            )} |`,
        ];
    });
    $: markdownTable =
        markdownRows.length > 0
            ? [...markdownRows, dividerRow].join("\n")
            : dividerRow;
    const backpackIcon = "🎒";
    $: localizedAppName = $t("app.name");
    $: codeblockTitle = appProductionUrl
        ? `[${localizedAppName}](${appProductionUrl})`
        : localizedAppName;
    $: codeblockHeader = `### ${backpackIcon} ${codeblockTitle} ${$t("statistics.header")}`;
    $: codeblockText = `${codeblockHeader}\n\`\`\`\n${markdownTable}\n\`\`\``;

    async function copyCodeblock() {
        try {
            await navigator.clipboard.writeText(codeblockText);
            showToast($t("toast.copied"));
        } catch (error) {
            const fallback = document.createElement("textarea");
            fallback.value = codeblockText;
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

    export async function copy() {
        await copyCodeblock();
    }

    export async function share() {
        const result = await shareTextNative(codeblockText);
        if (result === "copied") {
            showToast($t("share.fallbackCopiedToast"));
        } else if (result === "failed") {
            showToast($t("share.shareFailedToast"), { tone: "negative" });
        }
    }
</script>

<div class="codeblock-table">
    <table class="codeblock-table__table">
        <tbody>
            {#each displayRows as row}
                <tr>
                    {#if row[1] === ""}
                        <td class="codeblock-table__section" colspan="2">
                            {#if typeof row[0] === "object" && row[0].icon}
                                <div class="codeblock-table__section-inner">
                                    <svelte:component
                                        this={row[0].icon}
                                        weight={row[0].iconWeight || "regular"}
                                        size="1.2em"
                                    />
                                    <span>{row[0].text}</span>
                                </div>
                            {:else}
                                {typeof row[0] === "string"
                                    ? row[0]
                                    : row[0].text}
                            {/if}
                        </td>
                    {:else}
                        <td
                            >{typeof row[0] === "string"
                                ? row[0]
                                : row[0].text}</td
                        >
                        <td>{row[1]}</td>
                    {/if}
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    .codeblock-table {
        display: grid;
        gap: var(--spacing-md);
    }

    .codeblock-table__table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: var(--font-base);
    }

    .codeblock-table__table td {
        border-top: var(--border-width) solid var(--border-subtle);
        border-left: var(--border-width) solid var(--border-subtle);
        padding: var(--spacing-sm) var(--spacing-md);
        text-align: left;
    }

    .codeblock-table__table tbody tr:first-child td {
        border-top: none;
    }

    .codeblock-table__table td:first-child {
        border-left: none;
    }

    .codeblock-table__table tbody {
        color: var(--text-muted);
    }

    .codeblock-table__section {
        background: color-mix(in srgb, var(--accent) 12%, var(--bg-input));
        color: var(--text-on-tinted);
        font-weight: var(--weight-bold);
        letter-spacing: var(--tracking);
        border-left: 2px solid color-mix(in srgb, var(--accent) 60%, transparent) !important;
    }

    .codeblock-table__section-inner {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
    }

    .codeblock-table__section-inner :global(svg) {
        color: var(--accent-light);
    }

    .codeblock-table__table td + td {
        text-align: right;
        color: var(--accent-light);
        font-weight: var(--weight-semibold);
        font-variant-numeric: tabular-nums;
    }
</style>
