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
 * Formats a number with M/B suffixes for millions and billions.
 * Numbers below 1 million are returned as-is with locale formatting.
 */
export function formatCompact(n: number): string {
    const truncate = (v: number, digits: number) => {
        const factor = 10 ** digits;
        return Math.floor(v * factor) / factor;
    };
    const fmt = (v: number) =>
        v.toLocaleString(undefined, { maximumFractionDigits: 3 });
    if (n >= 1_000_000_000) return fmt(truncate(n / 1_000_000_000, 3)) + "B";
    if (n >= 1_000_000) return fmt(truncate(n / 1_000_000, 3)) + "M";
    return n.toLocaleString();
}
