<script lang="ts">
  import ContextMenu from "./ContextMenu.svelte";
  import TreeContextMenuList from "./TreeContextMenuList.svelte";
  import type { TreeViewState } from "./Tree.svelte";
  import type { LevelsById } from "./treeLevelsStore";

  export let tabId = "";
  export let tabLabel = "";
  export let x = 0;
  export let y = 0;
  export let isOpen = false;
  export let levelsById: LevelsById | null = null;
  export let viewState: TreeViewState | null = null;
  export let focusViewState: TreeViewState | null = null;
  export let onClose: (() => void) | null = null;
  export let onFocusInView: ((tabId: string) => void) | null = null;
  export let onReset: ((tabId: string) => void) | null = null;
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
    onReset={() => onReset?.(tabId)}
    {levelsById}
    {viewState}
    {focusViewState}
  />
</ContextMenu>
