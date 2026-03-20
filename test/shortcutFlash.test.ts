import assert from "node:assert/strict";
import { get } from "svelte/store";
import { shortcutFlash, triggerShortcutFlash, FLASH_DURATION_MS } from "../src/lib/input";

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log("  shortcutFlash");

// --- initial state ---
{
    assert.equal(get(shortcutFlash), null);
    console.log("    ✓ initial state is null");
}

// --- trigger sets value ---
{
    triggerShortcutFlash("undo");
    assert.equal(get(shortcutFlash), "undo");
    console.log("    ✓ triggerShortcutFlash sets store value");
}

// --- auto-clears after FLASH_DURATION_MS ---
{
    triggerShortcutFlash("redo");
    assert.equal(get(shortcutFlash), "redo");
    await wait(FLASH_DURATION_MS + 50);
    assert.equal(get(shortcutFlash), null);
    console.log("    ✓ store auto-clears after FLASH_DURATION_MS");
}

// --- rapid calls reset the timer ---
{
    triggerShortcutFlash("undo");
    await wait(FLASH_DURATION_MS - 50);
    // Still active because we haven't exceeded duration
    assert.equal(get(shortcutFlash), "undo");
    // Re-trigger — should reset the timer
    triggerShortcutFlash("undo");
    await wait(FLASH_DURATION_MS - 50);
    // Should still be active (timer was reset)
    assert.equal(get(shortcutFlash), "undo");
    await wait(100);
    // Now it should have cleared
    assert.equal(get(shortcutFlash), null);
    console.log("    ✓ rapid triggers reset the timer");
}

// --- switching action replaces previous ---
{
    triggerShortcutFlash("undo");
    triggerShortcutFlash("redo");
    assert.equal(get(shortcutFlash), "redo");
    await wait(FLASH_DURATION_MS + 50);
    assert.equal(get(shortcutFlash), null);
    console.log("    ✓ triggering a different action replaces the previous");
}

console.log("  ✓ shortcutFlash\n");
