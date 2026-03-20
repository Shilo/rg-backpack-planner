<script lang="ts">
    import { onMount, tick } from "svelte";
    import { TechCrystalIcon } from "./customIcons";
    import { tooltipStore } from "./tooltip";
    import { formatNumber } from "svelte-whisper";
    import { portal } from "./portal";
    import { textSize } from "./textSizeStore";

    let tooltipEl: HTMLDivElement | null = null;
    let boundedX = 0;
    let boundedY = 0;

    const TOOLTIP_MARGIN = 8;
    /** Max tooltip size as % of viewport (width and height); prevents tooltip from ever exceeding this. */
    const TOOLTIP_MAX_VIEWPORT_PERCENT = 85;
    /** Minimum distance from touch point to tooltip edge so the finger doesn't cover text */
    const FINGER_AVOID_OFFSET = 52;
    const HOVER_OFFSET = 12;

    function clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
    }

    function isAnchorInsideTooltip(
        anchorX: number,
        anchorY: number,
        left: number,
        top: number,
        width: number,
        height: number,
    ) {
        return (
            anchorX >= left &&
            anchorX <= left + width &&
            anchorY >= top &&
            anchorY <= top + height
        );
    }

    function updateBounds() {
        if (!tooltipEl) {
            boundedX = $tooltipStore.x;
            boundedY = $tooltipStore.y;
            return;
        }
        const viewport = window.visualViewport;
        const viewportWidth = viewport?.width ?? window.innerWidth;
        const viewportHeight = viewport?.height ?? window.innerHeight;
        const viewportLeft = viewport?.offsetLeft ?? 0;
        const viewportTop = viewport?.offsetTop ?? 0;
        const rect = tooltipEl.getBoundingClientRect();
        const anchorX = $tooltipStore.x;
        const anchorY = $tooltipStore.y;

        const minLeft = TOOLTIP_MARGIN + viewportLeft;
        const maxLeft =
            viewportLeft + viewportWidth - rect.width - TOOLTIP_MARGIN;
        const minTop = TOOLTIP_MARGIN + viewportTop;
        const maxTop =
            viewportTop + viewportHeight - rect.height - TOOLTIP_MARGIN;

        const isTouch = !window.matchMedia("(hover: hover) and (pointer: fine)")
            .matches;
        const offset = isTouch ? FINGER_AVOID_OFFSET : HOVER_OFFSET;

        /** Placement candidates: above, below, right, left. Each yields { left, top }. */
        const candidates: Array<{ left: number; top: number }> = [
            {
                left: anchorX - rect.width / 2,
                top: anchorY - rect.height - offset,
            },
            { left: anchorX - rect.width / 2, top: anchorY + offset },
            { left: anchorX + offset, top: anchorY - rect.height / 2 },
            {
                left: anchorX - rect.width - offset,
                top: anchorY - rect.height / 2,
            },
        ];

        for (const candidate of candidates) {
            const left = clamp(candidate.left, minLeft, maxLeft);
            const top = clamp(candidate.top, minTop, maxTop);

            if (
                !isAnchorInsideTooltip(
                    anchorX,
                    anchorY,
                    left,
                    top,
                    rect.width,
                    rect.height,
                )
            ) {
                boundedX = left;
                boundedY = top;
                return;
            }
        }

        /** Fallback: pick placement that maximizes distance from anchor to tooltip center */
        let bestLeft = candidates[0].left;
        let bestTop = candidates[0].top;
        let bestDist = -1;
        for (const candidate of candidates) {
            const left = clamp(candidate.left, minLeft, maxLeft);
            const top = clamp(candidate.top, minTop, maxTop);
            const centerX = left + rect.width / 2;
            const centerY = top + rect.height / 2;
            const dist = Math.hypot(anchorX - centerX, anchorY - centerY);
            if (dist > bestDist) {
                bestDist = dist;
                bestLeft = left;
                bestTop = top;
            }
        }
        boundedX = bestLeft;
        boundedY = bestTop;
    }

    onMount(() => {
        const handleResize = () => {
            if ($tooltipStore.isOpen) {
                updateBounds();
            }
        };
        const viewport = window.visualViewport;
        window.addEventListener("resize", handleResize);
        viewport?.addEventListener("resize", handleResize);
        viewport?.addEventListener("scroll", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            viewport?.removeEventListener("resize", handleResize);
            viewport?.removeEventListener("scroll", handleResize);
        };
    });

    $: if ($tooltipStore.isOpen) {
        $tooltipStore.x;
        $tooltipStore.y;
        $textSize;
        tick().then(updateBounds);
    }

    $: tooltipMaxViewport = TOOLTIP_MAX_VIEWPORT_PERCENT;
</script>

{#if $tooltipStore.isOpen}
    <!-- Wrapper keeps portaled node from being component's only top-level node (Svelte 5 DOM tracking). -->
    <div hidden>
        <div use:portal>
            <div
                class="tooltip"
                bind:this={tooltipEl}
                style="--tooltip-max-vw: {tooltipMaxViewport}; --tooltip-max-vh: {tooltipMaxViewport}; left: {boundedX}px; top: {boundedY}px;"
                aria-hidden="true"
            >
                {#each $tooltipStore.sections as section}
                    {#if section.type === "text"}
                        <div class="tooltip-line">{section.value}</div>
                    {:else if section.type === "shortcut"}
                        <div class="tooltip-shortcut">{section.value}</div>
                    {/if}
                {/each}
                {#if $tooltipStore.sections.some((s) => s.type === "action-preview")}
                    <div class="tooltip-action-grid">
                        {#each $tooltipStore.sections as section}
                            {#if section.type === "action-preview"}
                                <div
                                    class="tooltip-action-line"
                                    class:tooltip-action-down={section.direction ===
                                        "down"}
                                >
                                    <span class="tooltip-action-arrow"
                                        >{section.direction === "up"
                                            ? "\u25B2"
                                            : "\u25BC"}</span
                                    >
                                    <span class="tooltip-action-level"
                                        >Lv {formatNumber(
                                            section.targetLevel,
                                        )}</span
                                    >
                                    <TechCrystalIcon
                                        size={14}
                                        weight="fill"
                                        class="tooltip-action-crystal"
                                    />
                                    <span class="tooltip-action-cost"
                                        >{section.direction === "up"
                                            ? "\u2212"
                                            : "+"}{section.crystalCost}</span
                                    >
                                </div>
                            {/if}
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
