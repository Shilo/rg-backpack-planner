import { get } from "svelte/store";
import { locale } from "svelte-whisper";

/**
 * Evaluates a simple arithmetic expression containing +, -, *.
 * Respects multiplication precedence over addition/subtraction.
 * Returns the floored integer result, or null if the expression is invalid.
 */
export function evaluateSimpleMath(expr: string): number | null {
    const cleaned = expr.replace(/\s/g, "");
    if (!/^[\d+\-*]+$/.test(cleaned) || cleaned.length === 0) return null;

    const tokens: (number | string)[] = [];
    let current = "";
    for (const char of cleaned) {
        if ("+-*".includes(char)) {
            if (current === "") return null;
            tokens.push(parseInt(current, 10));
            tokens.push(char);
            current = "";
        } else {
            current += char;
        }
    }
    if (current === "") return null;
    tokens.push(parseInt(current, 10));

    // Handle * first (left to right)
    let i = 0;
    while (i < tokens.length) {
        if (tokens[i] === "*") {
            const left = tokens[i - 1] as number;
            const right = tokens[i + 1] as number;
            tokens.splice(i - 1, 3, left * right);
        } else {
            i++;
        }
    }

    // Then + and - (left to right)
    let result = tokens[0] as number;
    for (let j = 1; j < tokens.length; j += 2) {
        const op = tokens[j] as string;
        const val = tokens[j + 1] as number;
        if (op === "+") result += val;
        else if (op === "-") result -= val;
    }

    return Math.floor(result);
}

/**
 * Formats a number with thousand separators (commas).
 * @param num - The number to format
 * @returns The formatted string with thousand separators
 */
export function formatNumber(num: number): string {
    return num.toLocaleString(get(locale) || undefined);
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
