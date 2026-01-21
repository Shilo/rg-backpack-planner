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
    {hideView0ptions}
    {levelsById}
    {viewState}
    {focusViewState}
  />
</ContextMenu>
