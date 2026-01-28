<script lang="ts">
  import ContextMenu from "./ContextMenu.svelte";
  import TreeContextMenuList from "./TreeContextMenuList.svelte";
  import type { TreeViewState } from "./Tree.svelte";
  import type { Node, LevelsByIndex } from "../types/tree";

  export let tabId = "";
  export let tabLabel = "";
  export let x = 0;
  export let y = 0;
  export let isOpen = false;
  export let tabIndex = -1;
  export let nodes: Node[] = [];
  export let levelsById: LevelsByIndex | null = null;
  export let viewState: TreeViewState | null = null;
  export let focusViewState: TreeViewState | null = null;
  export let onClose: (() => void) | null = null;
  export let onFocusInView: ((tabId: string) => void) | null = null;
  export let onReset: ((tabId: string) => void) | null = null;
  export let hideView0ptions = false;

  // Capture the tab id when the menu opens so closing it won't clear callbacks.
  let menuTabId = "";
  $: if (isOpen) {
    menuTabId = tabId;
  }
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
    onFocusInView={() => onFocusInView?.(menuTabId)}
    onReset={() => onReset?.(menuTabId)}
    onButtonPress={onClose}
    {tabLabel}
    {hideView0ptions}
    {levelsById}
    {viewState}
    {focusViewState}
    {tabIndex}
    {nodes}
  />
</ContextMenu>
