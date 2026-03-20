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
    import { tooltip } from "./tooltip";
    import { t } from "svelte-whisper";
    import { getInputLabel, getKeyboardActionLabel, buildShortcutTooltip } from "./input";
    import { shortcutFlashFor } from "./input/shortcutFlashStore";

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

    const flashStore = shortcutFlashFor("cyclePrimaryAction");

    $: currentAction = $nodePrimaryAction;
    $: icon = ICONS[currentAction];
    $: label = $t(LABEL_KEYS[currentAction]);
    $: fullLabel = $t(FULL_LABEL_KEYS[currentAction]);
    $: shortcutKey = getKeyboardActionLabel("cyclePrimaryAction", $t);

    $: settingLabel = $t("settings.nodePrimaryActionTitle", {
        primaryAction: getInputLabel(
            "primary",
            "none",
            isTouchPlatform ? "touch" : "mouse",
            $t,
        ),
    });

    $: ariaLabel = `${settingLabel}: ${fullLabel}`;
    $: tooltipContent = buildShortcutTooltip(ariaLabel, shortcutKey);

    function cycle() {
        const next = ((currentAction + 1) % 3) as NodePrimaryAction;
        if (!isNodePrimaryAction(next)) return;
        nodePrimaryAction.set(next);
        triggerHaptic();
    }

    function handleClick() {
        cycle();
    }
</script>

<button
    class="primary-action-indicator"
    class:primary-action-indicator--flash={$flashStore}
    type="button"
    aria-label={ariaLabel}
    use:tooltip={tooltipContent}
    on:click={handleClick}
>
    <svelte:component this={icon} size={16} weight="bold" />
    <span class="primary-action-indicator__label">{label}</span>
</button>

<style>
    .primary-action-indicator {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-sm);
        height: 38px;
        min-width: 68px;
        padding: 0 var(--spacing-md);
        border-radius: 999px;
        border: var(--border-width) solid var(--border);
        background: var(--bg-raised);
        color: var(--text-muted);
        font-family: inherit;
        font-size: var(--font-sm);
        font-weight: var(--weight-bold);
        letter-spacing: var(--tracking);
        white-space: nowrap;
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        transition:
            transform var(--ease),
            filter var(--ease);
    }

    .primary-action-indicator:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    .primary-action-indicator:active {
        filter: var(--brightness-hover);
        transform: scale(0.96);
    }

    @media (hover: hover) {
        .primary-action-indicator:hover {
            filter: var(--brightness-hover);
        }
    }

    .primary-action-indicator--flash {
        filter: brightness(1.4);
        transform: scale(0.85);
    }

    .primary-action-indicator__label {
        line-height: var(--leading);
    }
</style>
