import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("src/lib/ModalHost.svelte"), "utf8");

if (!/let renderedModal: ModalPayload \| null = null;/.test(source)) {
    throw new Error(
        "ModalHost should keep a renderedModal snapshot so transitions do not read from a null store during close.",
    );
}

if (!/\{#if \$modalStore && renderedModal\}/.test(source)) {
    throw new Error(
        "ModalHost should keep the block lifecycle tied to $modalStore while guarding the snapshot as non-null for template rendering.",
    );
}

if (!/transition:modalShellTransition=\{\{ sheet: renderedModal\.type === "resetTreeChoices" \}\}/.test(source)) {
    throw new Error(
        "ModalHost should drive bottom-sheet transitions from the stable renderedModal snapshot.",
    );
}

if (/\{#if renderedModal\}/.test(source)) {
    throw new Error(
        "ModalHost should not keep the if-block keyed to renderedModal, or the modal can never start its outro after closeModal().",
    );
}

if (!/function handleBackdropOutroEnd\(\) \{[\s\S]*renderedModal = null;[\s\S]*\}/.test(source)) {
    throw new Error(
        "ModalHost should clear renderedModal only after the backdrop outro completes.",
    );
}

console.log("modalHostRenderedModalSnapshot: all tests passed");
