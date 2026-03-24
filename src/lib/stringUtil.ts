const SMALL_WORDS = new Set([
    "a", "an", "the", "and", "but", "or", "for", "nor",
    "on", "at", "to", "by", "in", "of", "up", "as", "is", "it", "its", "via", "vs",
]);

export function toTitleCase(str: string): string {
    const tokens = str.split(" ");
    const last = tokens.length - 1;
    return tokens
        .map((tok, i) => {
            if (tok.startsWith("{") && tok.endsWith("}")) return tok;
            const isEdge = i === 0 || i === last;
            if (SMALL_WORDS.has(tok.toLowerCase()) && !isEdge) {
                return tok.toLowerCase();
            }
            return tok.charAt(0).toUpperCase() + tok.slice(1);
        })
        .join(" ");
}

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
