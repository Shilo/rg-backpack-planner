<script lang="ts">
    import { CubeFocusIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import type { TreeViewState } from "../Tree.svelte";
    import { t } from "svelte-whisper";

    export let onFocusInView: (() => void) | null = null;
    export let onPress: (() => void) | null = null;
    export let viewState: TreeViewState | null = null;
    export let focusViewState: TreeViewState | null = null;

    const POS_EPSILON = 0.5;
    const SCALE_EPSILON = 0.001;

    const isClose = (a: number, b: number, epsilon: number) =>
        Math.abs(a - b) <= epsilon;

    $: isFocused =
        !!viewState &&
        !!focusViewState &&
        isClose(viewState.offsetX, focusViewState.offsetX, POS_EPSILON) &&
        isClose(viewState.offsetY, focusViewState.offsetY, POS_EPSILON) &&
        isClose(viewState.scale, focusViewState.scale, SCALE_EPSILON);
    $: disabled = !onFocusInView || isFocused;
</script>

<Button
    on:click={() => {
        if (!onFocusInView) return;
        onPress?.();
        onFocusInView();
    }}
    tooltipText={$t("settings.focusTreeInViewTooltip")}
    icon={CubeFocusIcon}
    {disabled}
>
    {$t("settings.focusTreeInViewLower")}
</Button>
