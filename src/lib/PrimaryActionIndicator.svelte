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
    import { showToast } from "./toast";
    import { tooltip } from "./tooltip";
    import { t } from "svelte-whisper";
    import { getInputLabel, getKeyboardActionLabel, buildShortcutTooltip } from "./input";

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

    function labelKey(action: NodePrimaryAction): string {
        switch (action) {
            case NodePrimaryAction.IncrementOne:
                return "nodeMenu.incrementOne";
            case NodePrimaryAction.IncrementTen:
                return "nodeMenu.incrementTen";
            case NodePrimaryAction.IncrementTier:
                return "nodeMenu.incrementTier";
        }
    }

    $: currentAction = $nodePrimaryAction;
    $: icon = ICONS[currentAction];
    $: label = $t(labelKey(currentAction));
    $: shortcutKey = getKeyboardActionLabel("cyclePrimaryAction", $t);

    $: settingLabel = $t("settings.nodePrimaryActionTitle", {
        primaryAction: getInputLabel(
            "primary",
            "none",
            isTouchPlatform ? "touch" : "mouse",
            $t,
        ),
    });

    $: ariaLabel = `${settingLabel}: ${label}`;
    $: tooltipContent = buildShortcutTooltip(ariaLabel, shortcutKey);

    export function cycle() {
        const next = ((currentAction + 1) % 3) as NodePrimaryAction;
        if (!isNodePrimaryAction(next)) return;
        nodePrimaryAction.set(next);
        triggerHaptic();
        const nextLabel = $t(labelKey(next));
        showToast(`${settingLabel}: ${nextLabel}`);
    }

    function handleClick() {
        cycle();
    }
</script>

<button
    class="primary-action-indicator"
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
        padding: 0 var(--spacing-md);
        border-radius: 999px;
        border: var(--border-width) solid
            color-mix(in srgb, var(--accent) 28%, var(--border));
        background: color-mix(in srgb, var(--accent) 12%, var(--bg-raised));
        color: color-mix(in srgb, var(--accent) 60%, var(--text));
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
            background var(--ease),
            border-color var(--ease),
            color var(--ease),
            scale var(--ease);
    }

    .primary-action-indicator:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    .primary-action-indicator:active {
        scale: 0.95;
    }

    @media (hover: hover) {
        .primary-action-indicator:hover {
            background: color-mix(in srgb, var(--accent) 20%, var(--bg-raised));
        }
    }

    .primary-action-indicator__label {
        line-height: var(--leading);
    }
</style>
