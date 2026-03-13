<script lang="ts">
    import type { Component } from "svelte";
    import { onMount } from "svelte";
    import {
        ArrowFatUpIcon,
        ArrowCounterClockwiseIcon,
        ArrowsOutCardinalIcon,
        CornersOutIcon,
        EyeIcon,
        GithubLogoIcon,
        HandGrabbingIcon,
        HandSwipeRightIcon,
        HandTapIcon,
        ImageIcon,
        InfoIcon,
        ListIcon,
        MouseLeftClickIcon,
        MouseMiddleClickIcon,
        MouseRightClickIcon,
        MouseScrollIcon,
        SquaresFourIcon,
    } from "phosphor-svelte";
    import { TechCrystalIcon } from "../customIcons";
    import packageInfo from "../../../package.json";
    import Button from "../Button.svelte";
    import SideMenuSection from "../SideMenuSection.svelte";
    import Accordion from "../Accordion.svelte";
    import NumberedList from "../NumberedList.svelte";
    import InstallPwaButton from "../buttons/InstallPwaButton.svelte";
    import AppIcon from "../icons/AppIcon.svelte";
    import LongPressIcon from "../icons/LongPressIcon.svelte";
    import PinchIcon from "../icons/PinchIcon.svelte";
    import { t } from "svelte-whisper";
    import { getCurrentVersion } from "../latestUsedVersionStore";

    const version = getCurrentVersion();
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
            id: "pointer-hover",
            label: $t("controls.pointerHoverLabel"),
            description: $t("controls.pointerHoverDescription"),
            icon: InfoIcon,
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
    let touchOpen = false;
    let mouseOpen = true;
    let keyboardOpen = false;
    let hudOpen = true;

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

        // Auto-open the primary input method's section
        touchOpen = supportsTouch && !supportsMouse;
        mouseOpen = supportsMouse;
        keyboardOpen = false;
        hudOpen = true;
    }

    $: pointerControls = controls.filter((c) => c.device !== "touch");
    $: touchControls = controls.filter((c) => c.device !== "pointer");

    onMount(() => {
        detectInputSupport();
    });
</script>

<div class="controls-page">
    <div class="controls-sections">
        <SideMenuSection title={appSectionTitle}>
            <div class="app-info-actions">
                <div class="app-info-text">
                    <div class="control-label-row">
                        <span class="control-icon" aria-hidden="true">
                            <AppIcon />
                        </span>
                        {#if appDescription}
                            <p class="control-label">{appDescription}</p>
                        {/if}
                    </div>
                    {#if helpMessage}
                        <p class="control-desc-standalone">
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
            <Accordion
                title={$t("sideMenu.sections.touch")}
                bind:isOpen={touchOpen}
            >
                <ul class="control-list">
                    {#each touchControls as control (control.id)}
                        <li class="control-row">
                            <span class="control-icon" aria-hidden="true">
                                <svelte:component this={control.icon} />
                            </span>
                            <p class="control-inline">
                                <span class="control-label"
                                    >{control.label}</span
                                >
                                <span class="control-desc"
                                    >{control.description}</span
                                >
                            </p>
                        </li>
                    {/each}
                </ul>
            </Accordion>
        {/if}
        {#if showMouse}
            <Accordion
                title={$t("sideMenu.sections.mouse")}
                bind:isOpen={mouseOpen}
            >
                <ul class="control-list">
                    {#each pointerControls as control (control.id)}
                        <li class="control-row">
                            {#if control.titleRows && control.titleRows.length > 0}
                                <div class="control-alt-group">
                                    {#each control.titleRows as titleRow, titleIndex (`${control.id}-${titleIndex}`)}
                                        <div class="control-alt-row">
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
                                            {#if titleIndex === control.titleRows.length - 1}
                                                <p class="control-inline">
                                                    <span class="control-label"
                                                        >{titleRow.label}</span
                                                    >
                                                    <span class="control-desc"
                                                        >{control.description}</span
                                                    >
                                                </p>
                                            {:else}
                                                <span class="control-label"
                                                    >{titleRow.label}</span
                                                >
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            {:else}
                                <span
                                    class="control-icon"
                                    aria-hidden="true"
                                >
                                    <svelte:component this={control.icon} />
                                </span>
                                <p class="control-inline">
                                    <span class="control-label"
                                        >{control.label}</span
                                    >
                                    <span class="control-desc"
                                        >{control.description}</span
                                    >
                                </p>
                            {/if}
                        </li>
                    {/each}
                </ul>
            </Accordion>
        {/if}
        {#if showKeyboard}
            <Accordion
                title={$t("sideMenu.sections.keyboard")}
                bind:isOpen={keyboardOpen}
            >
                <ul class="control-list">
                    <li class="control-row">
                        <span class="control-icon" aria-hidden="true">
                            <ImageIcon />
                        </span>
                        <p class="control-inline">
                            <span class="control-label"
                                >{$t(
                                    "controls.keyboardScreenshotLabel",
                                )}</span
                            >
                            <span class="control-desc"
                                >{$t(
                                    "controls.keyboardScreenshotDescription",
                                )}</span
                            >
                        </p>
                    </li>
                    <li class="control-row">
                        <span class="control-icon" aria-hidden="true">
                            <SquaresFourIcon />
                        </span>
                        <p class="control-inline">
                            <span class="control-label"
                                >{$t(
                                    "controls.keyboardCycleTabsLabel",
                                )}</span
                            >
                            <span class="control-desc"
                                >{$t(
                                    "controls.keyboardCycleTabsDescription",
                                )}</span
                            >
                        </p>
                    </li>
                    <li class="control-row">
                        <span class="control-icon" aria-hidden="true">
                            <ListIcon />
                        </span>
                        <p class="control-inline">
                            <span class="control-label"
                                >{$t("controls.keyboardEscLabel")}</span
                            >
                            <span class="control-desc"
                                >{$t(
                                    "controls.keyboardEscDescription",
                                )}</span
                            >
                        </p>
                    </li>
                    <li class="control-row">
                        <span class="control-icon" aria-hidden="true">
                            <ArrowCounterClockwiseIcon />
                        </span>
                        <p class="control-inline">
                            <span class="control-label"
                                >{$t(
                                    "controls.keyboardBackspaceLabel",
                                )}</span
                            >
                            <span class="control-desc"
                                >{$t(
                                    "controls.keyboardBackspaceDescription",
                                )}</span
                            >
                        </p>
                    </li>
                </ul>
            </Accordion>
        {/if}
        <Accordion
            title={$t("sideMenu.sections.hud")}
            bind:isOpen={hudOpen}
        >
            <ul class="control-list">
                <li class="control-row">
                    <span
                        class="control-icon control-icon-filled"
                        aria-hidden="true"
                    >
                        <TechCrystalIcon weight="fill" />
                    </span>
                    <p class="control-inline">
                        <span class="control-label"
                            >{$t("controls.hudTechCrystalsLabel")}</span
                        >
                        <span class="control-desc"
                            >{$t(
                                "controls.hudTechCrystalsDescription",
                            )}</span
                        >
                    </p>
                </li>
                <li class="control-row">
                    <span class="control-icon" aria-hidden="true"
                        ><ArrowCounterClockwiseIcon /></span
                    >
                    <p class="control-inline">
                        <span class="control-label"
                            >{$t("controls.hudResetTreeLabel")}</span
                        >
                        <span class="control-desc"
                            >{$t(
                                "controls.hudResetTreeDescription",
                            )}</span
                        >
                    </p>
                </li>
                <li class="control-row">
                    <span class="control-icon" aria-hidden="true"
                        ><ListIcon /></span
                    >
                    <p class="control-inline">
                        <span class="control-label"
                            >{$t("controls.hudSideMenuLabel")}</span
                        >
                        <span class="control-desc"
                            >{$t(
                                "controls.hudSideMenuDescription",
                            )}</span
                        >
                    </p>
                </li>
                <li class="control-row">
                    <span class="control-icon" aria-hidden="true"
                        ><CornersOutIcon /></span
                    >
                    <p class="control-inline">
                        <span class="control-label"
                            >{$t("controls.hudFullscreenLabel")}</span
                        >
                        <span class="control-desc"
                            >{$t(
                                "controls.hudFullscreenDescription",
                            )}</span
                        >
                    </p>
                </li>
                <li class="control-row">
                    <span class="control-icon" aria-hidden="true"
                        ><EyeIcon /></span
                    >
                    <p class="control-inline">
                        <span class="control-label"
                            >{$t(
                                "controls.hudPreviewIndicatorLabel",
                            )}</span
                        >
                        <span class="control-desc"
                            >{$t(
                                "controls.hudPreviewIndicatorDescription",
                            )}</span
                        >
                    </p>
                </li>
            </ul>
        </Accordion>
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

    /* Compact inline layout: icon + "label — description" */
    .control-row {
        display: flex;
        align-items: start;
        gap: var(--spacing-md);
        min-width: 0;
    }

    .control-inline {
        margin: 0;
        font-size: var(--font);
        line-height: var(--leading);
        overflow-wrap: break-word;
        min-width: 0;
    }

    .control-inline > .control-label {
        color: var(--text);
    }

    .control-inline > .control-desc {
        color: var(--text-muted);
    }

    .control-inline > .control-desc::before {
        content: " — ";
    }

    /* Alternative input rows (e.g. Middle Click / Shift+Click) */
    .control-alt-group {
        display: grid;
        gap: var(--spacing-xs);
        min-width: 0;
    }

    .control-alt-row {
        display: flex;
        align-items: start;
        gap: var(--spacing-md);
        min-width: 0;
    }

    .control-alt-row > .control-label {
        font-size: var(--font);
        color: var(--text);
        overflow-wrap: break-word;
    }

    /* Icon styles */
    .control-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        color: var(--text-muted);
        margin-top: 1px;
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

    /* App info header */
    .control-label-row {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        min-width: 0;
    }

    .control-label {
        margin: 0;
        font-size: var(--font);
        color: var(--text);
        overflow-wrap: break-word;
        min-width: 0;
    }

    .control-desc-standalone {
        margin: 0;
        font-size: var(--font);
        color: var(--text-muted);
        line-height: 1.35;
        overflow-wrap: break-word;
        padding-left: calc(20px + var(--spacing-md));
    }

    .control-desc-standalone :global(a) {
        color: var(--text-muted);
    }

    .control-desc-standalone :global(a[target="_blank"])::after {
        content: " ↗";
        font-size: 0.85em;
    }

    .app-info-actions {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--spacing-md);
    }

    .app-info-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .controls-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--spacing-md);
        flex-shrink: 0;
    }
</style>
