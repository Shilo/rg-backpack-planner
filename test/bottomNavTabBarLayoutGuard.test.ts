import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const bottomNavBarPath = resolve("src/lib/BottomNavBar.svelte");
const bottomNavBarSource = readFileSync(bottomNavBarPath, "utf8");

const tabBarPath = resolve("src/lib/TabBar.svelte");
const tabBarSource = readFileSync(tabBarPath, "utf8");

if (
    !/:global\(\.bottom-nav-bar\s*>\s*\.tab-bar\)\s*\{[\s\S]*flex:\s*1\s+1\s+0%?;[\s\S]*width:\s*0;[\s\S]*min-width:\s*0;[\s\S]*\}/.test(
        bottomNavBarSource,
    )
) {
    throw new Error(
        "BottomNavBar should force the TabBar flex item to use flex:1 1 0 and width:0 so side-menu and fullscreen tabs cannot collapse to intrinsic content width.",
    );
}

if (
    !/:global\(\.bottom-nav-bar\s*>\s*\.tab-bar\s*>\s*\.tab-bar__tabs\)\s*\{[\s\S]*width:\s*100%;[\s\S]*min-width:\s*0;[\s\S]*\}/.test(
        bottomNavBarSource,
    )
) {
    throw new Error(
        "BottomNavBar should enforce width:100% and min-width:0 on the nested tab strip to prevent narrow-column tab rendering.",
    );
}

if (!/\.tab-bar\s*\{[\s\S]*display:\s*flex;[\s\S]*width:\s*100%;/.test(tabBarSource)) {
    throw new Error(
        "TabBar root should be a width-constrained flex container so its internal tab strip reliably fills available space.",
    );
}

if (!/\.tab-bar__tabs\s*\{[\s\S]*width:\s*100%;/.test(tabBarSource)) {
    throw new Error(
        "TabBar tab strip should declare width:100% to avoid shrinking to intrinsic content width.",
    );
}
