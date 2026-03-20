<script lang="ts">
    import { onMount } from "svelte";
    import {
        CaretUpIcon,
        CaretDoubleUpIcon,
        CaretLineUpIcon,
    } from "phosphor-svelte";
    import {
        nodePrimaryAction,
        NodePrimaryAction,
        isNodePrimaryAction,
    } from "./nodePrimaryActionStore";
    import { triggerHaptic } from "./hapticsStore";
    import { t } from "svelte-whisper";
    import { getInputLabel, getKeyboardActionLabel } from "./input";
    import Button from "./Button.svelte";

    let isTouchPlatform = false;

    onMount(() => {
        const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
        const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
        isTouchPlatform =
            !hasFinePointer &&
            (hasCoarsePointer || navigator.maxTouchPoints > 0);
    });

    const ICONS = {
        [NodePrimaryAction.IncrementOne]: CaretUpIcon,
        [NodePrimaryAction.IncrementTen]: CaretDoubleUpIcon,
        [NodePrimaryAction.IncrementTier]: CaretLineUpIcon,
    };

    const LABEL_KEYS: Record<NodePrimaryAction, string> = {
        [NodePrimaryAction.IncrementOne]: "nodeMenu.incrementOne",
        [NodePrimaryAction.IncrementTen]: "nodeMenu.incrementTen",
        [NodePrimaryAction.IncrementTier]: "nodeMenu.incrementTierShort",
    };

    const FULL_LABEL_KEYS: Record<NodePrimaryAction, string> = {
        [NodePrimaryAction.IncrementOne]: "nodeMenu.incrementOne",
        [NodePrimaryAction.IncrementTen]: "nodeMenu.incrementTen",
        [NodePrimaryAction.IncrementTier]: "nodeMenu.incrementTier",
    };

    $: currentAction = $nodePrimaryAction;
    $: icon = ICONS[currentAction];
    $: label = $t(LABEL_KEYS[currentAction]);
    $: fullLabel = $t(FULL_LABEL_KEYS[currentAction]);
    $: shortcutKey = getKeyboardActionLabel("cyclePrimaryAction", $t);

    $: settingLabel = $t("settings.nodePrimaryActionTitle", {
        primaryAction: getInputLabel(
            "primary",
            null,
            isTouchPlatform ? "touch" : "mouse",
            $t,
        ),
    });

    $: ariaLabel = `${settingLabel}: ${fullLabel}`;

    function cycle() {
        const next = ((currentAction + 1) % 3) as NodePrimaryAction;
        if (!isNodePrimaryAction(next)) return;
        nodePrimaryAction.set(next);
        triggerHaptic();
    }
</script>

<Button
    class="primary-action-indicator"
    aria-label={ariaLabel}
    tooltipText={ariaLabel}
    shortcut={shortcutKey}
    {icon}
    iconSize={16}
    iconWeight="bold"
    flashOnAction="cyclePrimaryAction"
    on:click={cycle}
>
    {label}
</Button>

<style>
    :global(.primary-action-indicator) {
        border-radius: 999px !important;
        min-width: 63px !important;
        padding: 0 var(--spacing-md) !important;
        gap: var(--spacing-sm) !important;
        font-size: var(--font-sm) !important;
        font-weight: var(--weight-bold) !important;
        letter-spacing: var(--tracking) !important;
    }
</style>
