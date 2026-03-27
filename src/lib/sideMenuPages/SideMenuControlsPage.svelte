<script lang="ts">
    import { onMount } from "svelte";
    import { t } from "svelte-whisper";
    import { InfoIcon, BookOpenTextIcon } from "phosphor-svelte";
    import type { AboutScrollTarget } from "./SideMenuSettingsPage.svelte";
    import Button from "../Button.svelte";
    import ButtonGroup from "../ButtonGroup.svelte";
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
    import { showOnboarding } from "../onboarding/onboardingStore";

    export let onClose: (() => void) | null = null;
    export let onOpenAbout:
        | ((aboutScrollTarget?: AboutScrollTarget | null) => void)
        | null = null;
    export let activeTreeIndex = 0;

    function handleTutorial() {
        showOnboarding();
        onClose?.();
    }

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

    function getTrigger(actionId: string, levels: boolean, isPreview: boolean): (() => void) | undefined {
        if (!onClose) return undefined;
        if (actionId === "hud-reset-tree" && !levels) return undefined;
        if (actionId === "hud-preview-indicator" && !isPreview)
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
                trigger: getTrigger(a.id, hasLevels, $isPreviewMode),
            }))
            .filter((a) => a.filteredInputs.length > 0),
    }));
</script>

<ButtonGroup class="controls-header">
    <Button
        small
        icon={InfoIcon}
        iconSize={22}
        on:click={() => onOpenAbout?.("game-rules")}
    >
        {$t("sideMenu.sections.instructions")}
    </Button>
    <Button
        small
        icon={BookOpenTextIcon}
        iconSize={22}
        on:click={handleTutorial}
    >
        {$t("controls.tutorial")}
    </Button>
</ButtonGroup>
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
                        onclick={action.trigger} iconSize={22}
                    >
                        <svelte:component this={action.icon} slot="icon" />
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
    :global(.controls-header) {
        width: 100%;
    }

    :global(.controls-header > *) {
        flex: 1;
    }

    :global(.controls-header .button) {
        padding: var(--spacing-xs) var(--spacing-md) var(--spacing-xs)
            var(--radius);
    }

    .controls-page {
        display: flex;
        flex-direction: column;
        min-width: 0;
        margin-top: calc(var(--spacing-md) - var(--spacing-xl));
        margin-left: calc(-1 * var(--spacing-md));
        margin-right: calc(
            -1 * max(0px, var(--spacing-md) - var(--scrollbar-visual-width, 0px))
        );
    }

    .control-list {
        list-style: none;
        margin: 0;
        padding: 0;
    }
</style>
