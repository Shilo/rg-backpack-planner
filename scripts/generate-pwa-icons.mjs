import sharp from "sharp";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const BG_COLOR = "#060b16";
const STROKE_COLOR = "#6a8dff";

const ICON_PATHS = `
    <path d="M 885.0,138.0 L 557.0,45.0 L 237.0,112.0 L 61.0,373.0 L 15.0,644.0 L 191.0,914.0 L 454.0,1015.0 L 785.0,971.0 L 1007.0,684.0 L 1055.0,473.0 Z"/>
    <line x1="245.7" y1="119.7" x2="277.3" y2="171.3"/>
    <line x1="277.3" y1="171.3" x2="677.0" y2="185.2"/>
    <line x1="677.0" y1="185.2" x2="866.2" y2="144.0"/>
    <line x1="277.3" y1="171.3" x2="133.0" y2="488.8"/>
    <line x1="677.0" y1="185.2" x2="748.0" y2="487.8"/>
    <line x1="133.0" y1="488.8" x2="409.3" y2="686.3"/>
    <line x1="748.0" y1="487.8" x2="409.3" y2="686.3"/>
    <line x1="409.3" y1="686.3" x2="452.7" y2="1003.7"/>
    <line x1="133.0" y1="488.8" x2="27.8" y2="630.0"/>
    <line x1="748.0" y1="487.8" x2="998.3" y2="677.3"/>`;

/**
 * Visual bounds of the icon (paths + stroke-width/2 = 40px bleed):
 *   X: -25 … 1095  (width 1120)
 *   Y:   5 … 1055  (height 1050)
 *   Center: (535, 530)
 */

function makeSvg(viewBox, nativeSize, bgColor) {
    const [vx, vy, vw, vh] = viewBox.split(" ").map(Number);
    const bg = bgColor
        ? `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${bgColor}"/>`
        : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${nativeSize}" height="${nativeSize}" viewBox="${viewBox}" fill="none">${bg}<g stroke="${STROKE_COLOR}" stroke-width="80" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS}</g></svg>`;
}

// ~12 % padding per side → icon fills 76 % of canvas (survives rounded-corner clipping)
const REGULAR_VB = "-202 -207 1474 1474";
// ~20 % padding per side → icon fills 60 % (fits maskable safe-zone circle)
const MASKABLE_VB = "-399 -404 1867 1867";
// Tight fit for small favicon
const FAVICON_VB = "-87 -92 1244 1244";

async function renderPng(svg, size, filename) {
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(publicDir, filename));
    console.log(`  ${filename}  (${size}×${size})`);
}

async function renderIco(svg, filename) {
    const pngBuf = await sharp(Buffer.from(svg)).resize(48, 48).png().toBuffer();

    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);

    const entry = Buffer.alloc(16);
    entry.writeUInt8(48, 0);
    entry.writeUInt8(48, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(pngBuf.length, 8);
    entry.writeUInt32LE(22, 12);

    writeFileSync(join(publicDir, filename), Buffer.concat([header, entry, pngBuf]));
    console.log(`  ${filename}  (48×48 ICO)`);
}

async function main() {
    console.log("Generating PWA icons …");

    const regular = makeSvg(REGULAR_VB, 1024, BG_COLOR);
    const maskable = makeSvg(MASKABLE_VB, 1024, BG_COLOR);
    const favicon = makeSvg(FAVICON_VB, 256, null);

    await Promise.all([
        renderPng(regular, 180, "apple-touch-icon-180x180.png"),
        renderPng(regular, 192, "pwa-192x192.png"),
        renderPng(regular, 512, "pwa-512x512.png"),
        renderPng(maskable, 512, "maskable-icon-512x512.png"),
        renderIco(favicon, "favicon.ico"),
    ]);

    console.log("Done.");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
