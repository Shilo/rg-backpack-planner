<!--
    Decorative animated dot-grid background.
    Single layer of dots drifts diagonally via transform (GPU-accelerated).

    Uses isolation:isolate to form its own stacking context —
    this is load-bearing: without it, child pseudo-elements can
    create stacking contexts that trap sibling fixed-position
    elements (e.g. context menus) at a lower z-level.
-->
<div class="starfield" aria-hidden="true"></div>

<style>
    .starfield {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
        isolation: isolate;
    }

    .starfield::before {
        content: "";
        position: absolute;
        inset: -150px;
        background: radial-gradient(
            circle,
            color-mix(in srgb, var(--border-subtle) 35%, transparent) 2px,
            transparent 2px
        );
        background-size: 32px 32px;
        animation: drift 35s linear infinite;
    }

    @keyframes drift {
        0% {
            transform: translate(0, 0) scale(1);
        }
        50% {
            transform: translate(48px, 24px) scale(1.05);
        }
        100% {
            transform: translate(96px, 48px) scale(1);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .starfield::before {
            animation: none;
        }
    }
</style>
