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

if (/drawRoundedRect\(ctx, x, y, width, Math\.max\(8, height \* 0\.46\), radius\)/.test(source)) {
    throw new Error(
        "captureService should not draw the highlight as a separate top-half rounded panel inside the card.",
    );
}

if (!/ctx\.createLinearGradient\(x, y, x, y \+ height\)/.test(source)) {
    throw new Error(
        "captureService should render the highlight as a full-card surface wash instead of a nested rounded block.",
    );
}

const fullCardPathMatches = source.match(
    /drawRoundedRect\(ctx, cardX, cardY, metrics\.width, metrics\.height, metrics\.radius\);/g,
);

if (!fullCardPathMatches || fullCardPathMatches.length < 2) {
    throw new Error(
        "captureService should redraw the full card path before stroking so the border outlines the entire card.",
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

if (/const iconSize = valueFontSize;/.test(source)) {
    throw new Error(
        "captureService should not leave the tech crystal icon at the raw font-size box when the hex shape reads visually smaller.",
    );
}

if (/TECH_CRYSTAL_ICON_OPTICAL_SCALE/.test(source)) {
    throw new Error(
        "captureService should not rely on a guessed optical scale for the tech crystal icon.",
    );
}

if (!/const valueMetrics = ctx\.measureText\(valueText\);/.test(source)) {
    throw new Error(
        "captureService should measure the value row before sizing the tech crystal icon.",
    );
}

if (!/actualBoundingBoxAscent/.test(source) || !/actualBoundingBoxDescent/.test(source)) {
    throw new Error(
        "captureService should use painted text bounds when matching the tech crystal icon height to the value row.",
    );
}

if (!/const iconSize = valuePaintedHeight > 0 \? valuePaintedHeight : valueFontSize;/.test(source)) {
    throw new Error(
        "captureService should size the tech crystal icon from the painted text height, with a font-size fallback.",
    );
}

if (!/ctx\.strokeStyle = cardBorderSoft/.test(source)) {
    throw new Error(
        "captureService should use a quieter border treatment for the restyled card.",
    );
}
