<script lang="ts">
    import { get } from "svelte/store";
    import { tick } from "svelte";
    import {
        CheckIcon,
        DotsThreeVerticalIcon,
        PencilSimpleIcon,
        PlusIcon,
        ShareNetworkIcon,
        TrashSimpleIcon,
    } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import ShareBuildButton from "./ShareBuildButton.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import { portal } from "../portal";
    import { buildPresetsStore } from "../buildPresetsStore";
    import {
        setActivePresetId,
        updatePreset,
        deletePreset,
        addPreset,
    } from "../buildPresetsStore";
    import { decodeBuildData } from "../buildData/encoder";
    import { encodeBuildData } from "../buildData/encoder";
    import { applyBuildData } from "../buildData/applier";
    import { createShareUrl } from "../buildData/url";
    import { openModal } from "../modalStore";
    import { guardianTree } from "../../config/guardianTree";
    import { vanguardTree } from "../../config/vanguardTree";
    import { cannonTree } from "../../config/cannonTree";

    export let disabled: boolean | undefined = false;

    const tabs = [
        { nodes: guardianTree },
        { nodes: vanguardTree },
        { nodes: cannonTree },
    ];

    const NAME_CHAR_LIMIT = 25;

    function truncateName(name: string): string {
        return name.length > NAME_CHAR_LIMIT
            ? name.slice(0, NAME_CHAR_LIMIT) + "..."
            : name;
    }

    let presetsMenuOpen = false;
    let presetsMenuX = 0;
    let presetsMenuY = 0;
    let presetsButtonElement: HTMLButtonElement | null = null;
    let presetsContextMenu: InstanceType<typeof ContextMenu> | null = null;

    let editMenuPresetId: string | null = null;
    let editMenuX = 0;
    let editMenuY = 0;
    let editIconElement: HTMLButtonElement | null = null;

    $: activePresetName =
        $buildPresetsStore.presets.find(
            (preset) => preset.id === $buildPresetsStore.activePresetId,
        )?.name ?? "Default";

    $: editPreset = editMenuPresetId
        ? ($buildPresetsStore.presets.find(
              (preset) => preset.id === editMenuPresetId,
          ) ?? null)
        : null;
    $: editPresetBuildData = editPreset
        ? decodeBuildData(editPreset.buildCode)
        : null;
    $: editPresetShareUrl =
        editPresetBuildData && editPreset
            ? createShareUrl({ ...editPresetBuildData, name: editPreset.name })
            : null;
    $: editPresetShareTitle = editPreset?.name
        ? `${editPreset.name} build`
        : "Backpack tech tree build";
    $: editPresetTooltipSubject = editPreset?.name ?? "your";
    $: editMenuTitle = editPreset?.name
        ? `Edit: ${truncateName(editPreset.name)}`
        : "Edit";

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
        const activePresetId = get(buildPresetsStore).activePresetId;
        if (!activePresetId) return;

        const activeButton = document.querySelector(
            `[data-preset-id="${activePresetId}"]`,
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
        const name = window.prompt("Preset name", preset.name);
        if (name != null && name.trim() !== "") {
            updatePreset(presetId, { name: name.trim() });
            // Trigger menu position recalculation after name change
            setTimeout(() => presetsContextMenu?.updatePosition(), 0);
        }
    }

    function handleDelete(presetId: string) {
        const data = get(buildPresetsStore);
        const preset = data.presets.find((p) => p.id === presetId);
        if (!preset) return;
        closeEditMenu();
        openModal({
            type: "confirm",
            title: "Delete build preset",
            message: `Are you sure you want to remove "${preset.name}" preset?`,
            confirmLabel: "Delete preset",
            cancelLabel: "Cancel",
            confirmNegative: true,
            titleIcon: TrashSimpleIcon,
            onConfirm: () => {
                const wasActive = data.activePresetId === presetId;
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
        let name: string | null;
        if (skipPrompt) {
            name = "Default";
        } else {
            let counter = 1;
            const existingNames = get(buildPresetsStore).presets.map(
                (p) => p.name,
            );
            let defaultName = `New ${counter}`;
            while (existingNames.includes(defaultName)) {
                counter++;
                defaultName = `New ${counter}`;
            }
            name = window.prompt("Preset name", defaultName);
            if (name == null) return;
        }
        const preset = addPreset(name.trim() || "New", buildCode);
        setActivePresetId(preset.id);
        applyBuildData(tabs, { trees: emptyTrees, owned: emptyOwned });
        closePresetsMenu();
    }

    function handleDeleteAllAndAddNew() {
        const data = get(buildPresetsStore);
        if (data.presets.length === 0) {
            handleAddBuild(true);
            return;
        }
        openModal({
            type: "confirm",
            title: "Delete all presets",
            message:
                "Are you sure you want to delete all build presets? A new default preset will be created.",
            confirmLabel: "Delete all",
            cancelLabel: "Cancel",
            confirmNegative: true,
            titleIcon: TrashSimpleIcon,
            onConfirm: () => {
                data.presets.forEach((preset) => deletePreset(preset.id));
                handleAddBuild(true);
            },
        });
    }
</script>

<Button
    bind:element={presetsButtonElement}
    on:click={openPresetsMenu}
    tooltipText="Change build preset"
    icon={ShareNetworkIcon}
    {disabled}
>
    Preset: {truncateName(activePresetName)}
</Button>

<div use:portal class="presets-menu-portal" class:menu-open={presetsMenuOpen}>
    <ContextMenu
        bind:this={presetsContextMenu}
        x={presetsMenuX}
        y={presetsMenuY}
        isOpen={presetsMenuOpen}
        title="Build Presets"
        onClose={closePresetsMenu}
    >
        <div class="presets-list">
            {#each $buildPresetsStore.presets as preset (preset.id)}
                {@const isActive =
                    preset.id === $buildPresetsStore.activePresetId}
                <div class="preset-row button-group" data-preset-id={preset.id}>
                    <Button
                        class={`preset-name-btn ${isActive ? "active" : ""}`}
                        tooltipText={isActive
                            ? `Active preset: ${truncateName(preset.name)}`
                            : `Switch to preset: ${truncateName(preset.name)}`}
                        aria-label={`Switch to preset: ${truncateName(preset.name)}`}
                        icon={isActive ? CheckIcon : null}
                        on:click={() => switchToPreset(preset.id)}
                    >
                        {truncateName(preset.name)}
                    </Button>
                    <Button
                        class="preset-edit-btn dropdown-button"
                        tooltipText={`Edit preset: ${truncateName(preset.name)}`}
                        aria-label={`Edit preset: ${truncateName(preset.name)}`}
                        icon={DotsThreeVerticalIcon}
                        on:click={(e) => openEditMenu(e, preset.id)}
                    />
                </div>
            {/each}
        </div>
        <div class="button-group">
            <Button
                on:click={() => handleAddBuild()}
                tooltipText="Create an empty build preset"
                icon={PlusIcon}
            >
                Add new build
            </Button>
            <Button
                class="dropdown-button"
                on:click={handleDeleteAllAndAddNew}
                tooltipText="Delete all presets and create a new one"
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
            <Button
                on:click={() => handleRename(editMenuPresetId!)}
                tooltipText="Edit preset name"
                icon={PencilSimpleIcon}
            >
                Rename
            </Button>
            <ShareBuildButton
                title="Share"
                tooltipSubject={editPresetTooltipSubject}
                menuTitle="Share Preset"
                shareUrl={editPresetShareUrl}
                shareTitle={editPresetShareTitle}
                showScreenshot={false}
                disabled={!editPresetShareUrl}
            />
            <Button
                on:click={() => handleDelete(editMenuPresetId!)}
                tooltipText="Remove build preset"
                icon={TrashSimpleIcon}
                negative
            >
                Delete
            </Button>
        </ContextMenu>
    </div>
{/if}

<style>
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
    }

    :global(.preset-name-btn.active) {
        background: rgba(70, 95, 165, 0.4) !important;
        border-color: rgba(120, 156, 240, 0.6) !important;
    }

    :global(.preset-name-btn .button-text) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    :global(.preset-edit-btn) {
        flex-shrink: 0;
    }

    .presets-list {
        max-height: min(400px, 40vh);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
</style>
