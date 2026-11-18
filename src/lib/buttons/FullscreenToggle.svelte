<script lang="ts">
    import { CornersInIcon, CornersOutIcon } from "phosphor-svelte";
    import type { Component } from "svelte";
    import { onDestroy, onMount } from "svelte";
    import Button from "../Button.svelte";
    import {
        isFullscreenActive,
        isFullscreenSupported,
        toggleFullscreen,
    } from "../fullscreen";
    import { showToast } from "../toast";
    import ToggleSwitch from "../ToggleSwitch.svelte";
    import { t } from "svelte-whisper";
    import { getKeyboardActionLabel } from "../input";

    export let iconButton = false;

    let fullscreenSupported = false;
    let isFullscreen = false;

    function updateFullscreenState() {
        isFullscreen = isFullscreenActive();
    }

    async function handleToggleFullscreen() {
        if (!fullscreenSupported) {
            showToast($t("fullscreen.unsupportedToast"));
            return;
        }

        const success = await toggleFullscreen();

        if (!success) {
            showToast($t("fullscreen.failedToast"), {
                tone: "negative",
            });
        }

        updateFullscreenState();
    }

    function handleFullscreenChange() {
        updateFullscreenState();
    }

    onMount(() => {
        if (typeof document === "undefined") return;

        fullscreenSupported = isFullscreenSupported();
        updateFullscreenState();

        document.addEventListener("fullscreenchange", handleFullscreenChange);
    });

    onDestroy(() => {
        if (typeof document === "undefined") return;
        document.removeEventListener(
            "fullscreenchange",
            handleFullscreenChange,
        );
    });
</script>

{#if iconButton}
    <Button
        {...$$restProps}
        icon={(isFullscreen
            ? CornersInIcon
            : CornersOutIcon) as unknown as Component}
        tooltipText={isFullscreen
            ? $t("fullscreen.exitTooltip")
            : $t("fullscreen.enterTooltip")}
        shortcut={getKeyboardActionLabel("fullscreen", $t)}
        flashOnAction="fullscreen"
        on:click={handleToggleFullscreen}
    />
{:else}
    <ToggleSwitch
        checked={isFullscreen}
        label={$t("fullscreen.label")}
        ariaLabel="Toggle fullscreen mode"
        description={$t("settings.fullscreenDescription")}
        icon={CornersOutIcon as unknown as Component}
        onToggle={handleToggleFullscreen}
    />
{/if}
