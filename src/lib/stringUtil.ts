/**
 * Truncates a string to a specified maximum length and appends "..." if truncated.
 * @param text - The string to truncate (null/undefined returns empty string)
 * @param maxLength - The maximum length (default: 25)
 * @returns The truncated string with "..." appended if it exceeds maxLength
 */
export function truncateText(
    text: string | null | undefined,
    maxLength: number = 25,
): string {
    if (!text) {
        return "";
    }
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}
