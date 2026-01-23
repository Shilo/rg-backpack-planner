<script lang="ts">
  import { ArrowDown, ArrowUp, ChevronsUp, RotateCcw } from "lucide-svelte";
  import Button from "./Button.svelte";
  import ContextMenu from "./ContextMenu.svelte";

  export let nodeId = "";
  export let x = 0;
  export let y = 0;
  export let isOpen = false;
  export let onClose: (() => void) | null = null;
  export let onMax: ((id: string) => void) | null = null;
  export let onReset: ((id: string) => void) | null = null;
  export let onDecrement: ((id: string) => void) | null = null;
  export let onIncrement: ((id: string) => void) | null = null;
</script>

<ContextMenu
  {x}
  {y}
  {isOpen}
  title={nodeId ?? "Node actions"}
  ariaLabel="Node actions"
  {onClose}
>
  <Button
    on:click={() => {
      if (!nodeId || !onMax) return;
      onMax(nodeId);
    }}
    toastMessage={nodeId && onMax ? `Maxed ${nodeId}` : undefined}
    disabled={!nodeId}
    icon={ChevronsUp}
  >
    Max
  </Button>
  <Button
    on:click={() => {
      if (!nodeId || !onIncrement) return;
      onIncrement(nodeId);
    }}
    toastMessage={nodeId && onIncrement ? `Increased ${nodeId}` : undefined}
    disabled={!nodeId}
    icon={ArrowUp}
  >
    Increase
  </Button>
  <Button
    on:click={() => {
      if (!nodeId || !onDecrement) return;
      onDecrement(nodeId);
    }}
    toastMessage={nodeId && onDecrement ? `Decreased ${nodeId}` : undefined}
    disabled={!nodeId}
    icon={ArrowDown}
  >
    Decrease
  </Button>
  <Button
    on:click={() => {
      if (!nodeId || !onReset) return;
      onReset(nodeId);
    }}
    toastMessage={nodeId && onReset ? `Reset ${nodeId}` : undefined}
    toastNegative
    disabled={!nodeId}
    icon={RotateCcw}
    negative
  >
    Reset
  </Button>
</ContextMenu>
