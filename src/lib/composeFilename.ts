import { EXPORT_EXT } from "./buildImageExport/imageFormat";

function encodeFilenameSegment(value: string): string {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
    if (!normalized) return "build";

    let encoded = "";
    const textEncoder = new TextEncoder();
    for (const char of normalized) {
        if (/^[a-z0-9_-]$/.test(char)) {
            encoded += char;
            continue;
        }
        const uriEncoded = encodeURIComponent(char).toLowerCase();
        if (uriEncoded !== char) {
            encoded += uriEncoded;
            continue;
        }
        for (const byte of textEncoder.encode(char)) {
            encoded += `%${byte.toString(16).padStart(2, "0")}`;
        }
    }

    return encoded || "build";
}

export function createComposeImageFilename(
    presetName: string,
    tabId: string,
): string {
    const presetSegment = encodeFilenameSegment(presetName);
    const tabSegment = encodeFilenameSegment(tabId);
    return `${presetSegment}_${tabSegment}${EXPORT_EXT}`;
}
