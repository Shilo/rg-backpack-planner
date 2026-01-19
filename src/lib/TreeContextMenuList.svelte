<script lang="ts">
  import { Focus, RotateCcw } from "lucide-svelte";
  import Button from "./Button.svelte";

  export let onFocusInView: (() => void) | null = null;
  export let onReset: (() => void) | null = null;
</script>

<Button
  on:click={() => onFocusInView?.()}
  tooltipText={"Fit nodes in view by resetting zoom and pan"}
  icon={Focus}
>
  Focus in view
</Button>
<Button
  on:click={() => onReset?.()}
  tooltipText={"Revert tree nodes to level 0 and refund all Tech Crystals"}
  icon={RotateCcw}
  negative
>
  Reset tree
</Button>
