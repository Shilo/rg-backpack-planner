<script lang="ts">
    import type { Component } from "svelte";
    import { onMount } from "svelte";
    import {
        ArrowFatUpIcon,
        ArrowCounterClockwiseIcon,
        TrashSimpleIcon,
        ArrowsOutCardinalIcon,
        BookOpenTextIcon,
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
    import { TechCrystalIcon, RootNodeIcon } from "../customIcons";
    import packageInfo from "../../../package.json";
    import Button from "../Button.svelte";
    import Accordion from "../Accordion.svelte";
    import NumberedList from "../NumberedList.svelte";
    import InstallPwaButton from "../buttons/InstallPwaButton.svelte";
    import AppIcon from "../icons/AppIcon.svelte";
    import LongPressIcon from "../icons/LongPressIcon.svelte";
    import PinchIcon from "../icons/PinchIcon.svelte";
    import { t } from "svelte-whisper";
    import { showOnboarding } from "../onboarding/onboardingStore";
    import { getDeviceInputLabels, getKeyboardActionLabel } from "../input";

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
    $: versionLabel = version === "unknown" ? "" : version;

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
    $: mouse = getDeviceInputLabels("mouse", $t);
    $: touch = getDeviceInputLabels("touch", $t);
    $: keyDismiss = getKeyboardActionLabel("dismiss", $t);
    $: keyBack = getKeyboardActionLabel("back", $t);
    $: keyCycle = getKeyboardActionLabel("cycle", $t);
    $: keyScreenshot = getKeyboardActionLabel("screenshot", $t);
    $: hudPrimaryAction =
        showMouse && showTouch
            ? `${mouse.primary} / ${touch.primary}`
            : showTouch
              ? touch.primary
              : mouse.primary;
    $: controls = [
        {
            id: "pointer-node",
            label: $t("controls.pointerNodeLabel", { action: mouse.primary }),
            description: $t("controls.pointerNodeDescription"),
            icon: MouseLeftClickIcon,
            device: "pointer",
        },
        {
            id: "pointer-node-decrement",
            label: $t("controls.pointerNodeMiddleDecrementLabel", { action: mouse.auxiliary }),
            description: $t("controls.pointerNodeDecrementDescription"),
            icon: MouseMiddleClickIcon,
            device: "pointer",
        },
        {
            id: "pointer-node-increment-tier",
            label: $t("controls.pointerNodeIncrementTierLabel", { action: mouse.macroPrimary }),
            description: $t("controls.pointerNodeIncrementTierDescription"),
            icon: ArrowFatUpIcon,
            iconSecondary: MouseLeftClickIcon,
            iconSeparator: "+",
            iconKeycap: true,
            device: "pointer",
        },
        {
            id: "pointer-node-decrement-tier",
            label: $t("controls.pointerNodeDecrementTierLabel", { action: mouse.macroAuxiliary }),
            description: $t("controls.pointerNodeDecrementTierDescription"),
            icon: ArrowFatUpIcon,
            iconSecondary: MouseMiddleClickIcon,
            iconSeparator: "+",
            iconKeycap: true,
            device: "pointer",
        },
        {
            id: "pointer-node-increment-one",
            label: $t("controls.pointerNodeIncrementOneLabel", { action: mouse.microPrimary }),
            description: $t("controls.pointerNodeIncrementOneDescription"),
            icon: ArrowFatUpIcon,
            iconSecondary: MouseLeftClickIcon,
            iconSeparator: "+",
            iconKeycap: true,
            device: "pointer",
        },
        {
            id: "pointer-node-decrement-one",
            label: $t("controls.pointerNodeDecrementOneLabel", { action: mouse.microAuxiliary }),
            description: $t("controls.pointerNodeDecrementOneDescription"),
            icon: ArrowFatUpIcon,
            iconSecondary: MouseMiddleClickIcon,
            iconSeparator: "+",
            iconKeycap: true,
            device: "pointer",
        },
        {
            id: "pointer-node-menu",
            label: $t("controls.pointerNodeMenuLabel", { action: mouse.secondary }),
            description: $t("controls.pointerNodeMenuDescription"),
            icon: MouseRightClickIcon,
            device: "pointer",
        },
        {
            id: "pointer-tree-menu",
            label: $t("controls.pointerTreeMenuLabel", { action: mouse.secondary }),
            description: $t("controls.pointerTreeMenuDescription"),
            icon: MouseRightClickIcon,
            device: "pointer",
        },
        {
            id: "pointer-pan",
            label: $t("controls.pointerPanLabel", { action: mouse.primary }),
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
            label: $t("controls.touchNodeLabel", { action: touch.primary }),
            description: $t("controls.touchNodeDescription"),
            icon: HandTapIcon,
            device: "touch",
        },
        {
            id: "touch-node-menu",
            label: $t("controls.touchNodeMenuLabel", { action: touch.secondary }),
            description: $t("controls.touchNodeMenuDescription"),
            icon: LongPressIcon,
            device: "touch",
        },
        {
            id: "touch-tree-menu",
            label: $t("controls.touchTreeMenuLabel", { action: touch.secondary }),
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
        <div class="app-card">
            <div class="app-card-header">
                <span class="app-card-icon" aria-hidden="true">
                    <AppIcon />
                </span>
                <div class="app-card-text">
                    <span class="app-card-name">{appName}</span>
                    {#if appDescription}
                        <span class="app-card-description"
                            >{appDescription}</span
                        >
                    {/if}
                    {#if helpMessage}
                        <span class="app-card-meta">
                            {@html helpMessage}
                        </span>
                    {/if}
                </div>
                <div class="app-card-actions">
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
            {#if versionLabel}
                <div class="app-card-row">
                    <span class="app-card-label"
                        >{$t("settings.aboutVersion")}</span
                    >
                    <span class="app-card-value">{versionLabel}</span>
                </div>
            {/if}
        </div>
        <Button
            on:click={() => {
                showOnboarding();
            }}
            description={$t("onboarding.showTutorialDescription")}
            icon={BookOpenTextIcon}
        >
            {$t("onboarding.showTutorial")}
        </Button>
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
                                >{$t("controls.keyboardScreenshotLabel", { action: keyScreenshot })}</span
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
                                >{$t("controls.keyboardCycleTabsLabel", { action: keyCycle })}</span
                            >
                            <span class="control-desc"
                                >{$t(
                                    "controls.keyboardCycleTabsDescription",
                                    { action: keyCycle },
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
                                >{$t("controls.keyboardEscLabel", { action: keyDismiss })}</span
                            >
                            <span class="control-desc"
                                >{$t("controls.keyboardEscDescription")}</span
                            >
                        </p>
                    </li>
                    <li class="control-row">
                        <span class="control-icon" aria-hidden="true">
                            <ArrowCounterClockwiseIcon />
                        </span>
                        <p class="control-inline">
                            <span class="control-label"
                                >{$t("controls.keyboardBackspaceLabel", { action: keyBack })}</span
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
        <Accordion title={$t("sideMenu.sections.hud")} bind:isOpen={hudOpen}>
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
                            >{$t("controls.hudTechCrystalsDescription")}</span
                        >
                    </p>
                </li>
                <li class="control-row">
                    <span class="control-icon" aria-hidden="true"
                        ><TrashSimpleIcon /></span
                    >
                    <p class="control-inline">
                        <span class="control-label"
                            >{$t("controls.hudResetTreeLabel")}</span
                        >
                        <span class="control-desc"
                            >{$t("controls.hudResetTreeDescription")}</span
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
                            >{$t("controls.hudSideMenuDescription")}</span
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
                            >{$t("controls.hudFullscreenDescription")}</span
                        >
                    </p>
                </li>
                <li class="control-row">
                    <span class="control-icon" aria-hidden="true"
                        ><EyeIcon /></span
                    >
                    <p class="control-inline">
                        <span class="control-label"
                            >{$t("controls.hudPreviewIndicatorLabel")}</span
                        >
                        <span class="control-desc"
                            >{$t(
                                "controls.hudPreviewIndicatorDescription",
                            )}</span
                        >
                    </p>
                </li>
                <li class="control-row">
                    <span class="control-icon" aria-hidden="true">
                        <RootNodeIcon />
                    </span>
                    <p class="control-inline">
                        <span class="control-label"
                            >{$t("controls.hudRootQuickSettingsLabel")}</span
                        >
                        <span class="control-desc"
                            >{$t(
                                "controls.hudRootQuickSettingsDescription",
                                { action: hudPrimaryAction },
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

    .control-label {
        margin: 0;
        font-size: var(--font);
        color: var(--text);
        overflow-wrap: break-word;
        min-width: 0;
    }

    /* App identity card */
    .app-card {
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
    }

    .app-card-header {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-md);
        padding: var(--spacing-lg);
    }

    .app-card-icon {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        color: var(--text-muted);
    }

    .app-card-icon :global(svg) {
        width: 100%;
        height: 100%;
        display: block;
    }

    .app-card-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
    }

    .app-card-name {
        font-size: var(--font-base);
        font-weight: var(--weight-bold);
        color: var(--text);
        line-height: var(--leading);
    }

    .app-card-description {
        font-size: var(--font-sm);
        color: var(--text-disabled);
        line-height: var(--leading);
        overflow-wrap: anywhere;
    }

    .app-card-meta {
        font-size: var(--font-sm);
        color: var(--text-disabled);
        line-height: var(--leading);
        overflow-wrap: anywhere;
    }

    .app-card-meta :global(a) {
        color: var(--text-disabled);
    }

    .app-card-meta :global(a[target="_blank"])::after {
        content: " ↗";
        font-size: 0.85em;
    }

    .app-card-actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-sm);
        flex-shrink: 0;
    }

    .app-card-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-sm) var(--spacing-lg);
        border-top: var(--border-width) solid var(--border);
    }

    .app-card-label {
        font-size: var(--font-base);
        color: var(--text-muted);
    }

    .app-card-value {
        font-size: var(--font-base);
        color: var(--text-disabled);
    }
</style>
