export type HintPart = {
    text: string;
    isHint: boolean;
    className?: string;
};

const TEXT_HINT_REGEX = /\[\[([\s\S]+?)\]\]/g;

export function parseTextHints(value: string | undefined, hintClassName = "text-hint"): HintPart[] {
    if (!value) return [];

    const parts: HintPart[] = [];
    let lastIndex = 0;

    for (const match of value.matchAll(TEXT_HINT_REGEX)) {
        const matchText = match[0];
        const hintText = match[1];
        const matchIndex = match.index ?? -1;

        if (matchIndex > lastIndex) {
            parts.push({
                text: value.slice(lastIndex, matchIndex),
                isHint: false,
            });
        }

        parts.push({
            text: hintText,
            isHint: true,
            className: hintClassName,
        });

        lastIndex = matchIndex + matchText.length;
    }

    if (lastIndex < value.length) {
        parts.push({
            text: value.slice(lastIndex),
            isHint: false,
        });
    }

    return parts;
}
