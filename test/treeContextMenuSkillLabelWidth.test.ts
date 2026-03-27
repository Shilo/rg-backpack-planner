import { readFileSync } from "node:fs";
import { resolve } from "node:path";

console.log("  treeContextMenuSkillLabelWidth");

const treeContextMenuListPath = resolve("src/lib/TreeContextMenuList.svelte");
const treeContextMenuListSource = readFileSync(treeContextMenuListPath, "utf8");

if (!/\.special-skills-list\s*\{[\s\S]*grid-template-columns:\s*max-content max-content max-content;/.test(treeContextMenuListSource)) {
    throw new Error(
        "TreeContextMenuList special skills grid should size all three columns to content.",
    );
}

if (!/\.special-skills-list\s*\{[\s\S]*justify-content:\s*start;/.test(treeContextMenuListSource)) {
    throw new Error(
        "TreeContextMenuList special skills grid should stay left-aligned within the menu.",
    );
}

if (!/\.special-skill-item\s*:global\(\.meta-label\)\s*\{[\s\S]*justify-self:\s*start;/.test(treeContextMenuListSource)) {
    throw new Error(
        "TreeContextMenuList special skill labels should align to their content instead of stretching across the grid cell.",
    );
}

if (!/\.special-skill-item\s*:global\(\.meta-label\)\s*\{[\s\S]*white-space:\s*nowrap;/.test(treeContextMenuListSource)) {
    throw new Error(
        "TreeContextMenuList special skill labels should stay on one line.",
    );
}

console.log("    ✓ TreeContextMenuList keeps special skill label width fitted to content");
console.log("  ✓ treeContextMenuSkillLabelWidth\n");
