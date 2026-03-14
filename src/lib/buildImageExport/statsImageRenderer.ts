const LABEL_FONT = '"Inter", "Segoe UI", system-ui, sans-serif';
const DPR = 2;

const PADDING_X = 20;
const PADDING_Y = 16;
const COLUMN_GAP = 16;
const BORDER_RADIUS = 12;
const BORDER_WIDTH = 1.5;
const ACCENT_BAR_HEIGHT = 3;

const TITLE_FONT_SIZE = 16;
const TITLE_GAP_BELOW = 10;

const STAT_FONT_SIZE = 13;
const STAT_ROW_HEIGHT = 24;

const SKILL_FONT_SIZE = 12;
const SKILL_ROW_HEIGHT = 22;

const DIVIDER_GAP = 8;

export type StatsImageData = {
    buildTitle?: string;
    techCrystalsLabel: string;
    techCrystalsValue: string;
    nodeLevelsLabel: string;
    nodeLevelsValue: string;
    skillBonuses: { label: string; value: string }[];
};

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

export async function renderStatsImage(
    data: StatsImageData,
): Promise<Blob | null> {
    const bgColor = resolveThemeColor("--node-locked-bg", "#2a2a30");
    const borderColor = resolveThemeColor("--node-locked-border", "#3e3e46");
    const textColor = resolveThemeColor("--text", "#e8e8ec");
    const mutedColor = resolveThemeColor("--text-muted", "#8a8a94");
    const accentColor = resolveThemeColor("--accent", "#5b9bd5");

    const statLabelFont = `600 ${STAT_FONT_SIZE}px ${LABEL_FONT}`;
    const statValueFont = `700 ${STAT_FONT_SIZE}px ${LABEL_FONT}`;
    const skillLabelFont = `500 ${SKILL_FONT_SIZE}px ${LABEL_FONT}`;
    const skillValueFont = `600 ${SKILL_FONT_SIZE}px ${LABEL_FONT}`;
    const titleFont = `700 ${TITLE_FONT_SIZE}px ${LABEL_FONT}`;

    // Use a temporary canvas to measure text widths
    const measureCanvas = document.createElement("canvas");
    measureCanvas.width = 1;
    measureCanvas.height = 1;
    const mCtx = measureCanvas.getContext("2d");
    if (!mCtx) return null;

    // Measure all left/right column widths
    let maxLeft = 0;
    let maxRight = 0;

    maxLeft = Math.max(
        maxLeft,
        measureWidth(mCtx, data.techCrystalsLabel, statLabelFont),
        measureWidth(mCtx, data.nodeLevelsLabel, statLabelFont),
    );
    maxRight = Math.max(
        maxRight,
        measureWidth(mCtx, data.techCrystalsValue, statValueFont),
        measureWidth(mCtx, data.nodeLevelsValue, statValueFont),
    );

    for (const bonus of data.skillBonuses) {
        maxLeft = Math.max(
            maxLeft,
            measureWidth(mCtx, bonus.label, skillLabelFont),
        );
        maxRight = Math.max(
            maxRight,
            measureWidth(mCtx, bonus.value, skillValueFont),
        );
    }

    // Card width = padding + left col + gap + right col + padding
    let cardWidth = Math.ceil(
        PADDING_X + maxLeft + COLUMN_GAP + maxRight + PADDING_X,
    );

    // Ensure title fits if present
    if (data.buildTitle) {
        const titleWidth = measureWidth(
            mCtx,
            data.buildTitle.toUpperCase(),
            titleFont,
        );
        cardWidth = Math.max(cardWidth, Math.ceil(titleWidth + PADDING_X * 2));
    }

    measureCanvas.width = 0;
    measureCanvas.height = 0;

    const contentWidth = cardWidth - PADDING_X * 2;
    const valueX = cardWidth - PADDING_X;

    // Calculate card height
    let h = ACCENT_BAR_HEIGHT + PADDING_Y;
    if (data.buildTitle) {
        h += TITLE_FONT_SIZE * 1.2 + TITLE_GAP_BELOW + 1 + DIVIDER_GAP;
    }
    h += STAT_ROW_HEIGHT * 2;
    if (data.skillBonuses.length > 0) {
        h += DIVIDER_GAP * 2 + 1;
        h += SKILL_ROW_HEIGHT * data.skillBonuses.length;
    }
    h += PADDING_Y;

    const canvas = document.createElement("canvas");
    canvas.width = cardWidth * DPR;
    canvas.height = h * DPR;
    const maybeCtx = canvas.getContext("2d", { alpha: true });
    if (!maybeCtx) return null;
    const ctx = maybeCtx;

    ctx.scale(DPR, DPR);

    // Card shadow
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowOffsetY = 4;
    ctx.shadowBlur = 16;
    drawRoundedRect(ctx, 0, 0, cardWidth, h, BORDER_RADIUS);
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = BORDER_WIDTH;
    ctx.stroke();
    ctx.restore();

    // Accent bar at top
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(BORDER_RADIUS, 0);
    ctx.lineTo(cardWidth - BORDER_RADIUS, 0);
    ctx.arcTo(cardWidth, 0, cardWidth, BORDER_RADIUS, BORDER_RADIUS);
    ctx.lineTo(cardWidth, ACCENT_BAR_HEIGHT);
    ctx.lineTo(0, ACCENT_BAR_HEIGHT);
    ctx.lineTo(0, BORDER_RADIUS);
    ctx.arcTo(0, 0, BORDER_RADIUS, 0, BORDER_RADIUS);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, cardWidth, ACCENT_BAR_HEIGHT);
    ctx.restore();

    let y = ACCENT_BAR_HEIGHT + PADDING_Y;

    // Build title
    if (data.buildTitle) {
        ctx.font = titleFont;
        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
            data.buildTitle.toUpperCase(),
            cardWidth / 2,
            y + TITLE_FONT_SIZE * 0.6,
        );
        y += TITLE_FONT_SIZE * 1.2 + TITLE_GAP_BELOW;

        // Divider
        ctx.fillStyle = borderColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(PADDING_X, y, contentWidth, 1);
        ctx.globalAlpha = 1;
        y += 1 + DIVIDER_GAP;
    }

    // Stat rows
    function drawStatRow(label: string, value: string, rowY: number) {
        ctx.font = statLabelFont;
        ctx.fillStyle = mutedColor;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(label, PADDING_X, rowY + STAT_ROW_HEIGHT / 2);

        ctx.font = statValueFont;
        ctx.fillStyle = textColor;
        ctx.textAlign = "right";
        ctx.fillText(value, valueX, rowY + STAT_ROW_HEIGHT / 2);
    }

    drawStatRow(data.techCrystalsLabel, data.techCrystalsValue, y);
    y += STAT_ROW_HEIGHT;
    drawStatRow(data.nodeLevelsLabel, data.nodeLevelsValue, y);
    y += STAT_ROW_HEIGHT;

    // Skill bonuses
    if (data.skillBonuses.length > 0) {
        y += DIVIDER_GAP;
        ctx.fillStyle = borderColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(PADDING_X, y, contentWidth, 1);
        ctx.globalAlpha = 1;
        y += 1 + DIVIDER_GAP;

        for (const bonus of data.skillBonuses) {
            ctx.font = skillLabelFont;
            ctx.fillStyle = mutedColor;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(bonus.label, PADDING_X, y + SKILL_ROW_HEIGHT / 2);

            ctx.font = skillValueFont;
            ctx.fillStyle = accentColor;
            ctx.textAlign = "right";
            ctx.fillText(bonus.value, valueX, y + SKILL_ROW_HEIGHT / 2);
            y += SKILL_ROW_HEIGHT;
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
            "image/png",
        );
    });
}
