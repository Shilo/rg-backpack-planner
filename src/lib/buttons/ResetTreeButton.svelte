<script lang="ts">
  import { RotateCcw } from "lucide-svelte";
  import Button from "../Button.svelte";
  import type { LevelsById } from "../treeLevelsStore";

  export let onReset: (() => void) | null = null;
  export let levelsById: LevelsById | null = null;

  const sumLevels = (levels: LevelsById | null) =>
    Object.values(levels ?? {}).reduce((total, value) => total + value, 0);

  $: totalLevels = levelsById ? sumLevels(levelsById) : null;
  $: disabled = !onReset || (totalLevels !== null && totalLevels === 0);
</script>

<Button
  on:click={() => onReset?.()}
  toastMessage={onReset ? "Tree reset" : undefined}
  toastNegative
  tooltipText={"Revert tree nodes to level 0 and refund all Tech Crystals"}
  icon={RotateCcw}
  negative
  {disabled}
>
  Reset tree
</Button>
