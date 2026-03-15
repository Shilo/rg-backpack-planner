// test/previewBuildsDropdownTcDescription.test.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve("src/lib/buttons/PreviewBuildsDropdown.svelte"),
    "utf8",
);
const en = JSON.parse(readFileSync(resolve("src/locales/en.json"), "utf8"));
const ja = JSON.parse(readFileSync(resolve("src/locales/ja.json"), "utf8"));
const zh = JSON.parse(readFileSync(resolve("src/locales/zh.json"), "utf8"));

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

if (!source.includes('$t("preview.techCrystalsDescription"')) {
    throw new Error(
        "PreviewBuildsDropdown should localize the Tech Crystals description with preview.techCrystalsDescription",
    );
}

if (source.includes("toLocaleString()} Tech Crystals")) {
    throw new Error(
        "PreviewBuildsDropdown should not hard-code the Tech Crystals description in English",
    );
}

if (typeof en.preview?.techCrystalsDescription !== "string") {
    throw new Error(
        "English locale should define preview.techCrystalsDescription",
    );
}

if (typeof ja.preview?.techCrystalsDescription !== "string") {
    throw new Error(
        "Japanese locale should define preview.techCrystalsDescription",
    );
}

if (typeof zh.preview?.techCrystalsDescription !== "string") {
    throw new Error(
        "Chinese locale should define preview.techCrystalsDescription",
    );
}
