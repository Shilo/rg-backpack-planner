<script lang="ts">
    import type { ComponentType } from "svelte";
    import { ArrowCounterClockwiseIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import { openModal } from "../modalStore";
    import { sumLevels } from "../treeLevelsStore";
    import type { LevelsByIndex } from "../treeRuntime.types";

    export let onReset: (() => void) | null = null;
    export let onPress: (() => void) | null = null;
    export let levelsById: LevelsByIndex | null = null;
    export let treeLabel = "";

    $: totalLevels = levelsById ? sumLevels(levelsById) : null;
    $: disabled = !onReset || (totalLevels !== null && totalLevels === 0);
    $: trimmedTreeLabel = treeLabel.trim();
    $: treeName = trimmedTreeLabel ? `${trimmedTreeLabel} tree` : "tree";
    $: modalTitle = trimmedTreeLabel
        ? `RESET ${trimmedTreeLabel} TREE`
        : "RESET TREE";
    $: confirmText = trimmedTreeLabel ? `Reset ${trimmedTreeLabel}` : "Reset";
    $: buttonText = trimmedTreeLabel
        ? `Reset ${trimmedTreeLabel} tree`
        : "Reset tree";

    const handleReset = () => {
        if (!onReset) return;
        openModal({
            type: "confirm",
            title: modalTitle,
            titleIcon: ArrowCounterClockwiseIcon as unknown as ComponentType,
            message: `Revert ${treeName} nodes to level 0 and refund Tech Crystals in tree.`,
            confirmLabel: confirmText,
            cancelLabel: "Cancel",
            confirmNegative: true,
            onConfirm: () => {
                onReset();
            },
        });
        queueMicrotask(() => {
            onPress?.();
        });
    };
</script>

<Button
    on:click={handleReset}
    tooltipText={`Revert ${treeName} nodes to level 0 and refund Tech Crystals in tree`}
    icon={ArrowCounterClockwiseIcon}
    negative
    {disabled}
>
    {buttonText}
</Button>
