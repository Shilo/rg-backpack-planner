<script lang="ts">
    import { ArrowCounterClockwiseIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import { getTreeIcon } from "../customIcons";
    import { openResetTreeChoicesModal } from "../resetTreeModal";
    import { sumLevels } from "../treeLevelsStore";
    import type { LevelsByIndex } from "../../types/tree";
    import type { Node } from "../../types/tree";
    import type { TreeBranchKey } from "../treeLevelsStore";
    import { t } from "svelte-whisper";

    export let onReset: (() => void) | null = null;
    export let onResetBranch: ((branch: TreeBranchKey) => void) | null = null;
    export let onPress: (() => void) | null = null;
    export let levelsById: LevelsByIndex | null = null;
    export let treeLabel = "";
    export let treeNodes: Node[] = [];
    export let treeId = "";

    $: totalLevels = levelsById ? sumLevels(levelsById) : null;
    $: disabled =
        !onReset ||
        !onResetBranch ||
        (totalLevels !== null && totalLevels === 0);
    $: trimmedTreeLabel = treeLabel.trim();
    $: treeName = trimmedTreeLabel
        ? $t("trees.named", { label: trimmedTreeLabel })
        : $t("trees.generic");
    $: buttonText = trimmedTreeLabel
        ? $t("modal.resetTree.buttonLabel", { treeName })
        : $t("modal.resetTree.buttonLabelDefault");
    $: treeIcon = getTreeIcon(treeId);

    const handleReset = () => {
        if (!onReset || !onResetBranch) return;
        openResetTreeChoicesModal(
            $t,
            treeLabel,
            levelsById,
            {
                onResetTree: onReset,
                onResetBranch,
            },
            treeNodes,
            treeIcon,
        );
        queueMicrotask(() => {
            onPress?.();
        });
    };
</script>

<Button
    on:click={handleReset}
    description={$t("settings.resetTreeDescription")}
    icon={ArrowCounterClockwiseIcon}
    arrow="right"
    negative
    {disabled}
>
    {buttonText}
</Button>
