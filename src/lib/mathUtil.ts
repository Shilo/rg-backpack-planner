/**
 * Formats a number with thousand separators (commas).
 * @param num - The number to format
 * @returns The formatted string with thousand separators
 */
export function formatNumber(num: number): string {
    return num.toLocaleString();
}

/**
 * Formats a decimal value as a percentage string.
 * Multiplies by 100, formats with locale-aware separators, and appends "%".
 * @param decimal - The raw decimal value (e.g., 0.2 becomes "20%")
 * @returns Formatted percentage string
 */
export function formatPercent(decimal: number): string {
    if (decimal === 0) return "0%";
    const percent = decimal * 100;
    if (Number.isInteger(percent)) return formatNumber(percent) + "%";
    return String(parseFloat(percent.toPrecision(3))) + "%";
}
