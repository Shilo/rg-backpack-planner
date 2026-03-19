import { readFileSync } from "node:fs";
import { resolve } from "node:path";

console.log("  ignoreTechCrystalBudgetStore");

const storePath = resolve("src/lib/ignoreTechCrystalBudgetStore.ts");
let storeSource = "";

try {
    storeSource = readFileSync(storePath, "utf8");
} catch {
    throw new Error("ignoreTechCrystalBudgetStore.ts should exist.");
}

if (!/DEFAULT_IGNORE_TECH_CRYSTAL_BUDGET\s*=\s*false/.test(storeSource)) {
    throw new Error("Store default should be false.");
}

if (!/getItem\("ignore-tech-crystal-budget"\)/.test(storeSource)) {
    throw new Error("Store should read from ignore-tech-crystal-budget storage key.");
}

if (!/setItem\("ignore-tech-crystal-budget",\s*String\(value\)\)/.test(storeSource)) {
    throw new Error("Store should persist boolean values as strings.");
}

if (!/resetToDefault:\s*\(\)\s*=>\s*\{/.test(storeSource)) {
    throw new Error("Store should expose resetToDefault().");
}

const generalPagePath = resolve("src/lib/sideMenuPages/GeneralSettingsPage.svelte");
const generalPageSource = readFileSync(generalPagePath, "utf8");

if (!/ignoreTechCrystalBudget\.resetToDefault\(\)/.test(generalPageSource)) {
    throw new Error(
        "GeneralSettingsPage reset should include ignoreTechCrystalBudget.resetToDefault().",
    );
}

console.log("    \u2713 store has correct default, storage key, persistence, and resetToDefault");
console.log("    \u2713 GeneralSettingsPage includes resetToDefault call");
console.log("  \u2713 ignoreTechCrystalBudgetStore\n");
