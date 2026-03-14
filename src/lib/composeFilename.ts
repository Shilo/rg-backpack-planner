import { EXPORT_EXT } from "./buildImageExport/imageFormat";

let composeFilenameSequence = 0;

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
    suffix?: string,
): string {
    const presetSegment = encodeFilenameSegment(presetName);
    const tabSegment = encodeFilenameSegment(tabId);
    const suffixSegment = suffix
        ? `_${encodeFilenameSegment(suffix)}`
        : "";
    return `${presetSegment}_${tabSegment}${suffixSegment}${EXPORT_EXT}`;
}

export function createComposeImageFilenameSuffix(now = Date.now()): string {
    const timeSegment = now.toString(36).slice(-5).padStart(5, "0");
    const sequenceSegment = composeFilenameSequence.toString(36);
    composeFilenameSequence = (composeFilenameSequence + 1) % 36;
    return `${timeSegment}${sequenceSegment}`;
}
