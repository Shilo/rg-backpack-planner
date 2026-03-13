<script context="module" lang="ts">
    export type SettingsPageId = "root" | "node" | "appearance" | "general" | "about";
</script>

<script lang="ts">
    import type { TreeViewState } from "../Tree.svelte";
    import { tick } from "svelte";
    import { t } from "svelte-whisper";

    export let activeTreeName = "";
    export let activeTreeIndex = 0;
    export let activeTreeViewState: TreeViewState | null = null;
    export let activeTreeFocusViewState: TreeViewState | null = null;
    export let onClose: (() => void) | null = null;
    export let onResetAll: (() => void) | null = null;
    export let onResetTree: (() => void) | null = null;
    export let onFocusInView: (() => void) | null = null;
    export let scrollContentElement: HTMLElement | null = null;

    // --- Lazy loading (cache-variable pattern matching SideMenu.svelte) ---
    let RootPage: any = null;
    let NodePage: any = null;
    let AppearancePage: any = null;
    let GeneralPage: any = null;
    let AboutPage: any = null;

    async function loadPage(page: SettingsPageId): Promise<void> {
        if (page === "root" && !RootPage) {
            RootPage = (await import("./RootSettingsPage.svelte")).default;
        } else if (page === "node" && !NodePage) {
            NodePage = (await import("./NodeSettingsPage.svelte")).default;
        } else if (page === "appearance" && !AppearancePage) {
            AppearancePage = (await import("./AppearanceSettingsPage.svelte"))
                .default;
        } else if (page === "general" && !GeneralPage) {
            GeneralPage = (await import("./GeneralSettingsPage.svelte"))
                .default;
        } else if (page === "about" && !AboutPage) {
            AboutPage = (await import("./AboutSettingsPage.svelte")).default;
        }
    }

    // --- Navigation state ---
    let currentPage: SettingsPageId = "root";
    let lastNavigatedPage: SettingsPageId = "root";
    let transitionDirection: "forward" | "back" = "forward";
    let isTransitioning = false;
    let outgoingComponent: any = null;
    let outgoingPage: SettingsPageId = "root";

    $: void loadPage(currentPage);

    $: currentComponent =
        currentPage === "root"
            ? RootPage
            : currentPage === "node"
              ? NodePage
              : currentPage === "appearance"
                ? AppearancePage
                : currentPage === "general"
                  ? GeneralPage
                  : AboutPage;

    let containerElement: HTMLDivElement | null = null;

    function scrollToTop() {
        if (scrollContentElement) {
            scrollContentElement.scrollTop = 0;
        }
    }

    async function navigateTo(page: SettingsPageId) {
        if (isTransitioning || page === currentPage) return;
        lastNavigatedPage = page;
        transitionDirection = "forward";
        outgoingComponent = currentComponent;
        outgoingPage = currentPage;

        // Fix container height during transition
        if (containerElement) {
            containerElement.style.height = `${containerElement.offsetHeight}px`;
        }

        isTransitioning = true;
        currentPage = page;
        await loadPage(page);
        scrollToTop();
        await tick();

        // Measure incoming page height for smooth height animation
        const incomingPanel = containerElement?.querySelector(
            ".settings-page-panel.incoming:not(.active)",
        );
        const incomingHeight =
            incomingPanel?.scrollHeight ?? containerElement?.offsetHeight ?? 0;

        // Wait for transition to end
        requestAnimationFrame(() => {
            // Animate height from outgoing to incoming alongside the slide
            if (containerElement) {
                containerElement.style.transition = "height 0.15s ease";
                containerElement.style.height = `${incomingHeight}px`;
            }

            requestAnimationFrame(() => {
                const onEnd = () => {
                    clearTimeout(fallbackTimeout);
                    isTransitioning = false;
                    outgoingComponent = null;
                    if (containerElement) {
                        containerElement.style.height = "";
                        containerElement.style.transition = "";
                    }
                };
                let fallbackTimeout: ReturnType<typeof setTimeout>;
                const incomingEl = containerElement?.querySelector(
                    ".incoming:not(.active)",
                );
                if (incomingEl) {
                    incomingEl.addEventListener("animationend", onEnd, {
                        once: true,
                    });
                    fallbackTimeout = setTimeout(onEnd, 200);
                } else {
                    onEnd();
                }
            });
        });
    }

    async function navigateBack() {
        if (isTransitioning || currentPage === "root") return;
        transitionDirection = "back";
        outgoingComponent = currentComponent;
        outgoingPage = currentPage;

        if (containerElement) {
            containerElement.style.height = `${containerElement.offsetHeight}px`;
        }

        isTransitioning = true;
        currentPage = "root";
        await loadPage("root");
        scrollToTop();
        await tick();

        // Measure incoming page height for smooth height animation
        const incomingPanel = containerElement?.querySelector(
            ".settings-page-panel.incoming:not(.active)",
        );
        const incomingHeight =
            incomingPanel?.scrollHeight ?? containerElement?.offsetHeight ?? 0;

        requestAnimationFrame(() => {
            // Animate height from outgoing to incoming alongside the slide
            if (containerElement) {
                containerElement.style.transition = "height 0.15s ease";
                containerElement.style.height = `${incomingHeight}px`;
            }

            requestAnimationFrame(() => {
                const onEnd = () => {
                    clearTimeout(fallbackTimeout);
                    isTransitioning = false;
                    outgoingComponent = null;
                    if (containerElement) {
                        containerElement.style.height = "";
                        containerElement.style.transition = "";
                    }
                    // Focus the nav button that was clicked
                    tick().then(() => {
                        const btn = containerElement?.querySelector(
                            `[data-page="${lastNavigatedPage}"]`,
                        );
                        if (btn instanceof HTMLElement) btn.focus();
                    });
                };
                let fallbackTimeout: ReturnType<typeof setTimeout>;
                const incomingEl = containerElement?.querySelector(
                    ".incoming:not(.active)",
                );
                if (incomingEl) {
                    incomingEl.addEventListener("animationend", onEnd, {
                        once: true,
                    });
                    fallbackTimeout = setTimeout(onEnd, 200);
                } else {
                    onEnd();
                }
            });
        });
    }
</script>

<div
    class="settings-page-container"
    class:transitioning={isTransitioning}
    class:forward={isTransitioning && transitionDirection === "forward"}
    class:back={isTransitioning && transitionDirection === "back"}
    bind:this={containerElement}
>
    {#if isTransitioning && outgoingComponent}
        <div class="settings-page-panel outgoing" aria-hidden="true">
            <svelte:component
                this={outgoingComponent}
                {activeTreeName}
                {activeTreeIndex}
                {activeTreeViewState}
                {activeTreeFocusViewState}
                {onClose}
                {onResetAll}
                {onResetTree}
                {onFocusInView}
                onNavigate={navigateTo}
                onBack={navigateBack}
            />
        </div>
    {/if}

    {#if currentComponent}
        <div
            class="settings-page-panel incoming"
            class:active={!isTransitioning}
            role="region"
            aria-label={currentPage === "root"
                ? undefined
                : $t(`settings.pages.${currentPage}`)}
        >
            <svelte:component
                this={currentComponent}
                {activeTreeName}
                {activeTreeIndex}
                {activeTreeViewState}
                {activeTreeFocusViewState}
                {onClose}
                {onResetAll}
                {onResetTree}
                {onFocusInView}
                onNavigate={navigateTo}
                onBack={navigateBack}
            />
        </div>
    {/if}
</div>

<style>
    .settings-page-container {
        position: relative;
    }

    .settings-page-container.transitioning {
        overflow: hidden;
    }

    .settings-page-panel {
        display: grid;
        gap: var(--spacing-lg);
    }

    .settings-page-panel.active {
        position: relative;
    }

    /* --- Transition states --- */
    .settings-page-container.transitioning .settings-page-panel {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
    }

    /* Forward: outgoing slides left, incoming slides in from right */
    .settings-page-container.forward .incoming:not(.active) {
        animation: slide-in-right 0.15s ease forwards;
    }

    .settings-page-container.forward .outgoing {
        animation: slide-out-left 0.15s ease forwards;
    }

    /* Back: outgoing slides right, incoming slides in from left */
    .settings-page-container.back .incoming:not(.active) {
        animation: slide-in-left 0.15s ease forwards;
    }

    .settings-page-container.back .outgoing {
        animation: slide-out-right 0.15s ease forwards;
    }

    @keyframes slide-in-right {
        from {
            transform: translateX(100%);
        }
        to {
            transform: translateX(0);
        }
    }

    @keyframes slide-out-left {
        from {
            transform: translateX(0);
        }
        to {
            transform: translateX(-30%);
        }
    }

    @keyframes slide-in-left {
        from {
            transform: translateX(-30%);
        }
        to {
            transform: translateX(0);
        }
    }

    @keyframes slide-out-right {
        from {
            transform: translateX(0);
        }
        to {
            transform: translateX(100%);
        }
    }
</style>
