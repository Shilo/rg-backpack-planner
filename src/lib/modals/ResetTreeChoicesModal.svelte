<script lang="ts">
    import type { Component } from "svelte";
    import { ArrowCounterClockwiseIcon } from "phosphor-svelte";
    import ActionSheet from "../ActionSheet.svelte";
    import type { ActionSheetChoice } from "../actionSheetTypes";
    import type { ResetTreeChoiceConfig } from "../modalStore";
    import type { ResetTreeChoiceId } from "../resetTreeChoiceModel";
    import { t } from "svelte-whisper";

    export let title = "";
    export let sheetIcon: Component | null = null;
    export let message: string | undefined = undefined;
    export let choices: ResetTreeChoiceConfig[] = [];
    export let cancelLabel = "";
    export let onConfirm: ((value: ResetTreeChoiceId) => void) | null = null;
    export let onCancel: (() => void) | null = null;

    $: resolvedCancelLabel = cancelLabel || $t("modal.cancelLabel");
    $: sheetChoices = choices.map((c): ActionSheetChoice => ({
        id: c.id,
        label: c.label,
        description: c.description,
        descriptionPrefix: c.descriptionPrefix,
        descriptionAmount: c.descriptionAmount,
        descriptionSuffix: c.descriptionSuffix,
        tone: c.tone,
        disabled: c.disabled,
    }));
</script>

<ActionSheet
    {title}
    sheetIcon={ArrowCounterClockwiseIcon}
    headerTrailingIcon={sheetIcon}
    {message}
    choices={sheetChoices}
    cancelLabel={resolvedCancelLabel}
    onConfirm={(id) => onConfirm?.(id as ResetTreeChoiceId)}
    {onCancel}
/>
