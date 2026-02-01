/**
 * Truncates a string to a specified maximum length and appends "..." if truncated.
 * @param text - The string to truncate
 * @param maxLength - The maximum length (default: 25)
 * @returns The truncated string with "..." appended if it exceeds maxLength
 */
export function truncateText(text: string, maxLength: number = 25): string {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}
