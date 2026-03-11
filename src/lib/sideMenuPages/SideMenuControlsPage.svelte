<script lang="ts">
    import type { Component } from "svelte";
    import { onMount } from "svelte";
    import {
        ArrowFatUpIcon,
        ArrowCounterClockwiseIcon,
        ArrowsOutCardinalIcon,
        CornersOutIcon,
        DownloadSimpleIcon,
        EyeIcon,
        GithubLogoIcon,
        HandGrabbingIcon,
        HandSwipeRightIcon,
        HandTapIcon,
        ImageIcon,
        ListIcon,
        MouseLeftClickIcon,
        MouseMiddleClickIcon,
        MouseRightClickIcon,
        MouseScrollIcon,
        SquaresFourIcon,
    } from "phosphor-svelte";
    import { techCrystalIcon as TechCrystalIcon } from "../techCrystalIcon";
    import packageInfo from "../../../package.json";
    import Button from "../Button.svelte";
    import SideMenuSection from "../SideMenuSection.svelte";
    import Accordion from "../Accordion.svelte";
    import NumberedList from "../NumberedList.svelte";
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
    type ControlTitleRow = {
        label: string;
        icon: Component;
        iconSecondary?: Component;
        iconSeparator?: string;
        iconKeycap?: boolean;
    };
    type ControlItem = {
        id: string;
        label: string;
        description: string;
        icon: Component;
        iconSecondary?: Component;
        iconSeparator?: string;
        iconKeycap?: boolean;
        titleRows?: ControlTitleRow[];
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
            id: "pointer-node-decrement",
            label: $t("controls.pointerNodeMiddleDecrementLabel"),
            description: $t("controls.pointerNodeDecrementDescription"),
            icon: MouseMiddleClickIcon,
            titleRows: [
                {
                    label: $t("controls.pointerNodeMiddleDecrementLabel"),
                    icon: MouseMiddleClickIcon,
                },
                {
                    label: $t("controls.pointerNodeDecrementLabel"),
                    icon: ArrowFatUpIcon,
                    iconSecondary: MouseLeftClickIcon,
                    iconSeparator: "+",
                    iconKeycap: true,
                },
            ],
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
                    <div class="control-label-row">
                        <span class="control-icon" aria-hidden="true">
                            <AppIcon />
                        </span>
                        {#if appDescription}
                            <p class="control-label">{appDescription}</p>
                        {/if}
                    </div>
                    {#if helpMessage}
                        <p class="control-desc control-desc-standalone">
                            {@html helpMessage}
                        </p>
                    {/if}
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
        <div class="instructions-accordion">
            <Accordion
                title={$t("sideMenu.sections.instructions")}
                isOpen={false}
            >
                <NumberedList
                    items={[0, 1, 2, 3, 4].map((i) => $t(`trees.rules.${i}`))}
                />
            </Accordion>
        </div>
        {#if showTouch}
            <SideMenuSection title={$t("sideMenu.sections.touch")}>
                <ul class="control-list">
                    {#each touchControls as control (control.id)}
                        <li
                            class="control-row"
                            class:control-row-multi={!!control.titleRows &&
                                control.titleRows.length > 0}
                        >
                            {#if control.titleRows && control.titleRows.length > 0}
                                <div class="control-text control-text-multi">
                                    <div class="control-title-list">
                                        {#each control.titleRows as titleRow, titleIndex (`${control.id}-${titleIndex}`)}
                                            <div class="control-title-row">
                                                <span
                                                    class="control-icon"
                                                    class:control-icon-combo={!!titleRow.iconSecondary}
                                                    aria-hidden="true"
                                                >
                                                    {#if titleRow.iconKeycap}
                                                        <span
                                                            class="control-keycap"
                                                        >
                                                            <svelte:component
                                                                this={titleRow.icon}
                                                            />
                                                        </span>
                                                    {:else}
                                                        <svelte:component
                                                            this={titleRow.icon}
                                                        />
                                                    {/if}
                                                    {#if titleRow.iconSecondary}
                                                        <span
                                                            class="control-icon-joiner"
                                                        >
                                                            {titleRow.iconSeparator ??
                                                                "+"}
                                                        </span>
                                                        <svelte:component
                                                            this={titleRow.iconSecondary}
                                                        />
                                                    {/if}
                                                </span>
                                                <p class="control-label">
                                                    {titleRow.label}
                                                </p>
                                            </div>
                                        {/each}
                                    </div>
                                    <p class="control-desc control-desc-offset">
                                        {control.description}
                                    </p>
                                </div>
                            {:else}
                                <div class="control-label-row">
                                    <span
                                        class="control-icon"
                                        class:control-icon-combo={!!control.iconSecondary}
                                        aria-hidden="true"
                                    >
                                        {#if control.iconKeycap}
                                            <span class="control-keycap">
                                                <svelte:component
                                                    this={control.icon}
                                                />
                                            </span>
                                        {:else}
                                            <svelte:component
                                                this={control.icon}
                                            />
                                        {/if}
                                        {#if control.iconSecondary}
                                            <span class="control-icon-joiner">
                                                {control.iconSeparator ?? "+"}
                                            </span>
                                            <svelte:component
                                                this={control.iconSecondary}
                                            />
                                        {/if}
                                    </span>
                                    <p class="control-label">{control.label}</p>
                                </div>
                                <p class="control-desc control-desc-standalone">
                                    {control.description}
                                </p>
                            {/if}
                        </li>
                    {/each}
                </ul>
            </SideMenuSection>
        {/if}
        {#if showMouse}
            <SideMenuSection title={$t("sideMenu.sections.mouse")}>
                <ul class="control-list">
                    {#each pointerControls as control (control.id)}
                        <li
                            class="control-row"
                            class:control-row-multi={!!control.titleRows &&
                                control.titleRows.length > 0}
                        >
                            {#if control.titleRows && control.titleRows.length > 0}
                                <div class="control-text control-text-multi">
                                    <div class="control-title-list">
                                        {#each control.titleRows as titleRow, titleIndex (`${control.id}-${titleIndex}`)}
                                            <div class="control-title-row">
                                                <span
                                                    class="control-icon"
                                                    class:control-icon-combo={!!titleRow.iconSecondary}
                                                    aria-hidden="true"
                                                >
                                                    {#if titleRow.iconKeycap}
                                                        <span
                                                            class="control-keycap"
                                                        >
                                                            <svelte:component
                                                                this={titleRow.icon}
                                                            />
                                                        </span>
                                                    {:else}
                                                        <svelte:component
                                                            this={titleRow.icon}
                                                        />
                                                    {/if}
                                                    {#if titleRow.iconSecondary}
                                                        <span
                                                            class="control-icon-joiner"
                                                        >
                                                            {titleRow.iconSeparator ??
                                                                "+"}
                                                        </span>
                                                        <svelte:component
                                                            this={titleRow.iconSecondary}
                                                        />
                                                    {/if}
                                                </span>
                                                <p class="control-label">
                                                    {titleRow.label}
                                                </p>
                                            </div>
                                        {/each}
                                    </div>
                                    <p class="control-desc control-desc-offset">
                                        {control.description}
                                    </p>
                                </div>
                            {:else}
                                <div class="control-label-row">
                                    <span
                                        class="control-icon"
                                        class:control-icon-combo={!!control.iconSecondary}
                                        aria-hidden="true"
                                    >
                                        {#if control.iconKeycap}
                                            <span class="control-keycap">
                                                <svelte:component
                                                    this={control.icon}
                                                />
                                            </span>
                                        {:else}
                                            <svelte:component
                                                this={control.icon}
                                            />
                                        {/if}
                                        {#if control.iconSecondary}
                                            <span class="control-icon-joiner">
                                                {control.iconSeparator ?? "+"}
                                            </span>
                                            <svelte:component
                                                this={control.iconSecondary}
                                            />
                                        {/if}
                                    </span>
                                    <p class="control-label">{control.label}</p>
                                </div>
                                <p class="control-desc control-desc-standalone">
                                    {control.description}
                                </p>
                            {/if}
                        </li>
                    {/each}
                </ul>
            </SideMenuSection>
        {/if}
        {#if showKeyboard}
            <SideMenuSection title={$t("sideMenu.sections.keyboard")}>
                <ul class="control-list">
                    <li class="control-row">
                        <div class="control-label-row">
                            <span class="control-icon" aria-hidden="true">
                                <ImageIcon />
                            </span>
                            <p class="control-label">
                                {$t("controls.keyboardScreenshotLabel")}
                            </p>
                        </div>
                        <p class="control-desc control-desc-standalone">
                            {$t("controls.keyboardScreenshotDescription")}
                        </p>
                    </li>
                    <li class="control-row">
                        <div class="control-label-row">
                            <span class="control-icon" aria-hidden="true">
                                <SquaresFourIcon />
                            </span>
                            <p class="control-label">
                                {$t("controls.keyboardCycleTabsLabel")}
                            </p>
                        </div>
                        <p class="control-desc control-desc-standalone">
                            {$t("controls.keyboardCycleTabsDescription")}
                        </p>
                    </li>
                    <li class="control-row">
                        <div class="control-label-row">
                            <span class="control-icon" aria-hidden="true">
                                <ArrowCounterClockwiseIcon />
                            </span>
                            <p class="control-label">
                                {$t("controls.keyboardBackspaceResetLabel")}
                            </p>
                        </div>
                        <p class="control-desc control-desc-standalone">
                            {$t("controls.keyboardBackspaceResetDescription")}
                        </p>
                    </li>
                </ul>
            </SideMenuSection>
        {/if}
        <SideMenuSection title={$t("sideMenu.sections.hud")}>
            <ul class="control-list">
                <li class="control-row">
                    <div class="control-label-row">
                        <span
                            class="control-icon control-icon-filled"
                            aria-hidden="true"
                        >
                            <TechCrystalIcon weight="fill" />
                        </span>
                        <p class="control-label">
                            {$t("controls.hudTechCrystalsLabel")}
                        </p>
                    </div>
                    <p class="control-desc control-desc-standalone">
                        {$t("controls.hudTechCrystalsDescription")}
                    </p>
                </li>
                <li class="control-row">
                    <div class="control-label-row">
                        <span class="control-icon" aria-hidden="true"
                            ><ArrowCounterClockwiseIcon /></span
                        >
                        <p class="control-label">
                            {$t("controls.hudResetTreeLabel")}
                        </p>
                    </div>
                    <p class="control-desc control-desc-standalone">
                        {$t("controls.hudResetTreeDescription")}
                    </p>
                </li>
                <li class="control-row">
                    <div class="control-label-row">
                        <span class="control-icon" aria-hidden="true"
                            ><ListIcon /></span
                        >
                        <p class="control-label">
                            {$t("controls.hudSideMenuLabel")}
                        </p>
                    </div>
                    <p class="control-desc control-desc-standalone">
                        {$t("controls.hudSideMenuDescription")}
                    </p>
                </li>
                <li class="control-row">
                    <div class="control-label-row">
                        <span class="control-icon" aria-hidden="true"
                            ><CornersOutIcon /></span
                        >
                        <p class="control-label">
                            {$t("controls.hudFullscreenLabel")}
                        </p>
                    </div>
                    <p class="control-desc control-desc-standalone">
                        {$t("controls.hudFullscreenDescription")}
                    </p>
                </li>
                <li class="control-row">
                    <div class="control-label-row">
                        <span class="control-icon" aria-hidden="true"
                            ><EyeIcon /></span
                        >
                        <p class="control-label">
                            {$t("controls.hudPreviewIndicatorLabel")}
                        </p>
                    </div>
                    <p class="control-desc control-desc-standalone">
                        {$t("controls.hudPreviewIndicatorDescription")}
                    </p>
                </li>
            </ul>
        </SideMenuSection>
        <SideMenuSection title={$t("sideMenu.sections.controlsTab")}>
            <ul class="control-list">
                <li class="control-row">
                    <div class="control-label-row">
                        <span class="control-icon" aria-hidden="true"
                            ><GithubLogoIcon /></span
                        >
                        <p class="control-label">
                            {$t("controls.controlsTabGithubLabel")}
                        </p>
                    </div>
                    <p class="control-desc control-desc-standalone">
                        {$t("controls.controlsTabGithubDescription")}
                    </p>
                </li>
                {#if canInstall && !isInstalled}
                    <li class="control-row">
                        <div class="control-label-row">
                            <span class="control-icon" aria-hidden="true"
                                ><DownloadSimpleIcon /></span
                            >
                            <p class="control-label">
                                {$t("controls.controlsTabInstallLabel")}
                            </p>
                        </div>
                        <p class="control-desc control-desc-standalone">
                            {$t("controls.controlsTabInstallDescription", {
                                osName,
                            })}
                        </p>
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
        display: flex;
        flex-direction: column;
        gap: 0;
    }

    .control-row-multi {
        display: block;
    }

    .control-label-row {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        min-width: 0;
    }

    .control-label-row .control-label {
        min-width: 0;
    }

    .control-desc-standalone {
        padding-left: calc(20px + var(--spacing-md));
    }

    .control-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        color: var(--text-muted);
    }

    .control-icon :global(svg) {
        width: 100%;
        height: 100%;
        display: block;
    }

    .control-icon-combo {
        width: 20px;
        height: auto;
        min-height: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
    }

    .control-icon-combo :global(svg) {
        width: 20px;
        height: 20px;
    }

    .control-keycap {
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1.5px solid var(--text-muted);
        border-radius: 4px;
        box-sizing: border-box;
    }

    .control-keycap :global(svg) {
        width: 12px;
        height: 12px;
    }

    .control-icon-joiner {
        font-size: 10px;
        font-weight: 600;
        line-height: 1;
        color: var(--text-muted);
    }

    .control-icon-filled {
        color: var(--text-muted);
    }

    .control-text {
        display: grid;
        gap: var(--spacing-sm);
    }

    .control-text-multi {
        gap: 0;
    }

    .control-title-list {
        display: grid;
        gap: var(--spacing-sm);
    }

    .control-title-row {
        position: relative;
        display: block;
        min-height: 20px;
        padding-left: calc(22px + var(--spacing-md));
    }

    .control-title-row > .control-icon {
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        overflow: visible;
    }

    /* Combo icons (e.g. shift+click): pin to top of row so they never overlap the row above */
    .control-title-row > .control-icon-combo {
        top: 0;
        transform: none;
    }

    .control-title-row > .control-label {
        margin: 0;
    }

    .control-desc-offset {
        padding-left: calc(22px + var(--spacing-md));
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
