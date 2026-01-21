<script lang="ts">
  import { RotateCcw } from "lucide-svelte";
  import Button from "../Button.svelte";
  import { openModal } from "../modalStore";
  import type { LevelsById } from "../treeLevelsStore";

  export let onReset: (() => void) | null = null;
  export let onPress: (() => void) | null = null;
  export let levelsById: LevelsById | null = null;
  export let treeLabel = "";

  const sumLevels = (levels: LevelsById | null) =>
    Object.values(levels ?? {}).reduce((total, value) => total + value, 0);

  $: totalLevels = levelsById ? sumLevels(levelsById) : null;
  $: disabled = !onReset || (totalLevels !== null && totalLevels === 0);
  $: trimmedTreeLabel = treeLabel.trim();
  $: treeName = trimmedTreeLabel ? `${trimmedTreeLabel} tree` : "tree";
  $: modalTitle = trimmedTreeLabel
    ? `RESET ${trimmedTreeLabel} TREE?`
    : "RESET TREE?";
  $: confirmText = trimmedTreeLabel ? `Reset ${trimmedTreeLabel}` : "Reset";

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
    queueMicrotask(() => {
      onPress?.();
    });
  };
</script>

<Button
  on:click={handleReset}
  tooltipText={`Revert ${treeName} nodes to level 0 and refund Tech Crystals in tree`}
  icon={RotateCcw}
  negative
  {disabled}
>
  Reset tree
</Button>
