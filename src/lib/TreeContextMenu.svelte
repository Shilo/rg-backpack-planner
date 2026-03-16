<script lang="ts">
    import ContextMenu from "./ContextMenu.svelte";
    import TreeContextMenuList from "./TreeContextMenuList.svelte";
    import type { TreeViewState } from "./Tree.svelte";
    import type { Node, LevelsByIndex } from "../types/tree";
    import type { TreeBranchKey } from "./treeLevelsStore";
    import { t } from "svelte-whisper";

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
    export let onResetBranch: ((branch: TreeBranchKey) => void) | null = null;
    export let hideViewOptions = false;

    // Capture the tab id when the menu opens so closing it won't clear callbacks.
    let menuTabId = "";
    $: if (isOpen) {
        menuTabId = tabId;
    }

    $: title = tabLabel
        ? $t("trees.named", { label: tabLabel })
        : $t("trees.generic");
</script>

<ContextMenu
    {x}
    {y}
    {isOpen}
    title=""
    ariaLabel={title}
    {onClose}
    ignoreCloseTargetSelector={hideViewOptions ? ".tabs-bar" : null}
    touchAnchorAbove={true}
>
    <div class="menu-content">
        <TreeContextMenuList
            onFocusInView={() => onFocusInView?.(menuTabId)}
            onReset={() => onReset?.(menuTabId)}
            onResetBranch={onResetBranch}
            onButtonPress={onClose}
            {tabId}
            {tabLabel}
            {hideViewOptions}
            {levelsById}
            {viewState}
            {focusViewState}
            {tabIndex}
            {nodes}
        />
    </div>
</ContextMenu>

<style>
    .menu-content {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        width: min-content;
        min-width: 15rem;
        align-items: stretch;
    }
</style>
