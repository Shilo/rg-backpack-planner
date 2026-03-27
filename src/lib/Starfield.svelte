<!--
    Decorative animated dot-grid background.
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

    .starfield::before,
    .starfield::after {
        content: '';
        position: absolute;
        inset: -14px;
    }

    .starfield::before {
        background: radial-gradient(
            circle,
            color-mix(in srgb, var(--border-subtle) 35%, transparent) 2px,
            transparent 2px
        );
        background-size: 32px 32px;
        animation: starfield-a 35s ease-in-out infinite;
    }

    .starfield::after {
        background: radial-gradient(
            circle,
            color-mix(in srgb, var(--border-subtle) 25%, transparent) 1.2px,
            transparent 1.2px
        );
        background-size: 48px 48px;
        background-position: 14px 18px;
        animation: starfield-b 45s ease-in-out infinite;
    }

    @keyframes starfield-a {
        0%        { opacity: 0.6;  transform: translate(0, 0)          scale(1); }
        8%        { opacity: 0.85; transform: translate(5px, -7px)     scale(1.015); }
        17%       { opacity: 1;    transform: translate(10px, -14px)   scale(1.03); }
        25%       { opacity: 0.8;  transform: translate(3px, -12px)    scale(1.02); }
        33%       { opacity: 0.6;  transform: translate(-4px, -10px)   scale(1); }
        42%       { opacity: 0.85; transform: translate(-9px, -4px)    scale(1.02); }
        50%       { opacity: 1;    transform: translate(-14px, 2px)    scale(1.03); }
        58%       { opacity: 0.75; transform: translate(-10px, 7px)    scale(1.015); }
        67%       { opacity: 0.6;  transform: translate(-6px, 12px)    scale(1); }
        75%       { opacity: 0.85; transform: translate(1px, 9px)      scale(1.02); }
        83%       { opacity: 1;    transform: translate(8px, 6px)      scale(1.03); }
        92%       { opacity: 0.75; transform: translate(4px, 3px)      scale(1.015); }
        100%      { opacity: 0.6;  transform: translate(0, 0)          scale(1); }
    }

    @keyframes starfield-b {
        0%        { opacity: 0.85; transform: translate(0, 0)          scale(1.02); }
        7%        { opacity: 0.65; transform: translate(-4px, -5px)    scale(1.01); }
        14%       { opacity: 0.5;  transform: translate(-8px, -10px)   scale(1); }
        21%       { opacity: 0.7;  transform: translate(-10px, -3px)   scale(1.01); }
        29%       { opacity: 0.85; transform: translate(-12px, 4px)    scale(1.02); }
        36%       { opacity: 0.65; transform: translate(-5px, 9px)     scale(1.01); }
        43%       { opacity: 0.5;  transform: translate(2px, 14px)     scale(1); }
        50%       { opacity: 0.7;  transform: translate(7px, 10px)     scale(1.01); }
        57%       { opacity: 0.85; transform: translate(12px, 6px)     scale(1.02); }
        64%       { opacity: 0.65; transform: translate(11px, -1px)    scale(1.01); }
        71%       { opacity: 0.5;  transform: translate(10px, -8px)    scale(1); }
        79%       { opacity: 0.7;  transform: translate(4px, -10px)    scale(1.01); }
        86%       { opacity: 0.85; transform: translate(-2px, -12px)   scale(1.02); }
        93%       { opacity: 0.65; transform: translate(-1px, -6px)    scale(1.01); }
        100%      { opacity: 0.85; transform: translate(0, 0)          scale(1.02); }
    }

    @media (prefers-reduced-motion: reduce) {
        .starfield::before,
        .starfield::after {
            animation: none;
        }
    }
</style>
