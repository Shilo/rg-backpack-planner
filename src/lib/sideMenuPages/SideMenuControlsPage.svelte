<script lang="ts">
    import { onMount } from "svelte";
    import { t } from "svelte-whisper";
    import CollapsibleSection from "../CollapsibleSection.svelte";
    import TableRow from "../TableRow.svelte";
    import InputChips from "../InputChips.svelte";
    import {
        type ControlSection,
        SECTIONS,
        getControlActions,
        filterByDevice,
    } from "./controlsData";
    import { getActionTrigger } from "./controlsTriggers";
    import { treeLevels, sumLevels } from "../treeLevelsStore";
    import { isPreviewMode } from "../previewModeStore";

    export let onClose: (() => void) | null = null;
    export let activeTreeIndex = 0;

    let showMouse = true;
    let showTouch = true;
    let showKeyboard = true;

    let sectionOpen: Record<ControlSection, boolean> = {
        hud: true,
        node: true,
        tree: true,
    };

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

    onMount(detectInputSupport);

    $: actions = getControlActions($t);
    $: hasLevels = sumLevels($treeLevels?.[activeTreeIndex]) > 0;

    function getTrigger(actionId: string): (() => void) | undefined {
        if (!onClose) return undefined;
        if (actionId === "hud-reset-tree" && !hasLevels) return undefined;
        if (actionId === "hud-preview-indicator" && !$isPreviewMode)
            return undefined;
        return getActionTrigger(actionId, onClose);
    }

    $: grouped = SECTIONS.map((key) => ({
        key,
        title: $t(`sideMenu.sections.${key}`),
        items: actions
            .filter((a) => a.section === key)
            .map((a) => ({
                ...a,
                filteredInputs: filterByDevice(
                    a.inputs,
                    showMouse,
                    showTouch,
                    showKeyboard,
                ),
                trigger: getTrigger(a.id),
            }))
            .filter((a) => a.filteredInputs.length > 0),
    }));
</script>

<div class="controls-page">
    {#each grouped as section}
        <CollapsibleSection
            title={section.title}
            bind:isOpen={sectionOpen[section.key]}
        >
            <ul class="control-list">
                {#each section.items as action (action.id)}
                    <TableRow
                        title={action.title}
                        description={action.description}
                        onclick={action.trigger}
                    >
                        <svelte:component
                            this={action.icon}
                            slot="icon"
                        />
                        {#each action.filteredInputs as input}
                            <InputChips
                                keys={input.keys}
                                tint={input.device}
                                inline={input.inline ?? false}
                            />
                        {/each}
                    </TableRow>
                {/each}
            </ul>
        </CollapsibleSection>
    {/each}
</div>

<style>
    .controls-page {
        display: flex;
        flex-direction: column;
        min-width: 0;
        margin-inline: calc(-1 * var(--spacing-md));
    }

    .control-list {
        list-style: none;
        margin: 0;
        padding: 0;
    }
</style>
