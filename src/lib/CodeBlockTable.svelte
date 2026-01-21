<script lang="ts">
  import { showToast } from "./toast";
  import appPackage from "../../package.json";

  export let headers: [string, string] = ["Column A", "Column B"];
  export let rows: Array<[string, string]> = [];
  export let emptyMessage = "No data";

  const appName = (appPackage?.name ?? "Backpack Planner") as string;
  const appGithubUrl = (appPackage?.github ?? undefined) as string | undefined;

  const normalizeCell = (value: string) =>
    value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();

  const padCell = (value: string, width: number) => value.padEnd(width, " ");
  const getColumnWidths = (
    headerValues: [string, string],
    rowValues: Array<[string, string]>,
  ): [number, number] => {
    let widths: [number, number] = [
      headerValues[0].length,
      headerValues[1].length,
    ];
    for (const [first, second] of rowValues) {
      widths = [
        Math.max(widths[0], first.length),
        Math.max(widths[1], second.length),
      ];
    }
    return widths;
  };

  $: displayRows = rows.length > 0 ? rows : [[emptyMessage, ""]];
  $: normalizedHeaders = headers.map((value) => normalizeCell(value)) as [
    string,
    string,
  ];
  $: normalizedRows = displayRows.map(([first, second]) => [
    normalizeCell(first),
    normalizeCell(second),
  ]) as Array<[string, string]>;
  $: columnWidths = getColumnWidths(normalizedHeaders, normalizedRows);
  $: headerRow = `| ${padCell(
    normalizedHeaders[0],
    columnWidths[0],
  )} | ${padCell(normalizedHeaders[1], columnWidths[1])} |`;
  $: dividerRow = `| ${"-".repeat(Math.max(3, columnWidths[0]))} | ${"-".repeat(
    Math.max(3, columnWidths[1]),
  )} |`;
  $: markdownRows = normalizedRows.map(
    ([first, second]) =>
      `| ${padCell(first, columnWidths[0])} | ${padCell(
        second,
        columnWidths[1],
      )} |`,
  );
  $: markdownTable = [headerRow, dividerRow, ...markdownRows].join("\n");
  $: codeblockFooter = `-# ${
    appGithubUrl ? `[${appName}](${appGithubUrl})` : appName
  }`;
  $: codeblockText = `\`\`\`\n${markdownTable}\n\`\`\`\n${codeblockFooter}`;

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
          <td>{row[0]}</td>
          <td>{row[1]}</td>
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
</style>
