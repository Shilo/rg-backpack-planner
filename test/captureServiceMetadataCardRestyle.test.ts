import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve("src/lib/buildImageExport/captureService.ts"),
    "utf8",
);

if (!/const cardMuted = resolveThemeColor\("--text-muted"/.test(source)) {
    throw new Error(
        "captureService should style the tech crystal row with a muted theme color.",
    );
}

if (/const cardAccent = resolveThemeColor\("--accent"/.test(source)) {
    throw new Error(
        "captureService should not keep using the accent color for the tech crystal row.",
    );
}

if (!/const titleFontSize = Math\.round\(fontSize \* 1\.\d+\)/.test(source)) {
    throw new Error(
        "captureService should scale the title line separately from the supporting tech crystal row.",
    );
}

if (!/const valueFontSize = Math\.round\(fontSize \* 0\.\d+\)/.test(source)) {
    throw new Error(
        "captureService should render the tech crystal row smaller than the title.",
    );
}

if (!/function drawMetadataCardHighlight\(/.test(source)) {
    throw new Error(
        "captureService should draw a dedicated surface highlight for the restyled metadata card.",
    );
}

if (!/ctx\.font = `700 \$\{titleFontSize\}px \$\{LABEL_FONT\}`/.test(source)) {
    throw new Error(
        "captureService should draw the title with the stronger typography treatment.",
    );
}

if (!/ctx\.font = `600 \$\{valueFontSize\}px \$\{LABEL_FONT\}`/.test(source)) {
    throw new Error(
        "captureService should draw the tech crystal row with the smaller supporting typography treatment.",
    );
}
