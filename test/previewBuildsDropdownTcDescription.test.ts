// test/previewBuildsDropdownTcDescription.test.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve("src/lib/buttons/PreviewBuildsDropdown.svelte"),
    "utf8",
);

if (!source.includes("calculateTechCrystalsSpent")) {
    throw new Error(
        "PreviewBuildsDropdown should import and use calculateTechCrystalsSpent from techCrystalStore",
    );
}

if (!source.includes("TechCrystalIcon")) {
    throw new Error(
        "PreviewBuildsDropdown should import TechCrystalIcon from customIcons",
    );
}

if (!source.includes("descriptionIcon={build.tcSpent")) {
    throw new Error(
        "PreviewBuildsDropdown should wire tcSpent to the descriptionIcon prop on each premade build Button",
    );
}

if (!source.includes("toLocaleString()")) {
    throw new Error(
        "PreviewBuildsDropdown should format the TC count with toLocaleString()",
    );
}

if (!source.includes("tcSpent > 0")) {
    throw new Error(
        "PreviewBuildsDropdown should suppress the description when tcSpent is 0 (no transient zero display)",
    );
}
