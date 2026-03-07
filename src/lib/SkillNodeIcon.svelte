<script lang="ts">
    import { getContext } from "svelte";
    import type { SkillId } from "../types/tree";
    import {
        NODE_SKILL_ID_KEY,
        SKILL_NODE_ICON_URLS,
    } from "../config/skillNodeIcons";

    let { class: className = "", ariaHidden = true } = $props<{
        class?: string;
        ariaHidden?: boolean;
        size?: number | string;
    }>();

    const skillId = getContext<SkillId | null>(NODE_SKILL_ID_KEY) ?? null;
    const src = $derived(
        skillId != null ? SKILL_NODE_ICON_URLS[skillId] ?? null : null,
    );
</script>

{#if src}
    <img {src} alt="" class={className} aria-hidden={ariaHidden} />
{/if}
