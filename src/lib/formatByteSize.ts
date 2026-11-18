import { formatNumber } from "svelte-whisper";

const KIB = 1024;
const MIB = 1024 * 1024;

/**
 * A byte count as bytes, kB or MB (1024-based), in the active locale or `locale`.
 * Components without runes pass `$locale` so the text follows a language switch.
 */
export function formatByteSize(bytes: number, locale?: string): string {
    if (bytes < KIB) {
        return formatNumber(Math.max(0, bytes), { style: "unit", unit: "byte", unitDisplay: "short" }, locale);
    }
    const large = bytes >= MIB;
    return formatNumber(bytes / (large ? MIB : KIB), {
        style: "unit",
        unit: large ? "megabyte" : "kilobyte",
        unitDisplay: "short",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }, locale);
}
