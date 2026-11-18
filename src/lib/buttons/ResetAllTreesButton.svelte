<script lang="ts">
    import type { Component } from "svelte";
    import { ArrowsCounterClockwiseIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import { openModal } from "../modalStore";
    import { sumLevels } from "../treeLevelsStore";
    import type { LevelsByIndex } from "../../types/tree";
    import { t } from "svelte-whisper";

    export let onResetAll: (() => void) | null = null;
    export let levelsByTree: LevelsByIndex[] | null = null;

    $: totalLevels = (levelsByTree ?? []).reduce(
        (total, levels) => total + sumLevels(levels),
        0,
    );
    $: disabled = !onResetAll || totalLevels === 0;

    const handleResetAll = () => {
        if (!onResetAll) return;
        openModal({
            type: "confirm",
            title: $t("modal.resetTree.titleAll"),
            titleIcon: ArrowsCounterClockwiseIcon as unknown as Component,
            message: $t("modal.resetTree.messageAll"),
            confirmLabel: $t("modal.resetTree.buttonLabelAll"),
            cancelLabel: $t("common.cancel"),
            confirmNegative: true,
            onConfirm: () => {
                onResetAll();
            },
        });
    };
</script>

<Button
    on:click={handleResetAll}
    description={$t("settings.resetAllTreesDescription")}
    icon={ArrowsCounterClockwiseIcon}
    arrow="right"
    negative
    {disabled}
>
    {$t("modal.resetTree.buttonLabelAll")}
</Button>
