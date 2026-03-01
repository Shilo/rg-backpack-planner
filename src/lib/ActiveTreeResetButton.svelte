<script lang="ts">
    import { ArrowCounterClockwiseIcon } from "phosphor-svelte";
    import Button from "./Button.svelte";
    import { openModal } from "./modalStore";
    import { t } from "svelte-whisper";
    import { getTreeName } from "./i18n";

    export let onReset: (() => void) | null = null;
    export let treeLabel = "";
    export let canReset = false;

    $: trimmedTreeLabel = treeLabel.trim();
    $: treeName = getTreeName(trimmedTreeLabel);
    $: modalTitle = trimmedTreeLabel
        ? $t("modal.resetTree.titleQuestion", { treeName })
        : $t("modal.resetTree.titleDefaultQuestion");
    $: confirmText = trimmedTreeLabel
        ? $t("modal.resetTree.confirmLabel", { treeLabel: trimmedTreeLabel })
        : $t("modal.resetTree.confirmLabelDefault");
    $: showReset = canReset && !!onReset;

    const handleReset = () => {
        if (!onReset) return;
        openModal({
            type: "confirm",
            title: modalTitle,
            titleIcon: ArrowCounterClockwiseIcon,
            message: $t("modal.resetTree.message", { treeName }),
            confirmLabel: confirmText,
            cancelLabel: $t("common.cancel"),
            confirmNegative: true,
            onConfirm: () => {
                onReset();
            },
        });
    };
</script>

{#if showReset}
    <Button
        class="active-tree-reset"
        type="button"
        aria-label={$t("modal.resetTree.message", { treeName })}
        tooltipText={$t("modal.resetTree.message", { treeName })}
        icon={ArrowCounterClockwiseIcon}
        iconClass="active-tree-reset__icon"
        negative
        on:click={handleReset}
    />
{/if}

<style>
    :global(.active-tree-reset) {
        border-radius: 999px !important;
    }
</style>
