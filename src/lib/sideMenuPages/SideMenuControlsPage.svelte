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

    let showMouse = true;
    let showTouch = true;
    let showKeyboard = true;

    let sectionOpen: Record<ControlSection, boolean> = {
        hud: true,
        node: true,
        tree: false,
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

        sectionOpen.node = supportsMouse;
    }

    onMount(detectInputSupport);

    $: actions = getControlActions($t);

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
            })),
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
                    >
                        <svelte:component
                            this={action.icon}
                            slot="icon"
                        />
                        {#each action.filteredInputs as input}
                            <InputChips
                                keys={input.keys}
                                tint={input.device}
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
    }

    .control-list {
        list-style: none;
        margin: 0;
        padding: 0;
    }
</style>
