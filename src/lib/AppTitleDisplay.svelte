<script lang="ts">
    import { onMount } from "svelte";
    import Button from "./Button.svelte";
    import { t } from "svelte-whisper";
    import { getCurrentVersion } from "./latestUsedVersionStore";
    import { onboardingSeen } from "./onboarding/onboardingStore";
    import { activePresetName } from "./buildPresetsStore";
    import { isPreviewMode } from "./previewModeStore";
    import { appTitleVisible } from "./appTitleVisibleStore";
    import { prefersNoAnimations } from "./reduceMotionStore";

    export let onClick: (() => void) | undefined = undefined;
    export let isMenuOpen = false;

    let hideForever = false;
    $: if (isMenuOpen) hideForever = true;
    $: if (prefersNoAnimations()) hideForever = true;
    $: waitingForOnboarding = !$onboardingSeen;
    const version = getCurrentVersion();
    $: $appTitleVisible = !hideForever && !waitingForOnboarding;

    $: appName = $t("app.name");
    $: versionLabel = version === "unknown" ? "" : `v${version}`;
    $: appDisplayName =
        versionLabel.length > 0
            ? $t("app.titleWithVersion", {
                  appName,
                  version: versionLabel,
              })
            : appName;
    $: presetSubtitle =
        !$isPreviewMode
            ? $t("preview.buildTitle", { name: $activePresetName })
            : "";

    let wrapperElement: HTMLDivElement;

    onMount(() => {
        if (prefersNoAnimations()) {
            hideForever = true;
            return;
        }

        const button = wrapperElement?.querySelector(
            ".app-title-display",
        ) as HTMLElement;
        if (button) {
            const handleAnimationEnd = () => {
                hideForever = true;
            };
            button.addEventListener("animationend", handleAnimationEnd);
            return () => {
                button.removeEventListener("animationend", handleAnimationEnd);
            };
        }
    });
</script>

{#if !hideForever && !waitingForOnboarding}
    <div class="app-title-display-wrapper" bind:this={wrapperElement}>
        <Button
            class="app-title-display"
            type="button"
            aria-label={appDisplayName}
            on:click={() => onClick?.()}
            arrow="right"
        >
            {appName}
            {#if versionLabel}
                <span class="app-title-version">{versionLabel}</span>
            {/if}
            {#if presetSubtitle}
                <span class="app-title-preset">{presetSubtitle}</span>
            {/if}
        </Button>
    </div>
{/if}

<style>
    .app-title-display-wrapper {
        pointer-events: none;
    }

    :global(.app-title-display) {
        border-radius: var(--radius-lg) !important;
        font-weight: var(--weight-bold);
        font-size: var(--font-base) !important;
        letter-spacing: 0.06em;
        padding: var(--spacing-sm) var(--spacing-lg);
        pointer-events: auto;
        --app-title-display-duration: 2s;
        --app-title-display-fade: 200ms;
        animation: app-title-fade var(--app-title-display-fade) ease-in forwards;
        animation-delay: var(--app-title-display-duration);
    }

    .app-title-version {
        display: block;
        font-size: var(--font-xs);
        font-weight: var(--weight-normal);
        opacity: 0.5;
        letter-spacing: 0.04em;
    }

    .app-title-preset {
        display: block;
        font-size: var(--font-sm);
        font-weight: var(--weight-normal);
        opacity: 0.6;
        letter-spacing: 0.02em;
    }

    @keyframes app-title-fade {
        0% {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
        }
        100% {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }
    }
</style>
