<script lang="ts">
  import { Copy } from "lucide-svelte";
  import Button from "./Button.svelte";
  import { showToast } from "./toast";

  export let headers: [string, string] = ["Column A", "Column B"];
  export let rows: Array<[string, string]> = [];
  export let emptyMessage = "No data";
  export let copyLabel = "Copy";

  const normalizeCell = (value: string) =>
    value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();

  $: displayRows = rows.length > 0 ? rows : [[emptyMessage, ""]];
  $: headerRow = `| ${normalizeCell(headers[0])} | ${normalizeCell(
    headers[1],
  )} |`;
  $: dividerRow = "| --- | --- |";
  $: markdownRows = displayRows.map(
    ([first, second]) =>
      `| ${normalizeCell(first)} | ${normalizeCell(second)} |`,
  );
  $: markdownTable = [headerRow, dividerRow, ...markdownRows].join("\n");
  $: codeblockText = `\`\`\`\n${markdownTable}\n\`\`\``;

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
</script>

<div class="codeblock-table">
  <table class="codeblock-table__table">
    <thead>
      <tr>
        <th>{headers[0]}</th>
        <th>
          <div class="codeblock-table__th">
            <span>{headers[1]}</span>
            <Button
              class="codeblock-table__copy"
              small
              icon={Copy}
              on:click={copyCodeblock}
              tooltipText={copyLabel}
              aria-label={copyLabel}
            />
          </div>
        </th>
      </tr>
    </thead>
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
    border-collapse: collapse;
    font-size: 0.8rem;
  }

  .codeblock-table__table th,
  .codeblock-table__table td {
    border: 1px solid rgba(74, 110, 184, 0.35);
    padding: 6px 8px;
    text-align: left;
  }

  .codeblock-table__table thead {
    background: rgba(15, 23, 42, 0.6);
    color: #dbe6ff;
  }

  .codeblock-table__table tbody {
    color: #c8d7ff;
  }

  .codeblock-table__th {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  :global(.codeblock-table__copy) {
    margin-left: auto;
    white-space: nowrap;
    padding: 4px;
    min-height: 24px;
    border-radius: 8px;
    background: transparent;
    border-color: transparent;
    color: #a7b7e6;
  }

  :global(.codeblock-table__copy:hover) {
    background: rgba(15, 23, 42, 0.4);
    border-color: rgba(74, 110, 184, 0.35);
    color: #dbe6ff;
  }

  :global(.codeblock-table__copy:active) {
    transform: scale(0.96);
  }
</style>
