<script lang="ts">
    import { Trash2 } from "lucide-svelte";
    import Button from "../Button.svelte";
    import { openModal } from "../modalStore";
    import { sumLevels, type LevelsById } from "../treeLevelsStore";

    export let onResetAll: (() => void) | null = null;
    export let levelsByTree: LevelsById[] | null = null;

    $: totalLevels = (levelsByTree ?? []).reduce(
        (total, levels) => total + sumLevels(levels),
        0,
    );
    $: disabled = !onResetAll || totalLevels === 0;

    const handleResetAll = () => {
        if (!onResetAll) return;
        openModal({
            type: "confirm",
            title: "RESET ALL TREES?",
            titleIcon: Trash2,
            message:
                "Revert all nodes to level 0 and refund all Tech Crystals.",
            confirmLabel: "Reset all",
            cancelLabel: "Cancel",
            confirmNegative: true,
            onConfirm: () => {
                onResetAll();
            },
        });
    };
</script>

<Button
    on:click={handleResetAll}
    tooltipText={"Revert all nodes to level 0 and refund all Tech Crystals"}
    icon={Trash2}
    negative
    {disabled}
>
    Reset all trees
</Button>
