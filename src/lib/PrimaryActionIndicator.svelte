<script lang="ts">
    import { onMount } from "svelte";
    import type { Component } from "svelte";
    import {
        CaretUpIcon,
        CaretDoubleUpIcon,
        CaretLineUpIcon,
        CaretDownIcon,
        CaretDoubleDownIcon,
        CaretLineDownIcon,
    } from "phosphor-svelte";
    import {
        nodePrimaryAction,
        NodePrimaryAction,
        isNodePrimaryAction,
    } from "./nodePrimaryActionStore";
    import { triggerHaptic } from "./hapticsStore";
    import { t } from "svelte-whisper";
    import {
        getInputLabel,
        getKeyboardActionLabel,
        inputStore,
        resolveModifiers,
    } from "./input";
    import Button from "./Button.svelte";

    let isTouchPlatform = false;

    onMount(() => {
        const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
        const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
        isTouchPlatform =
            !hasFinePointer &&
            (hasCoarsePointer || navigator.maxTouchPoints > 0);
    });

    type EffectiveAction = {
        icon: Component;
        labelKey: string;
        fullLabelKey: string;
    };

    const INCREMENT_ACTIONS: Record<NodePrimaryAction, EffectiveAction> = {
        [NodePrimaryAction.IncrementOne]: {
            icon: CaretUpIcon,
            labelKey: "nodeMenu.incrementOne",
            fullLabelKey: "nodeMenu.incrementOne",
        },
        [NodePrimaryAction.IncrementTen]: {
            icon: CaretDoubleUpIcon,
            labelKey: "nodeMenu.incrementTen",
            fullLabelKey: "nodeMenu.incrementTen",
        },
        [NodePrimaryAction.IncrementTier]: {
            icon: CaretLineUpIcon,
            labelKey: "nodeMenu.incrementTierShort",
            fullLabelKey: "nodeMenu.incrementTier",
        },
    };

    const DECREMENT_ACTIONS: Record<NodePrimaryAction, EffectiveAction> = {
        [NodePrimaryAction.IncrementOne]: {
            icon: CaretDownIcon,
            labelKey: "nodeMenu.decrementOne",
            fullLabelKey: "nodeMenu.decrementOne",
        },
        [NodePrimaryAction.IncrementTen]: {
            icon: CaretDoubleDownIcon,
            labelKey: "nodeMenu.decrementTen",
            fullLabelKey: "nodeMenu.decrementTen",
        },
        [NodePrimaryAction.IncrementTier]: {
            icon: CaretLineDownIcon,
            labelKey: "nodeMenu.decrementTierShort",
            fullLabelKey: "nodeMenu.decrementTier",
        },
    };

    /** Alternate toggles between +1 and +Tier (if primary is +1, alternate is +Tier; otherwise +1). */
    function getAlternateAction(primary: NodePrimaryAction): NodePrimaryAction {
        return primary === NodePrimaryAction.IncrementOne
            ? NodePrimaryAction.IncrementTier
            : NodePrimaryAction.IncrementOne;
    }

    $: currentAction = $nodePrimaryAction;
    $: modifiers = resolveModifiers($inputStore);
    $: isReverse = modifiers.reverse;
    $: isAlternate = modifiers.alternate;
    $: hasModifier = isReverse || isAlternate;

    $: effectiveAction = isAlternate
        ? getAlternateAction(currentAction)
        : currentAction;
    $: effective = (isReverse ? DECREMENT_ACTIONS : INCREMENT_ACTIONS)[
        effectiveAction
    ];

    $: icon = effective.icon;
    $: label = $t(effective.labelKey);
    $: fullLabel = $t(effective.fullLabelKey);
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
    class="primary-action-indicator {hasModifier ? 'modifier-active' : ''}"
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
        font-size: var(--font-lg) !important;
        font-weight: var(--weight-bold) !important;
        letter-spacing: var(--tracking) !important;
    }

    :global(.primary-action-indicator.modifier-active) {
        background: var(--bg-tinted) !important;
        border-color: var(--accent) !important;
        box-shadow: 0 0 12px color-mix(in oklch, var(--accent) 40%, transparent);
    }
</style>
