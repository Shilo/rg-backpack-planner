<script lang="ts">
  import FocusInViewButton from "./buttons/FocusInViewButton.svelte";
  import ResetTreeButton from "./buttons/ResetTreeButton.svelte";
  import type { TreeViewState } from "./Tree.svelte";
  import type { LevelsById } from "./treeLevelsStore";

  export let onFocusInView: (() => void) | null = null;
  export let onReset: (() => void) | null = null;
  export let viewState: TreeViewState | null = null;
  export let focusViewState: TreeViewState | null = null;
  export let levelsById: LevelsById | null = null;
</script>

<ResetTreeButton {onReset} {levelsById} />
<FocusInViewButton {onFocusInView} {viewState} {focusViewState} />
