<script lang="ts">
    import { get } from "svelte/store";
    import {
        DotsThreeVerticalIcon,
        PencilSimpleIcon,
        PlusIcon,
        ShareNetworkIcon,
        TrashIcon,
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
        updateActivePresetEncoded,
    } from "../buildPresetsStore";
    import { decodeBuildData } from "../buildData/encoder";
    import { encodeBuildData } from "../buildData/encoder";
    import { applyBuildData } from "../buildData/applier";
    import { createShareUrl } from "../buildData/url";
    import { treeLevels } from "../treeLevelsStore";
    import { techCrystalsOwned } from "../techCrystalStore";
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
        ? decodeBuildData(editPreset.encoded)
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

    function openPresetsMenu() {
        if (!presetsButtonElement) return;
        const rect = presetsButtonElement.getBoundingClientRect();
        presetsMenuX = rect.left + rect.width / 2;
        presetsMenuY = rect.bottom + 8;
        presetsMenuOpen = true;
        editMenuPresetId = null;
    }

    function closePresetsMenu() {
        presetsMenuOpen = false;
        editMenuPresetId = null;
    }

    function switchToPreset(presetId: string) {
        const data = get(buildPresetsStore);
        const preset = data.presets.find((p) => p.id === presetId);
        if (!preset) return;
        const buildData = decodeBuildData(preset.encoded);
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
            titleIcon: TrashIcon,
            onConfirm: () => {
                const wasActive = data.activePresetId === presetId;
                const remaining = data.presets.filter((p) => p.id !== presetId);
                deletePreset(presetId);
                if (wasActive && remaining.length > 0) {
                    const first = remaining[0];
                    setActivePresetId(first.id);
                    const buildData = decodeBuildData(first.encoded);
                    if (buildData) applyBuildData(tabs, buildData);
                }
                closeEditMenu();
            },
        });
    }

    function handleAddBuild() {
        const emptyTrees = tabs.map(() => []);
        const emptyOwned = 0;
        const encoded = encodeBuildData({
            trees: emptyTrees,
            owned: emptyOwned,
        });
        const name = window.prompt("Preset name", "New");
        if (name == null) return;
        const preset = addPreset(name.trim() || "New", encoded);
        setActivePresetId(preset.id);
        applyBuildData(tabs, { trees: emptyTrees, owned: emptyOwned });
        closePresetsMenu();
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
                <div class="preset-row button-group">
                    <Button
                        class="preset-name-btn"
                        tooltipText={`Switch to preset: ${truncateName(preset.name)}`}
                        aria-label={`Switch to preset: ${truncateName(preset.name)}`}
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
        <Button
            on:click={handleAddBuild}
            tooltipText="Create an empty build preset"
            icon={PlusIcon}
        >
            Add new build
        </Button>
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
                icon={TrashIcon}
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
