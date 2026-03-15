import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("src/lib/RootNodeQuickSettings.svelte"), "utf8");

if (/import.*GearSix/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings should not import GearSix once the shared gear icon exists.",
    );
}

if (!/import\s+\{\s*RootNodeIcon\s*\}\s+from\s+"\.\/customIcons"/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings should import RootNodeIcon from ./customIcons.",
    );
}

if (!/<RootNodeIcon[^>]*class="qs-header-icon"[^>]*aria-hidden="true"/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings should render RootNodeIcon as the quick settings header icon.",
    );
}

if (!/padding:\s*var\(--spacing-md\)\s+var\(--spacing-md\)/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings should make the quick settings header slightly larger with var(--spacing-md) vertical padding.",
    );
}

if (!/width:\s*16px/.test(source) || !/height:\s*16px/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings should size the quick settings header icon to 16px so it stays noticeable.",
    );
}

if (!/font-size:\s*var\(--font-sm\)/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings should bump the header title to var(--font-sm) to match the larger icon.",
    );
}
