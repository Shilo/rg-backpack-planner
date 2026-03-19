import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const modalStoreSource = readFileSync(resolve("src/lib/modalStore.ts"), "utf8");
const modalHostSource = readFileSync(resolve("src/lib/ModalHost.svelte"), "utf8");
const undoRedoToolbarSource = readFileSync(
    resolve("src/lib/UndoRedoToolbar.svelte"),
    "utf8",
);
const resetTreeModalSource = readFileSync(
    resolve("src/lib/resetTreeModal.ts"),
    "utf8",
);

if (!/"resetTreeChoices"/.test(modalStoreSource)) {
    throw new Error(
        'modalStore should support a dedicated "resetTreeChoices" modal type.',
    );
}

if (!/import\s+ResetTreeChoicesModal\s+from\s+"\.\/modals\/ResetTreeChoicesModal\.svelte";/.test(modalHostSource)) {
    throw new Error(
        "ModalHost should import ResetTreeChoicesModal for the branch reset action sheet.",
    );
}

if (!/(?:\$modalStore|renderedModal)\.type === "resetTreeChoices"/.test(modalHostSource)) {
    throw new Error(
        'ModalHost should branch on the modal type === "resetTreeChoices".',
    );
}

if (!/<ResetTreeChoicesModal\b/.test(modalHostSource)) {
    throw new Error(
        "ModalHost should render ResetTreeChoicesModal when the reset choice sheet is open.",
    );
}

if (!/export let activeLevels\b/.test(undoRedoToolbarSource)) {
    throw new Error(
        "UndoRedoToolbar should accept activeLevels so it can enable or disable branch choices.",
    );
}

if (!/export let treeNodes\b/.test(undoRedoToolbarSource)) {
    throw new Error(
        "UndoRedoToolbar should accept treeNodes so reset choices can show accurate Tech Crystal refund totals.",
    );
}

if (!/export let onResetBranch\b/.test(undoRedoToolbarSource)) {
    throw new Error(
        "UndoRedoToolbar should accept onResetBranch to trigger orange, blue, or yellow resets.",
    );
}

if (!/openResetTreeChoicesModal/.test(undoRedoToolbarSource)) {
    throw new Error(
        "UndoRedoToolbar should use the shared reset tree choice modal helper.",
    );
}

if (!/treeNodes/.test(resetTreeModalSource)) {
    throw new Error(
        "resetTreeModal should receive treeNodes so it can calculate refund totals per branch and tree.",
    );
}

if (!/type:\s*"resetTreeChoices"/.test(resetTreeModalSource)) {
    throw new Error(
        'resetTreeModal should open the dedicated "resetTreeChoices" modal instead of a binary confirm modal.',
    );
}

console.log("activeTreeResetSheet: all tests passed");
