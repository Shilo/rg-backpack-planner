<script lang="ts">
  import { showToast } from "./toast";
  import appPackage from "../../package.json";

  export let rows: Array<[string, string]> = [];
  export let emptyMessage = "No data";

  const appName = (appPackage?.name ?? "Backpack Planner") as string;
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

  $: displayRows = rows.length > 0 ? rows : [[emptyMessage, ""]];
  $: normalizedRows = displayRows.map(([first, second]) => [
    normalizeCell(first),
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
      return [dividerRow, `| ${padCell(first, sectionWidth)} |`, dividerRow];
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
  $: codeblockTitle = appProductionUrl
    ? `[${appName}](${appProductionUrl})`
    : appName;
  $: codeblockHeader = `### ${backpackIcon} ${codeblockTitle} Statistics`;
  $: codeblockText = `${codeblockHeader}\n\`\`\`\n${markdownTable}\n\`\`\``;

  async function copyCodeblock() {
    try {
      await navigator.clipboard.writeText(codeblockText);
      showToast("Copied");
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
        showToast("Copied");
      } else {
        showToast("Unable to copy", { tone: "negative" });
      }
    }
  }

  export async function copy() {
    await copyCodeblock();
  }
</script>

<div class="codeblock-table">
  <table class="codeblock-table__table">
    <tbody>
      {#each displayRows as row}
        <tr>
          {#if row[1] === ""}
            <td class="codeblock-table__section" colspan="2">{row[0]}</td>
          {:else}
            <td>{row[0]}</td>
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
    gap: 8px;
  }

  .codeblock-table__table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.8rem;
  }

  .codeblock-table__table td {
    border-top: 1px solid rgba(74, 110, 184, 0.35);
    border-left: 1px solid rgba(74, 110, 184, 0.35);
    padding: 6px 8px;
    text-align: left;
  }

  .codeblock-table__table tbody tr:first-child td {
    border-top: none;
  }

  .codeblock-table__table td:first-child {
    border-left: none;
  }

  .codeblock-table__table tbody {
    color: #c8d7ff;
  }

  .codeblock-table__section {
    background: rgba(15, 23, 42, 0.6);
    color: #dbe6ff;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
</style>
