/**
 * Formats a number with thousand separators (commas).
 * @param num - The number to format
 * @returns The formatted string with thousand separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}
