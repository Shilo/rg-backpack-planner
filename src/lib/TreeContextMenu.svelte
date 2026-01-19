<script lang="ts">
  import ContextMenu from "./ContextMenu.svelte";
  import TreeContextMenuList from "./TreeContextMenuList.svelte";

  export let tabId = "";
  export let tabLabel = "";
  export let x = 0;
  export let y = 0;
  export let isOpen = false;
  export let onClose: (() => void) | null = null;
  export let onFocusInView: ((tabId: string) => void) | null = null;
  export let onResetNodes: ((tabId: string) => void) | null = null;
</script>

<ContextMenu
  {x}
  {y}
  {isOpen}
  title={tabLabel || "Tab actions"}
  ariaLabel={`Tab actions${tabLabel ? `: ${tabLabel}` : ""}`}
  {onClose}
>
  <TreeContextMenuList
    onFocusInView={() => onFocusInView?.(tabId)}
    onResetNodes={() => onResetNodes?.(tabId)}
    showResetNodes={true}
  />
</ContextMenu>
