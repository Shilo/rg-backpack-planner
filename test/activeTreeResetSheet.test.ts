import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const modalStoreSource = readFileSync(resolve("src/lib/modalStore.ts"), "utf8");
const modalHostSource = readFileSync(resolve("src/lib/ModalHost.svelte"), "utf8");
const activeTreeResetButtonSource = readFileSync(
    resolve("src/lib/ActiveTreeResetButton.svelte"),
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

if (!/export let activeLevels\b/.test(activeTreeResetButtonSource)) {
    throw new Error(
        "ActiveTreeResetButton should accept activeLevels so it can enable or disable branch choices.",
    );
}

if (!/export let onResetBranch\b/.test(activeTreeResetButtonSource)) {
    throw new Error(
        "ActiveTreeResetButton should accept onResetBranch to trigger orange, blue, or yellow resets.",
    );
}

if (!/openResetTreeChoicesModal/.test(activeTreeResetButtonSource)) {
    throw new Error(
        "ActiveTreeResetButton should use the shared reset tree choice modal helper.",
    );
}

if (!/type:\s*"resetTreeChoices"/.test(resetTreeModalSource)) {
    throw new Error(
        'resetTreeModal should open the dedicated "resetTreeChoices" modal instead of a binary confirm modal.',
    );
}

console.log("activeTreeResetSheet: all tests passed");
