<script lang="ts">
  import { RotateCcw } from "lucide-svelte";
  import Button from "../Button.svelte";
  import { openModal } from "../modalStore";
  import { showToast } from "../toast";
  import type { LevelsById } from "../treeLevelsStore";

  export let onReset: (() => void) | null = null;
  export let onPress: (() => void) | null = null;
  export let levelsById: LevelsById | null = null;

  const sumLevels = (levels: LevelsById | null) =>
    Object.values(levels ?? {}).reduce((total, value) => total + value, 0);

  $: totalLevels = levelsById ? sumLevels(levelsById) : null;
  $: disabled = !onReset || (totalLevels !== null && totalLevels === 0);

  const handleReset = () => {
    if (!onReset) return;
    onPress?.();
    openModal({
      type: "confirm",
      title: "RESET TREE?",
      titleIcon: RotateCcw,
      message: "Set all nodes to level 0 and refund all Tech Crystals.",
      confirmLabel: "Reset",
      cancelLabel: "Cancel",
      confirmNegative: true,
      onConfirm: () => {
        onReset();
        showToast("Tree reset", { tone: "negative" });
      },
    });
  };
</script>

<Button
  on:click={handleReset}
  tooltipText={"Revert tree nodes to level 0 and refund all Tech Crystals"}
  icon={RotateCcw}
  negative
  {disabled}
>
  Reset tree
</Button>
