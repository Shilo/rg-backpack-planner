import { onDestroy } from "svelte";

/**
 * Runs `fn` now, and again before the next render whenever reactive state it
 * reads changes, until the calling component is destroyed. Call it during
 * component initialisation.
 *
 * Legacy `$:` statements only re-run when a variable named in the statement
 * changes, so they miss state read through function calls such as `t()`,
 * `getLocale()` and `formatNumber()`. Use this for those statements instead.
 */
export function watch(fn: () => void): void {
    onDestroy($effect.root(() => {
        $effect.pre(fn);
    }));
}
