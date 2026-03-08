<script lang="ts">
    import { ArrowCounterClockwiseIcon } from "phosphor-svelte";
    import Button from "./Button.svelte";
    import { openModal } from "./modalStore";
    import { t } from "svelte-whisper";

    export let onReset: (() => void) | null = null;
    export let treeLabel = "";
    export let canReset = false;

    $: trimmedTreeLabel = treeLabel.trim();
    $: treeName = trimmedTreeLabel
        ? $t("trees.named", { label: trimmedTreeLabel })
        : $t("trees.generic");
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
        animation: reset-btn-enter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    @keyframes reset-btn-enter {
        from {
            opacity: 0;
            transform: scale(0.8);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
</style>
