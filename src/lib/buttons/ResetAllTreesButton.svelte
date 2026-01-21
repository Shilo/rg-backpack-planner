<script lang="ts">
  import { Trash2 } from "lucide-svelte";
  import Button from "../Button.svelte";
  import type { LevelsById } from "../treeLevelsStore";

  export let onResetAll: (() => void) | null = null;
  export let levelsByTree: LevelsById[] | null = null;

  const sumLevels = (levels: LevelsById | null) =>
    Object.values(levels ?? {}).reduce((total, value) => total + value, 0);

  $: totalLevels = (levelsByTree ?? []).reduce(
    (total, levels) => total + sumLevels(levels),
    0,
  );
  $: disabled = !onResetAll || totalLevels === 0;
</script>

<Button
  on:click={() => onResetAll?.()}
  toastMessage={onResetAll ? "All trees reset" : undefined}
  toastNegative
  tooltipText={"Revert all nodes to level 0 and refund Tech Crystals"}
  icon={Trash2}
  negative
  {disabled}
>
  Reset all trees
</Button>
