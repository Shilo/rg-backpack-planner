<script lang="ts">
    import { get } from "svelte/store";
    import { tick } from "svelte";
    import {
        CaretDownIcon,
        CaretUpIcon,
        CheckIcon,
        DotsThreeVerticalIcon,
        PencilSimpleIcon,
        PlusIcon,
        ShareNetworkIcon,
        TrashSimpleIcon,
    } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import CloneBuildButton from "./CloneBuildButton.svelte";
    import ShareBuildButton from "./ShareBuildButton.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import { portal } from "../portal";
    import { buildPresetsStore } from "../buildPresetsStore";
    import {
        setActivePresetId,
        updatePreset,
        deletePreset,
        addPreset,
        getUniquePresetName,
        activePresetName,
        movePresetUp,
        movePresetDown,
    } from "../buildPresetsStore";
    import { decodeBuildData } from "../buildData/encoder";
    import { encodeBuildData } from "../buildData/encoder";
    import { applyBuildData } from "../buildData/applier";
    import { showToast } from "../toast";
    import { openModal } from "../modalStore";
    import { truncateText } from "../stringUtil";
    import { guardianTree } from "../../config/guardianTree";
    import { vanguardTree } from "../../config/vanguardTree";
    import { cannonTree } from "../../config/cannonTree";
    import { t } from "svelte-whisper";
    import { getDisplayPresetName } from "../i18n";

    export let disabled: boolean | undefined = false;

    const tabs = [
        { nodes: guardianTree },
        { nodes: vanguardTree },
        { nodes: cannonTree },
    ];

    let presetsMenuOpen = false;
    let presetsMenuX = 0;
    let presetsMenuY = 0;
    let presetsButtonElement: HTMLButtonElement | null = null;
    let presetsContextMenu: InstanceType<typeof ContextMenu> | null = null;

    let editMenuPresetId: string | null = null;
    let editMenuX = 0;
    let editMenuY = 0;
    let editIconElement: HTMLButtonElement | null = null;

    $: editPreset = editMenuPresetId
        ? ($buildPresetsStore.presets.find(
              (preset) => preset.id === editMenuPresetId,
          ) ?? null)
        : null;
    $: editPresetBuildData = editPreset
        ? decodeBuildData(editPreset.buildCode)
        : null;
    $: editPresetShareTitle = editPreset?.name
        ? $t("preview.buildTitle", {
              name: getDisplayPresetName(editPreset.name),
          })
        : $t("share.defaultShareTitle");
    $: editPresetTooltipSubject = editPreset?.name
        ? getDisplayPresetName(editPreset.name)
        : $t("techCrystals.subjectYour");

    $: {
        const index = editMenuPresetId
            ? $buildPresetsStore.presets.findIndex(
                  (p) => p.id === editMenuPresetId,
              )
            : -1;
        const total = $buildPresetsStore.presets.length;
        editMenuTitle =
            editPreset?.name && index >= 0 && total > 1
                ? $t("buildPresets.editMenuTitleWithNameIndex", {
                      name: truncateText(getDisplayPresetName(editPreset.name)),
                      index: index + 1,
                      total,
                  })
                : editPreset?.name
                  ? $t("buildPresets.editMenuTitleWithName", {
                        name: truncateText(
                            getDisplayPresetName(editPreset.name),
                        ),
                    })
                  : $t("buildPresets.editMenuTitle");
        canMoveUp = total > 1 && index > 0;
        canMoveDown = total > 1 && index >= 0 && index < total - 1;
    }

    let editMenuTitle = "";
    let canMoveUp = false;
    let canMoveDown = false;

    async function openPresetsMenu() {
        if (!presetsButtonElement) return;
        const rect = presetsButtonElement.getBoundingClientRect();
        presetsMenuX = rect.left + rect.width / 2;
        presetsMenuY = rect.bottom + 8;
        presetsMenuOpen = true;
        editMenuPresetId = null;

        // Wait for DOM to update, then scroll to active preset
        await tick();
        scrollToActivePreset();
    }

    function scrollToActivePreset() {
        const activeId = get(buildPresetsStore).active;
        if (!activeId) return;

        const activeButton = document.querySelector(
            `[data-preset-id="${activeId}"]`,
        );
        if (activeButton) {
            activeButton.scrollIntoView({
                behavior: "instant",
                block: "nearest",
            });
        }
    }

    function closePresetsMenu() {
        presetsMenuOpen = false;
        editMenuPresetId = null;
    }

    function switchToPreset(presetId: string) {
        const data = get(buildPresetsStore);
        const preset = data.presets.find((p) => p.id === presetId);
        if (!preset) return;
        const buildData = decodeBuildData(preset.buildCode);
        if (!buildData) return;
        setActivePresetId(presetId);
        applyBuildData(tabs, buildData);
        showToast(
            $t("buildPresets.viewingPresetToast", {
                name: truncateText(getDisplayPresetName(preset.name)),
            }),
        );
        closePresetsMenu();
    }

    function openEditMenu(
        event: CustomEvent<MouseEvent> | MouseEvent,
        presetId: string,
    ) {
        const mouseEvent = event instanceof CustomEvent ? event.detail : event;
        mouseEvent.stopPropagation();
        mouseEvent.preventDefault();
        const target =
            (mouseEvent.currentTarget as HTMLElement | null) ??
            (mouseEvent.target as HTMLElement | null)?.closest("button") ??
            null;
        if (!target) return;
        editIconElement = target as HTMLButtonElement;
        const rect = editIconElement.getBoundingClientRect();
        editMenuX = rect.left + rect.width / 2;
        editMenuY = rect.bottom + 8;
        editMenuPresetId = presetId;
    }

    function closeEditMenu() {
        editMenuPresetId = null;
    }

    function handleRename(presetId: string) {
        const data = get(buildPresetsStore);
        const preset = data.presets.find((p) => p.id === presetId);
        if (!preset) return;
        closeEditMenu();
        const displayName = getDisplayPresetName(preset.name);
        openModal({
            type: "textInput",
            title: $t("buildPresets.renameModalTitle"),
            titleIcon: PencilSimpleIcon,
            message: $t("buildPresets.renameModalMessage"),
            textInput: {
                label: $t("buildPresets.presetNameLabel"),
                value: displayName,
                maxLength: 25,
            },
            confirmLabel: $t("buildPresets.renameConfirmLabel"),
            cancelLabel: $t("common.cancel"),
            onConfirm: (value) => {
                if (typeof value === "string") {
                    const name = value === displayName ? preset.name : value;
                    updatePreset(presetId, { name });
                    setTimeout(() => presetsContextMenu?.updatePosition(), 0);
                }
            },
        });
    }

    function handleDelete(presetId: string) {
        const data = get(buildPresetsStore);
        const preset = data.presets.find((p) => p.id === presetId);
        if (!preset) return;
        closeEditMenu();
        openModal({
            type: "confirm",
            title: $t("buildPresets.deleteModalTitle"),
            message: $t("buildPresets.deleteModalMessage", {
                name: getDisplayPresetName(preset.name),
            }),
            confirmLabel: $t("buildPresets.deleteConfirmLabel"),
            cancelLabel: $t("common.cancel"),
            confirmNegative: true,
            titleIcon: TrashSimpleIcon,
            onConfirm: () => {
                const wasActive = data.active === presetId;
                const remaining = data.presets.filter((p) => p.id !== presetId);
                deletePreset(presetId);
                if (remaining.length === 0) {
                    handleAddBuild(true);
                } else if (wasActive) {
                    const first = remaining[0];
                    setActivePresetId(first.id);
                    const buildData = decodeBuildData(first.buildCode);
                    if (buildData) applyBuildData(tabs, buildData);
                    closeEditMenu();
                }
            },
        });
    }

    function handleAddBuild(skipPrompt: boolean = false) {
        const emptyTrees = tabs.map(() => []);
        const emptyOwned = 0;
        const buildCode = encodeBuildData({
            trees: emptyTrees,
            owned: emptyOwned,
        });

        if (skipPrompt) {
            const preset = addPreset("Default", buildCode);
            setActivePresetId(preset.id);
            applyBuildData(tabs, { trees: emptyTrees, owned: emptyOwned });
            closePresetsMenu();
        } else {
            const defaultName = getUniquePresetName("New", "New");
            const displayName = getDisplayPresetName(defaultName);
            openModal({
                type: "textInput",
                title: $t("buildPresets.newModalTitle"),
                titleIcon: PlusIcon,
                message: $t("buildPresets.newModalMessage"),
                textInput: {
                    label: $t("buildPresets.presetNameLabel"),
                    value: displayName,
                    maxLength: 25,
                },
                confirmLabel: $t("buildPresets.createConfirmLabel"),
                cancelLabel: $t("common.cancel"),
                onConfirm: (value) => {
                    if (typeof value === "string") {
                        const name =
                            value === displayName ? defaultName : value;
                        const preset = addPreset(name, buildCode);
                        setActivePresetId(preset.id);
                        applyBuildData(tabs, {
                            trees: emptyTrees,
                            owned: emptyOwned,
                        });
                        closePresetsMenu();
                    }
                },
            });
        }
    }

    function handleDeleteAllAndAddNew() {
        const data = get(buildPresetsStore);
        if (data.presets.length === 0) {
            handleAddBuild(true);
            return;
        }
        openModal({
            type: "confirm",
            title: $t("buildPresets.deleteAllModalTitle"),
            message: $t("buildPresets.deleteAllModalMessage"),
            confirmLabel: $t("buildPresets.deleteAllConfirmLabel"),
            cancelLabel: $t("common.cancel"),
            confirmNegative: true,
            titleIcon: TrashSimpleIcon,
            onConfirm: () => {
                data.presets.forEach((preset) => deletePreset(preset.id));
                handleAddBuild(true);
            },
        });
    }

    function handleMoveUp(event: CustomEvent<MouseEvent> | MouseEvent) {
        const mouseEvent = event instanceof CustomEvent ? event.detail : event;
        mouseEvent.stopPropagation();
        if (editMenuPresetId) movePresetUp(editMenuPresetId);
    }

    function handleMoveDown(event: CustomEvent<MouseEvent> | MouseEvent) {
        const mouseEvent = event instanceof CustomEvent ? event.detail : event;
        mouseEvent.stopPropagation();
        if (editMenuPresetId) movePresetDown(editMenuPresetId);
    }
</script>

<Button
    bind:element={presetsButtonElement}
    on:click={openPresetsMenu}
    tooltipText={$t("buildPresets.changeTooltip")}
    description={$t("buildPresets.buttonDescription")}
    icon={ShareNetworkIcon}
    arrow="down"
    {disabled}
>
    {$t("buildPresets.buttonLabel")} <span class="preset-name"
        >{getDisplayPresetName($activePresetName)}</span
    >
</Button>

<div use:portal class="presets-menu-portal" class:menu-open={presetsMenuOpen}>
    <ContextMenu
        bind:this={presetsContextMenu}
        x={presetsMenuX}
        y={presetsMenuY}
        isOpen={presetsMenuOpen}
        title={$t("buildPresets.menuTitle")}
        onClose={closePresetsMenu}
    >
        <div class="premade-builds-list">
            {#each $buildPresetsStore.presets as preset (preset.id)}
                {@const isActive = preset.id === $buildPresetsStore.active}
                {@const presetDisplayName = getDisplayPresetName(preset.name)}
                <div class="preset-row button-group" data-preset-id={preset.id}>
                    <Button
                        class={`preset-name-btn ${isActive ? "active" : ""}`}
                        tooltipText={isActive
                            ? $t("buildPresets.activePresetTooltip", {
                                  name: truncateText(presetDisplayName),
                              })
                            : $t("buildPresets.switchToPresetTooltip", {
                                  name: truncateText(presetDisplayName),
                              })}
                        aria-label={$t("buildPresets.switchToPresetTooltip", {
                            name: truncateText(presetDisplayName),
                        })}
                        icon={isActive ? CheckIcon : null}
                        on:click={() => switchToPreset(preset.id)}
                    >
                        {truncateText(presetDisplayName)}
                    </Button>
                    <Button
                        class="preset-edit-btn dropdown-button"
                        tooltipText={$t("buildPresets.editPresetTooltip", {
                            name: truncateText(presetDisplayName),
                        })}
                        aria-label={$t("buildPresets.editPresetTooltip", {
                            name: truncateText(presetDisplayName),
                        })}
                        icon={DotsThreeVerticalIcon}
                        on:click={(e) => openEditMenu(e, preset.id)}
                    />
                </div>
            {/each}
        </div>
        <div class="button-group">
            <Button
                class="add-new-build-btn"
                on:click={() => handleAddBuild()}
                tooltipText={$t("buildPresets.createEmptyTooltip")}
                icon={PlusIcon}
                arrow="right"
            >
                {$t("buildPresets.addNew")}
            </Button>
            <Button
                class="dropdown-button"
                on:click={handleDeleteAllAndAddNew}
                tooltipText={$t("buildPresets.deleteAllAndCreateTooltip")}
                icon={TrashSimpleIcon}
                negative
            />
        </div>
    </ContextMenu>
</div>

{#if editMenuPresetId}
    <div
        use:portal
        class="presets-menu-portal edit-submenu"
        style="pointer-events: auto;"
    >
        <ContextMenu
            x={editMenuX}
            y={editMenuY}
            isOpen={true}
            title={editMenuTitle}
            onClose={closeEditMenu}
        >
            <div
                class="button-group move-buttons-row"
                class:hidden={$buildPresetsStore.presets.length < 2}
            >
                <Button
                    on:click={handleMoveUp}
                    tooltipText={$t("buildPresets.movePresetUpTooltip")}
                    icon={CaretUpIcon}
                    disabled={!canMoveUp}
                />
                <Button
                    on:click={handleMoveDown}
                    class="dropdown-button"
                    tooltipText={$t("buildPresets.movePresetDownTooltip")}
                    icon={CaretDownIcon}
                    disabled={!canMoveDown}
                />
            </div>
            <Button
                on:click={() => handleRename(editMenuPresetId!)}
                tooltipText={$t("buildPresets.editPresetNameTooltip")}
                icon={PencilSimpleIcon}
                arrow="right"
            >
                {$t("buildPresets.renameButton")}
            </Button>
            <ShareBuildButton
                title={$t("common.share")}
                tooltipSubject={editPresetTooltipSubject}
                menuTitle={editPreset?.name
                    ? $t("buildPresets.shareMenuTitleWithName", {
                          name: truncateText(
                              getDisplayPresetName(editPreset.name),
                          ),
                      })
                    : $t("buildPresets.shareMenuTitleFallback")}
                buildName={editPreset?.name}
                buildData={editPresetBuildData}
                shareTitle={editPresetShareTitle}
                showScreenshot={false}
                disabled={!editPresetBuildData}
            />
            <CloneBuildButton
                name={editPreset?.name}
                buildCode={editPreset?.buildCode}
                label={$t("common.clone")}
                tooltip={$t("buildPresets.clonePresetTooltip")}
                on:click={closeEditMenu}
            />
            <Button
                on:click={() => handleDelete(editMenuPresetId!)}
                tooltipText={$t("buildPresets.removePresetTooltip")}
                icon={TrashSimpleIcon}
                arrow="right"
                negative
            >
                {$t("buildPresets.deleteButton")}
            </Button>
        </ContextMenu>
    </div>
{/if}

<style>
    .preset-name {
        color: var(--text);
    }

    .presets-menu-portal {
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        pointer-events: none;
        z-index: var(--z-index-context-menu);
    }

    .presets-menu-portal.menu-open,
    .presets-menu-portal.edit-submenu {
        pointer-events: auto;
    }

    .preset-row {
        display: flex;
        align-items: center;
        gap: 0;
        min-width: 0;
    }

    :global(.preset-name-btn) {
        flex: 1;
        min-width: 0;
        text-align: left;
        justify-content: flex-start;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    :global(.preset-name-btn.active) {
        background: color-mix(
            in srgb,
            var(--surface) 78%,
            var(--accent)
        ) !important;
        border-color: color-mix(
            in srgb,
            var(--accent) 55%,
            var(--border)
        ) !important;
    }

    :global(.preset-name-btn .button-text) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    :global(.preset-edit-btn) {
        flex-shrink: 0;
    }

    :global(.add-new-build-btn) {
        flex: 1;
        min-width: 0;
    }

    .premade-builds-list {
        max-height: min(400px, 40vh);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }

    :global(.move-buttons-row) {
        display: flex;

        :global(button) {
            flex: 1;
        }
    }

    :global(.move-buttons-row.hidden) {
        display: none;
    }
</style>
