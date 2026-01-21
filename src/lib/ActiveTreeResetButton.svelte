<script lang="ts">
  import { RotateCcw } from "lucide-svelte";
  import Button from "./Button.svelte";
  import { openModal } from "./modalStore";

  export let onReset: (() => void) | null = null;
  export let treeLabel = "";
  export let canReset = false;

  $: trimmedTreeLabel = treeLabel.trim();
  $: treeName = trimmedTreeLabel ? `${trimmedTreeLabel} tree` : "tree";
  $: modalTitle = trimmedTreeLabel
    ? `RESET ${trimmedTreeLabel} TREE?`
    : "RESET TREE?";
  $: confirmText = trimmedTreeLabel ? `Reset ${trimmedTreeLabel}` : "Reset";
  $: showReset = canReset && !!onReset;

  const handleReset = () => {
    if (!onReset) return;
    openModal({
      type: "confirm",
      title: modalTitle,
      titleIcon: RotateCcw,
      message: `Revert ${treeName} nodes to level 0 and refund Tech Crystals in tree.`,
      confirmLabel: confirmText,
      cancelLabel: "Cancel",
      confirmNegative: true,
      onConfirm: () => {
        onReset();
      },
    });
  };
</script>

{#if showReset}
  <Button
    class="active-tree-reset"
    type="button"
    aria-label={`Revert ${treeName} nodes to level 0 and refund Tech Crystals in tree.`}
    tooltipText={`Revert ${treeName} nodes to level 0 and refund Tech Crystals in tree.`}
    icon={RotateCcw}
    iconClass="active-tree-reset__icon"
    negative
    on:click={handleReset}
  />
{/if}

<style>
  :global(.active-tree-reset) {
    border-radius: 999px !important;
  }
</style>
