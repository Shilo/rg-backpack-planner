import type { CompareSection } from "./compareStats";
import { getIndicator } from "./compareStats";
import { formatNumber, formatPercent } from "svelte-whisper";
import { EXPORT_DPR, EXPORT_MIME } from "../buildImageExport/imageFormat";

export type CompareImageData = {
    labelA: string;
    labelB: string;
    sections: CompareSection[];
};

const LABEL_FONT = '"Inter", "Segoe UI", system-ui, sans-serif';
const DPR = EXPORT_DPR;

const GAP = 16;
const BORDER_RADIUS = 12;
const BORDER_WIDTH = 1.5;
const ACCENT_BAR_H = 3;
const HEADER_H = 36;
const SECTION_H = 26;
const ROW_H = 26;
const PILL_H_PAD = 7;

const HEADER_NAME_SIZE = 13;
const HEADER_VS_SIZE = 11;
const SECTION_SIZE = 11;
const COL_LABEL_SIZE = 11;
const ROW_LABEL_SIZE = 12;
const VALUE_SIZE = 13;
const DIFF_SIZE = 10;

const headerNameFont = `700 ${HEADER_NAME_SIZE}px ${LABEL_FONT}`;
const headerVsFont = `400 ${HEADER_VS_SIZE}px ${LABEL_FONT}`;
const sectionFont = `700 ${SECTION_SIZE}px ${LABEL_FONT}`;
const colLabelFont = `600 ${COL_LABEL_SIZE}px ${LABEL_FONT}`;
const rowLabelFont = `500 ${ROW_LABEL_SIZE}px ${LABEL_FONT}`;
const valueFont = `700 ${VALUE_SIZE}px ${LABEL_FONT}`;
const diffFont = `600 ${DIFF_SIZE}px ${LABEL_FONT}`;

function resolveThemeColor(prop: string, fallback: string): string {
    if (typeof document === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(prop)
        .trim();
    return value || fallback;
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function measureWidth(
    ctx: CanvasRenderingContext2D,
    text: string,
    font: string,
): number {
    ctx.font = font;
    return ctx.measureText(text).width;
}

function formatValue(value: number, format: "number" | "percent"): string {
    return format === "percent" ? formatPercent(value) : formatNumber(value);
}

function getDiffText(
    valueA: number,
    valueB: number,
    format: "number" | "percent",
): string {
    if (valueA === valueB) return "–";
    const diff = Math.abs(valueA - valueB);
    const diffStr = formatValue(diff, format);
    return valueA > valueB ? `+${diffStr} ▲` : `−${diffStr} ▼`;
}

function truncateText(
    ctx: CanvasRenderingContext2D,
    text: string,
    font: string,
    maxWidth: number,
): string {
    ctx.font = font;
    if (ctx.measureText(text).width <= maxWidth) return text;
    let s = text;
    while (s.length > 0 && ctx.measureText(s + "…").width > maxWidth) {
        s = s.slice(0, -1);
    }
    return s.length > 0 ? s + "…" : "…";
}

export async function renderCompareImage(
    data: CompareImageData,
): Promise<Blob | null> {
    const bgColor = resolveThemeColor("--node-locked-bg", "#2a2a30");
    const borderColor = resolveThemeColor("--node-locked-border", "#3e3e46");
    const textColor = resolveThemeColor("--text", "#e8e8ec");
    const mutedColor = resolveThemeColor("--text-muted", "#8a8a94");
    const accentColor = resolveThemeColor("--accent", "#5b9bd5");
    const higherColor = resolveThemeColor("--accent-success", "#4caf50");
    const lowerColor = resolveThemeColor("--accent-danger", "#e57373");
    const dimColor = resolveThemeColor("--text-disabled", "#555560");
    const pillBg = "rgba(255,255,255,0.08)";
    const pillBorder = "rgba(255,255,255,0.12)";
    const dimPillBg = "rgba(255,255,255,0.04)";
    const dimPillBorder = "rgba(255,255,255,0.07)";

    // --- Measurement pass ---
    const mCanvas = document.createElement("canvas");
    mCanvas.width = 1;
    mCanvas.height = 1;
    const mCtx = mCanvas.getContext("2d");
    if (!mCtx) return null;

    let maxLabelW = 0;
    let maxDiffTextW = 0;
    let maxValueAW = 0;
    let maxValueBW = 0;

    for (const section of data.sections) {
        for (const row of section.rows) {
            maxLabelW = Math.max(
                maxLabelW,
                measureWidth(mCtx, row.label, rowLabelFont),
            );
            const diffText = getDiffText(row.valueA, row.valueB, row.format);
            maxDiffTextW = Math.max(
                maxDiffTextW,
                measureWidth(mCtx, diffText, diffFont),
            );
            maxValueAW = Math.max(
                maxValueAW,
                measureWidth(mCtx, formatValue(row.valueA, row.format), valueFont),
            );
            maxValueBW = Math.max(
                maxValueBW,
                measureWidth(mCtx, formatValue(row.valueB, row.format), valueFont),
            );
        }
    }

    mCanvas.width = 0;
    mCanvas.height = 0;

    const labelColW = Math.max(40, maxLabelW);
    const diffColW = Math.max(20, maxDiffTextW + PILL_H_PAD * 2);
    const valueAColW = Math.max(24, maxValueAW);
    const valueBColW = Math.max(24, maxValueBW);

    const cardWidth =
        GAP + labelColW + GAP + diffColW + GAP + valueAColW + GAP + valueBColW + GAP;

    let cardH = ACCENT_BAR_H + HEADER_H;
    for (const section of data.sections) {
        cardH += SECTION_H + section.rows.length * ROW_H;
    }
    cardH += 8;

    // --- Draw pass ---
    const canvas = document.createElement("canvas");
    canvas.width = cardWidth * DPR;
    canvas.height = cardH * DPR;
    const maybeCtx = canvas.getContext("2d", { alpha: true });
    if (!maybeCtx) return null;
    const ctx = maybeCtx;
    ctx.scale(DPR, DPR);
    ctx.textBaseline = "middle";

    // Card background + border
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowOffsetY = 4;
    ctx.shadowBlur = 16;
    drawRoundedRect(ctx, 0, 0, cardWidth, cardH, BORDER_RADIUS);
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = BORDER_WIDTH;
    ctx.stroke();
    ctx.restore();

    // Accent bar
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(BORDER_RADIUS, 0);
    ctx.lineTo(cardWidth - BORDER_RADIUS, 0);
    ctx.arcTo(cardWidth, 0, cardWidth, BORDER_RADIUS, BORDER_RADIUS);
    ctx.lineTo(cardWidth, ACCENT_BAR_H);
    ctx.lineTo(0, ACCENT_BAR_H);
    ctx.lineTo(0, BORDER_RADIUS);
    ctx.arcTo(0, 0, BORDER_RADIUS, 0, BORDER_RADIUS);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, cardWidth, ACCENT_BAR_H);
    ctx.restore();

    // "vs" header
    const headerMidY = ACCENT_BAR_H + HEADER_H / 2;
    const vsText = "vs";
    const vsW = measureWidth(ctx, vsText, headerVsFont);
    const halfNameW = cardWidth / 2 - vsW / 2 - GAP;

    ctx.font = headerVsFont;
    ctx.fillStyle = dimColor;
    ctx.textAlign = "center";
    ctx.fillText(vsText, cardWidth / 2, headerMidY);

    ctx.font = headerNameFont;
    ctx.fillStyle = accentColor;
    ctx.textAlign = "left";
    ctx.fillText(
        truncateText(ctx, data.labelA, headerNameFont, halfNameW),
        GAP,
        headerMidY,
    );

    ctx.fillStyle = mutedColor;
    ctx.textAlign = "right";
    ctx.fillText(
        truncateText(ctx, data.labelB, headerNameFont, halfNameW),
        cardWidth - GAP,
        headerMidY,
    );

    // Header bottom border
    ctx.fillStyle = borderColor;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(0, ACCENT_BAR_H + HEADER_H - 1, cardWidth, 1);
    ctx.globalAlpha = 1;

    let y = ACCENT_BAR_H + HEADER_H;

    // Sections
    const valueARight = GAP + labelColW + GAP + diffColW + GAP + valueAColW;
    const valueBRight = cardWidth - GAP;
    const diffColRight = GAP + labelColW + GAP + diffColW;
    const pillHeight = DIFF_SIZE * 1.8;

    for (let si = 0; si < data.sections.length; si++) {
        const section = data.sections[si];
        const isFirst = si === 0;

        // Section header background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, y, cardWidth, SECTION_H);
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, y, cardWidth, SECTION_H);
        ctx.restore();

        // Section top border
        ctx.fillStyle = borderColor;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(0, y, cardWidth, 1);
        ctx.globalAlpha = 1;

        const sectionMidY = y + SECTION_H / 2;

        ctx.font = sectionFont;
        ctx.fillStyle = mutedColor;
        ctx.textAlign = "left";
        ctx.fillText(section.header.text.toUpperCase(), GAP, sectionMidY);

        if (isFirst) {
            const sectionTextW = measureWidth(ctx, section.header.text.toUpperCase(), sectionFont);
            const labelAMaxW = Math.max(0, valueARight - GAP - sectionTextW - GAP);
            ctx.font = colLabelFont;
            ctx.fillStyle = accentColor;
            ctx.textAlign = "right";
            ctx.fillText(
                truncateText(ctx, data.labelA, colLabelFont, labelAMaxW),
                valueARight,
                sectionMidY,
            );
            ctx.fillStyle = mutedColor;
            ctx.fillText(
                truncateText(ctx, data.labelB, colLabelFont, valueBColW),
                valueBRight,
                sectionMidY,
            );
        }

        y += SECTION_H;

        // Data rows
        for (const row of section.rows) {
            // Row top border
            ctx.fillStyle = borderColor;
            ctx.globalAlpha = 0.4;
            ctx.fillRect(0, y, cardWidth, 1);
            ctx.globalAlpha = 1;

            const rowMidY = y + ROW_H / 2;

            // Label
            ctx.font = rowLabelFont;
            ctx.fillStyle = mutedColor;
            ctx.textAlign = "left";
            ctx.fillText(row.label, GAP, rowMidY);

            // Diff pill
            const diffText = getDiffText(row.valueA, row.valueB, row.format);
            const isEqual = row.valueA === row.valueB;
            const diffTextW = measureWidth(ctx, diffText, diffFont);
            const pillW = diffTextW + PILL_H_PAD * 2;
            const pillX = diffColRight - pillW;
            const pillTop = y + (ROW_H - pillHeight) / 2;

            if (!isEqual) {
                ctx.save();
                drawRoundedRect(ctx, pillX, pillTop, pillW, pillHeight, pillHeight / 2);
                ctx.fillStyle = pillBg;
                ctx.fill();
                ctx.strokeStyle = pillBorder;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();

                ctx.font = diffFont;
                ctx.fillStyle = mutedColor;
                ctx.textAlign = "right";
                ctx.fillText(diffText, diffColRight - PILL_H_PAD, rowMidY);
            }

            // Value A
            const indicator = getIndicator(row.valueA, row.valueB);
            const valueAColor =
                indicator === "higher"
                    ? higherColor
                    : indicator === "lower"
                      ? lowerColor
                      : textColor;
            ctx.font = valueFont;
            ctx.fillStyle = valueAColor;
            ctx.textAlign = "right";
            ctx.fillText(formatValue(row.valueA, row.format), valueARight, rowMidY);

            // Value B — always neutral white. This image is a static snapshot:
            // column A is always the perspective column regardless of activeSide.
            ctx.fillStyle = textColor;
            ctx.fillText(formatValue(row.valueB, row.format), valueBRight, rowMidY);

            y += ROW_H;
        }
    }

    return new Promise((resolve) => {
        canvas.toBlob(
            (blob) => {
                try {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    canvas.width = 0;
                    canvas.height = 0;
                } catch (_) {
                    // no-op
                }
                resolve(blob);
            },
            EXPORT_MIME,
        );
    });
}
