<script lang="ts">
    import type { Component } from "svelte";
    import { onMount } from "svelte";
    import {
        ArrowCounterClockwiseIcon,
        ArrowsOutCardinalIcon,
        CornersOutIcon,
        DownloadSimpleIcon,
        EyeIcon,
        GithubLogoIcon,
        HandGrabbingIcon,
        HandSwipeRightIcon,
        HandTapIcon,
        HexagonIcon,
        ImageIcon,
        ListIcon,
        MouseLeftClickIcon,
        MouseRightClickIcon,
        MouseScrollIcon,
    } from "phosphor-svelte";
    import packageInfo from "../../../package.json";
    import Button from "../Button.svelte";
    import SideMenuSection from "../SideMenuSection.svelte";
    import InstallPwaButton, {
        subscribeInstallState,
    } from "../buttons/InstallPwaButton.svelte";
    import AppIcon from "../icons/AppIcon.svelte";
    import LongPressIcon from "../icons/LongPressIcon.svelte";
    import PinchIcon from "../icons/PinchIcon.svelte";
    import { getOSName } from "../systemUtil";
    import { t } from "svelte-whisper";
    import { getCurrentVersion } from "../latestUsedVersionStore";

    const version = getCurrentVersion();
    const osName = getOSName();
    const appGithubUrl = (packageInfo?.app?.sourceUrl ?? undefined) as
        | string
        | undefined;

    const ownerName = packageInfo.author?.name ?? "";
    const ownerUrl = packageInfo.author?.url ?? "";
    const gameName = packageInfo.game?.name ?? "";
    const gameUrl = packageInfo.game?.url ?? "";
    const ownerLink =
        ownerUrl && ownerName
            ? `<a href="${ownerUrl}" target="_blank" rel="noopener noreferrer">${ownerName}</a>`
            : ownerName || "";
    const gameLink =
        gameUrl && gameName
            ? `<a href="${gameUrl}" target="_blank" rel="noopener noreferrer">${gameName}</a>`
            : gameName || "";
    $: appDescription = $t("app.description");
    $: helpMessage =
        gameName && ownerName
            ? $t("app.byForHtml", { ownerLink, gameLink })
            : "";
    $: appName = $t("app.name");
    $: versionLabel = version === "unknown" ? "" : `v${version}`;
    $: appSectionTitle =
        versionLabel.length > 0
            ? $t("app.titleWithVersion", { appName, version: versionLabel })
            : appName;

    type ControlDevice = "pointer" | "touch" | "both";
    type ControlItem = {
        id: string;
        label: string;
        description: string;
        icon: Component;
        device: ControlDevice;
    };

    let controls: ControlItem[] = [];
    $: controls = [
        {
            id: "pointer-node",
            label: $t("controls.pointerNodeLabel"),
            description: $t("controls.pointerNodeDescription"),
            icon: MouseLeftClickIcon,
            device: "pointer",
        },
        {
            id: "pointer-node-menu",
            label: $t("controls.pointerNodeMenuLabel"),
            description: $t("controls.pointerNodeMenuDescription"),
            icon: MouseRightClickIcon,
            device: "pointer",
        },
        {
            id: "pointer-tree-menu",
            label: $t("controls.pointerTreeMenuLabel"),
            description: $t("controls.pointerTreeMenuDescription"),
            icon: MouseRightClickIcon,
            device: "pointer",
        },
        {
            id: "pointer-pan",
            label: $t("controls.pointerPanLabel"),
            description: $t("controls.pointerPanDescription"),
            icon: ArrowsOutCardinalIcon,
            device: "pointer",
        },
        {
            id: "pointer-zoom",
            label: $t("controls.pointerZoomLabel"),
            description: $t("controls.pointerZoomDescription"),
            icon: MouseScrollIcon,
            device: "pointer",
        },
        {
            id: "touch-node",
            label: $t("controls.touchNodeLabel"),
            description: $t("controls.touchNodeDescription"),
            icon: HandTapIcon,
            device: "touch",
        },
        {
            id: "touch-node-menu",
            label: $t("controls.touchNodeMenuLabel"),
            description: $t("controls.touchNodeMenuDescription"),
            icon: LongPressIcon,
            device: "touch",
        },
        {
            id: "touch-tree-menu",
            label: $t("controls.touchTreeMenuLabel"),
            description: $t("controls.touchTreeMenuDescription"),
            icon: LongPressIcon,
            device: "touch",
        },
        {
            id: "touch-pan",
            label: $t("controls.touchPanLabel"),
            description: $t("controls.touchPanDescription"),
            icon: HandGrabbingIcon,
            device: "touch",
        },
        {
            id: "touch-zoom",
            label: $t("controls.touchZoomLabel"),
            description: $t("controls.touchZoomDescription"),
            icon: PinchIcon,
            device: "touch",
        },
        {
            id: "touch-menu-swipe",
            label: $t("controls.touchMenuSwipeLabel"),
            description: $t("controls.touchMenuSwipeDescription"),
            icon: HandSwipeRightIcon,
            device: "touch",
        },
    ];

    let showMouse = true;
    let showTouch = true;
    let showKeyboard = true;
    let canInstall = false;
    let isInstalled = false;

    function detectInputSupport() {
        let supportsTouch = false;
        let supportsMouse = false;

        if (typeof navigator !== "undefined") {
            supportsTouch = (navigator.maxTouchPoints ?? 0) > 0;
        }

        if (typeof window !== "undefined" && window.matchMedia) {
            supportsMouse =
                window.matchMedia("(any-pointer: fine)").matches ||
                window.matchMedia("(pointer: fine)").matches;
            supportsTouch =
                supportsTouch ||
                window.matchMedia("(any-pointer: coarse)").matches ||
                window.matchMedia("(pointer: coarse)").matches;
        }

        if (!supportsTouch && !supportsMouse) {
            supportsMouse = true;
        }

        showMouse = supportsMouse;
        showTouch = supportsTouch;
        showKeyboard = supportsMouse;
    }

    $: pointerControls = controls.filter((c) => c.device !== "touch");
    $: touchControls = controls.filter((c) => c.device !== "pointer");

    onMount(() => {
        detectInputSupport();
        const unsubscribe = subscribeInstallState((state) => {
            canInstall = state.canInstall;
            isInstalled = state.isInstalled;
        });
        return () => unsubscribe();
    });
</script>

<div class="controls-page">
    <div class="controls-sections">
        <SideMenuSection title={appSectionTitle}>
            <div class="app-info-actions">
                <div class="control-row">
                    <span class="control-icon" aria-hidden="true">
                        <AppIcon />
                    </span>
                    <div class="control-text">
                        {#if appDescription}
                            <p class="control-label">{appDescription}</p>
                        {/if}
                        {#if helpMessage}
                            <p class="control-desc">{@html helpMessage}</p>
                        {/if}
                    </div>
                </div>
                <div class="controls-actions">
                    <Button
                        icon={GithubLogoIcon}
                        aria-label={$t("app.sourceCodeGithub")}
                        tooltipText={$t("app.sourceCodeGithub")}
                        on:click={() => {
                            window.open(
                                appGithubUrl ?? "https://github.com/shilo",
                                "_blank",
                                "noopener,noreferrer",
                            );
                        }}
                    />
                    <InstallPwaButton />
                </div>
            </div>
        </SideMenuSection>
        {#if showTouch}
            <SideMenuSection title={$t("sideMenu.sections.touch")}>
                <ul class="control-list">
                    {#each touchControls as control (control.id)}
                        <li class="control-row">
                            <span class="control-icon" aria-hidden="true">
                                <svelte:component this={control.icon} />
                            </span>
                            <div class="control-text">
                                <p class="control-label">{control.label}</p>
                                <p class="control-desc">
                                    {control.description}
                                </p>
                            </div>
                        </li>
                    {/each}
                </ul>
            </SideMenuSection>
        {/if}
        {#if showMouse}
            <SideMenuSection title={$t("sideMenu.sections.mouse")}>
                <ul class="control-list">
                    {#each pointerControls as control (control.id)}
                        <li class="control-row">
                            <span class="control-icon" aria-hidden="true">
                                <svelte:component this={control.icon} />
                            </span>
                            <div class="control-text">
                                <p class="control-label">{control.label}</p>
                                <p class="control-desc">
                                    {control.description}
                                </p>
                            </div>
                        </li>
                    {/each}
                </ul>
            </SideMenuSection>
        {/if}
        {#if showKeyboard}
            <SideMenuSection title={$t("sideMenu.sections.keyboard")}>
                <ul class="control-list">
                    <li class="control-row">
                        <span class="control-icon" aria-hidden="true">
                            <ImageIcon />
                        </span>
                        <div class="control-text">
                            <p class="control-label">
                                {$t("controls.keyboardScreenshotLabel")}
                            </p>
                            <p class="control-desc">
                                {$t("controls.keyboardScreenshotDescription")}
                            </p>
                        </div>
                    </li>
                </ul>
            </SideMenuSection>
        {/if}
        <SideMenuSection title={$t("sideMenu.sections.hud")}>
            <ul class="control-list">
                <li class="control-row">
                    <span
                        class="control-icon control-icon-filled"
                        aria-hidden="true"
                    >
                        <HexagonIcon weight="fill" />
                    </span>
                    <div class="control-text">
                        <p class="control-label">
                            {$t("controls.hudTechCrystalsLabel")}
                        </p>
                        <p class="control-desc">
                            {$t("controls.hudTechCrystalsDescription")}
                        </p>
                    </div>
                </li>
                <li class="control-row">
                    <span class="control-icon" aria-hidden="true"
                        ><ArrowCounterClockwiseIcon /></span
                    >
                    <div class="control-text">
                        <p class="control-label">
                            {$t("controls.hudResetTreeLabel")}
                        </p>
                        <p class="control-desc">
                            {$t("controls.hudResetTreeDescription")}
                        </p>
                    </div>
                </li>
                <li class="control-row">
                    <span class="control-icon" aria-hidden="true"
                        ><ListIcon /></span
                    >
                    <div class="control-text">
                        <p class="control-label">
                            {$t("controls.hudSideMenuLabel")}
                        </p>
                        <p class="control-desc">
                            {$t("controls.hudSideMenuDescription")}
                        </p>
                    </div>
                </li>
                <li class="control-row">
                    <span class="control-icon" aria-hidden="true"
                        ><CornersOutIcon /></span
                    >
                    <div class="control-text">
                        <p class="control-label">
                            {$t("controls.hudFullscreenLabel")}
                        </p>
                        <p class="control-desc">
                            {$t("controls.hudFullscreenDescription")}
                        </p>
                    </div>
                </li>
                <li class="control-row">
                    <span class="control-icon" aria-hidden="true"
                        ><EyeIcon /></span
                    >
                    <div class="control-text">
                        <p class="control-label">
                            {$t("controls.hudPreviewIndicatorLabel")}
                        </p>
                        <p class="control-desc">
                            {$t("controls.hudPreviewIndicatorDescription")}
                        </p>
                    </div>
                </li>
            </ul>
        </SideMenuSection>
        <SideMenuSection title={$t("sideMenu.sections.controlsTab")}>
            <ul class="control-list">
                <li class="control-row">
                    <span class="control-icon" aria-hidden="true"
                        ><GithubLogoIcon /></span
                    >
                    <div class="control-text">
                        <p class="control-label">
                            {$t("controls.controlsTabGithubLabel")}
                        </p>
                        <p class="control-desc">
                            {$t("controls.controlsTabGithubDescription")}
                        </p>
                    </div>
                </li>
                {#if canInstall && !isInstalled}
                    <li class="control-row">
                        <span class="control-icon" aria-hidden="true"
                            ><DownloadSimpleIcon /></span
                        >
                        <div class="control-text">
                            <p class="control-label">
                                {$t("controls.controlsTabInstallLabel")}
                            </p>
                            <p class="control-desc">
                                {$t("controls.controlsTabInstallDescription", {
                                    osName,
                                })}
                            </p>
                        </div>
                    </li>
                {/if}
            </ul>
        </SideMenuSection>
    </div>
</div>

<style>
    .controls-page {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        min-width: 0;
    }

    .controls-sections {
        display: grid;
        gap: var(--spacing-lg);
        min-width: 0;
    }

    .control-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: var(--spacing-md);
    }

    .control-row {
        display: grid;
        grid-template-columns: 24px minmax(0, 1fr);
        gap: var(--spacing-md);
        align-items: start;
    }

    .control-icon {
        width: 20px;
        height: 20px;
        color: var(--text-muted);
    }

    .control-icon :global(svg) {
        width: 100%;
        height: 100%;
        display: block;
    }

    .control-icon-filled {
        color: var(--text-muted);
    }

    .control-text {
        display: grid;
        gap: var(--spacing-sm);
    }

    .control-label {
        margin: 0;
        font-size: var(--font);
        color: var(--text);
        overflow-wrap: break-word;
    }

    .control-desc {
        margin: 0;
        font-size: var(--font);
        color: var(--text-muted);
        line-height: 1.35;
        overflow-wrap: break-word;
    }

    .control-desc :global(a) {
        color: var(--text-muted);
    }

    .app-info-actions {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--spacing-md);
    }

    .app-info-actions > .control-row {
        flex: 1;
        min-width: 0;
    }

    .controls-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--spacing-md);
        flex-shrink: 0;
    }
</style>
