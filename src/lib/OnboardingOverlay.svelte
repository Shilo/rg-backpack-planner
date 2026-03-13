<script lang="ts">
    import type { Component } from "svelte";
    import { onMount } from "svelte";
    import {
        ArrowsOutCardinalIcon,
        HandGrabbingIcon,
        HandTapIcon,
        MouseLeftClickIcon,
        MouseMiddleClickIcon,
        MouseRightClickIcon,
        MouseScrollIcon,
    } from "phosphor-svelte";
    import LongPressIcon from "./icons/LongPressIcon.svelte";
    import PinchIcon from "./icons/PinchIcon.svelte";
    import Node from "./Node.svelte";
    import { t } from "svelte-whisper";

    export let onDismiss: () => void;

    type ChipData = {
        icon: Component;
        label: string;
        description: string;
    };

    let isTouch = false;
    onMount(() => {
        isTouch = window.matchMedia("(pointer: coarse)").matches;
    });

    $: nodeChips = isTouch
        ? ([
              { icon: HandTapIcon, label: $t("onboarding.tap"), description: $t("onboarding.levelUp") },
              { icon: LongPressIcon, label: $t("onboarding.longPress"), description: $t("onboarding.options") },
          ] as ChipData[])
        : ([
              { icon: MouseLeftClickIcon, label: $t("onboarding.leftClick"), description: $t("onboarding.levelUp") },
              { icon: MouseRightClickIcon, label: $t("onboarding.rightClick"), description: $t("onboarding.options") },
              { icon: MouseMiddleClickIcon, label: $t("onboarding.middleClick"), description: $t("onboarding.levelDown") },
          ] as ChipData[]);

    $: treeChips = isTouch
        ? ([
              { icon: LongPressIcon, label: $t("onboarding.longPress"), description: $t("onboarding.treeOptions") },
              { icon: HandGrabbingIcon, label: $t("onboarding.swipe"), description: $t("onboarding.pan") },
              { icon: PinchIcon, label: $t("onboarding.pinch"), description: $t("onboarding.zoom") },
          ] as ChipData[])
        : ([
              { icon: MouseRightClickIcon, label: $t("onboarding.rightClick"), description: $t("onboarding.treeOptions") },
              { icon: ArrowsOutCardinalIcon, label: $t("onboarding.clickDrag"), description: $t("onboarding.pan") },
              { icon: MouseScrollIcon, label: $t("onboarding.scroll"), description: $t("onboarding.zoom") },
          ] as ChipData[]);

    let dismissing = false;

    function handleDismiss() {
        if (dismissing) return;
        dismissing = true;
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion) {
            onDismiss();
        } else {
            setTimeout(onDismiss, 200);
        }
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="onboarding-overlay"
    class:dismissing
    role="dialog"
    aria-label="Controls tutorial"
    on:pointerdown={handleDismiss}
>
    <div class="onboarding-content">
        <!-- Nodes zone -->
        <div class="onboarding-zone onboarding-zone-nodes">
            <span class="onboarding-zone-label">{$t("onboarding.nodesSection")}</span>
            <div class="onboarding-node-wrapper" aria-hidden="true">
                <Node
                    id={-1}
                    skillId="attack_boost"
                    state="available"
                    level={0}
                    maxLevel={100}
                    tier={0}
                    label={$t("skills.attack_boost")}
                    scale={1}
                    radius={1}
                    region="right"
                    showSkillName={true}
                    showTier={true}
                />
            </div>
            <div class="onboarding-chips">
                {#each nodeChips as chip, i}
                    <div class="onboarding-chip accent" style="--chip-index: {i}">
                        <span class="onboarding-chip-icon" aria-hidden="true">
                            <svelte:component this={chip.icon} />
                        </span>
                        <span class="onboarding-chip-label">{chip.label}</span>
                        <span class="onboarding-chip-desc">{chip.description}</span>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Divider -->
        <div class="onboarding-divider"></div>

        <!-- Tree zone -->
        <div class="onboarding-zone onboarding-zone-tree">
            <span class="onboarding-zone-label muted">{$t("onboarding.treeSection")}</span>
            <div class="onboarding-chips">
                {#each treeChips as chip, i}
                    <div class="onboarding-chip muted" style="--chip-index: {nodeChips.length + i}">
                        <span class="onboarding-chip-icon" aria-hidden="true">
                            <svelte:component this={chip.icon} />
                        </span>
                        <span class="onboarding-chip-label">{chip.label}</span>
                        <span class="onboarding-chip-desc">{chip.description}</span>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Dismiss hint -->
        <span class="onboarding-dismiss-hint">
            {isTouch ? $t("onboarding.dismissTap") : $t("onboarding.dismissClick")}
        </span>
    </div>
</div>

<style>
    .onboarding-overlay {
        position: fixed;
        inset: 0;
        z-index: var(--z-index-context-menu);
        background: rgba(0, 0, 0, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: overlay-fade-in 300ms ease both;
    }

    .onboarding-overlay.dismissing {
        animation: overlay-fade-out 200ms ease both;
    }

    .onboarding-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-lg);
        padding: var(--spacing-lg);
        max-width: 360px;
        width: 100%;
    }

    .onboarding-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-md);
        width: 100%;
    }

    .onboarding-zone-label {
        font-size: var(--font-xs);
        font-weight: var(--weight-semibold);
        letter-spacing: var(--tracking-wide);
        text-transform: uppercase;
        color: var(--accent);
    }

    .onboarding-zone-label.muted {
        color: var(--text-muted);
    }

    .onboarding-node-wrapper {
        pointer-events: none;
        position: relative;
        width: 64px;
        height: 64px;
        animation: node-enter 250ms var(--ease-decel) both;
    }

    .onboarding-divider {
        width: 48px;
        height: 1px;
        background: var(--text-muted);
        opacity: 0.3;
    }

    .onboarding-chips {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        width: 100%;
    }

    .onboarding-chip {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--text-muted);
        border-radius: var(--radius);
        opacity: 0;
        animation: chip-enter 250ms var(--ease-decel) both;
        animation-delay: calc(var(--chip-index) * 50ms);
    }

    .onboarding-chip.accent {
        border-color: var(--accent);
        color: var(--accent);
    }

    .onboarding-chip.muted {
        border-color: var(--text-muted);
        color: var(--text-muted);
    }

    .onboarding-chip-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 20px;
        height: 20px;
    }

    .onboarding-chip-label {
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        white-space: nowrap;
    }

    .onboarding-chip-desc {
        font-size: var(--font-xs);
        opacity: 0.7;
        margin-left: auto;
        white-space: nowrap;
    }

    .onboarding-dismiss-hint {
        font-size: var(--font-xs);
        color: var(--text-muted);
        opacity: 0.6;
        margin-top: var(--spacing-md);
    }

    @keyframes overlay-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes overlay-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
    }

    @keyframes node-enter {
        from {
            transform: scale(0.9);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }

    @keyframes chip-enter {
        from {
            transform: translateY(8px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .onboarding-overlay {
            animation: none;
        }

        .onboarding-overlay.dismissing {
            animation: none;
        }

        .onboarding-node-wrapper {
            animation: none;
        }

        .onboarding-chip {
            animation: none;
            opacity: 1;
        }
    }
</style>
