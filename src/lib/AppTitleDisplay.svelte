<script lang="ts">
    import { onMount } from "svelte";
    import Button from "./Button.svelte";
    import { t } from "svelte-whisper";
    import { getCurrentVersion } from "./latestUsedVersionStore";
    import { onboardingSeen } from "./onboarding/onboardingStore";

    export let onClick: (() => void) | undefined = undefined;
    export let isMenuOpen = false;

    let hideForever = false;
    $: if (isMenuOpen) hideForever = true;
    $: waitingForOnboarding = !$onboardingSeen;
    const version = getCurrentVersion();
    $: appName = $t("app.name");
    $: versionLabel = version === "unknown" ? "" : `v${version}`;
    $: appDisplayName =
        versionLabel.length > 0
            ? $t("app.titleWithVersion", {
                  appName,
                  version: versionLabel,
              })
            : appName;

    let wrapperElement: HTMLDivElement;

    onMount(() => {
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
            {appDisplayName}
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
