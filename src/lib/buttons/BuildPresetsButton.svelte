<script lang="ts">
  import { get } from "svelte/store";
  import {
    PencilSimpleIcon,
    PlusIcon,
    ShareNetworkIcon,
    TrashIcon,
  } from "phosphor-svelte";
  import Button from "../Button.svelte";
  import ContextMenu from "../ContextMenu.svelte";
  import { portal } from "../portal";
  import { isPreviewMode } from "../previewModeStore";
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

  let presetsMenuOpen = false;
  let presetsMenuX = 0;
  let presetsMenuY = 0;
  let presetsButtonElement: HTMLButtonElement | null = null;

  let editMenuPresetId: string | null = null;
  let editMenuX = 0;
  let editMenuY = 0;
  let editIconElement: HTMLButtonElement | null = null;

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

  function openEditMenu(event: MouseEvent, presetId: string) {
    event.stopPropagation();
    event.preventDefault();
    editIconElement = event.currentTarget as HTMLButtonElement;
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
    }
  }

  function handleDelete(presetId: string) {
    const data = get(buildPresetsStore);
    const preset = data.presets.find((p) => p.id === presetId);
    if (!preset) return;
    closeEditMenu();
    openModal({
      type: "confirm",
      title: "Delete preset",
      message: `Delete "${preset.name}"?`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      confirmNegative: true,
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
        closePresetsMenu();
      },
    });
  }

  function handleAddBuild() {
    const trees = get(treeLevels);
    const owned = get(techCrystalsOwned);
    const encoded = encodeBuildData({ trees, owned });
    const name = window.prompt("Preset name", "New build");
    if (name == null) return;
    const preset = addPreset(name.trim() || "New build", encoded);
    setActivePresetId(preset.id);
    closePresetsMenu();
  }
</script>

<Button
  bind:element={presetsButtonElement}
  on:click={openPresetsMenu}
  tooltipText="Saved build presets"
  icon={ShareNetworkIcon}
  {disabled}
>
  Presets
</Button>

<div use:portal class="presets-menu-portal" class:menu-open={presetsMenuOpen}>
  <ContextMenu
    x={presetsMenuX}
    y={presetsMenuY}
    isOpen={presetsMenuOpen}
    title="Presets"
    onClose={closePresetsMenu}
  >
    {#each $buildPresetsStore.presets as preset (preset.id)}
      <div class="preset-row">
        <button
          type="button"
          class="preset-name-btn"
          on:click={() => switchToPreset(preset.id)}
        >
          {preset.name}
        </button>
        <button
          type="button"
          class="preset-edit-btn"
          aria-label="Edit preset"
          on:click={(e) => openEditMenu(e, preset.id)}
        >
          <PencilSimpleIcon size={18} />
        </button>
      </div>
    {/each}
    <Button
      on:click={handleAddBuild}
      tooltipText="Save current build as a new preset"
      icon={PlusIcon}
    >
      Add build
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
      title="Edit"
      onClose={closeEditMenu}
    >
      <Button
        on:click={() => handleRename(editMenuPresetId!)}
        tooltipText="Rename preset"
        icon={PencilSimpleIcon}
      >
        Rename
      </Button>
      <Button
        on:click={() => handleDelete(editMenuPresetId!)}
        tooltipText="Delete preset"
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
    z-index: 101;
  }

  .presets-menu-portal.menu-open,
  .presets-menu-portal.edit-submenu {
    pointer-events: auto;
  }

  .preset-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .preset-name-btn {
    flex: 1;
    min-width: 0;
    padding: 8px 10px;
    text-align: left;
    font: inherit;
    color: inherit;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  .preset-name-btn:hover {
    background: rgba(82, 112, 189, 0.25);
  }

  .preset-edit-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    color: rgba(201, 214, 245, 0.75);
  }

  .preset-edit-btn:hover {
    background: rgba(82, 112, 189, 0.25);
    color: inherit;
  }
</style>
