import { AbsoluteFill, Audio, interpolate, spring, useCurrentFrame, Sequence, staticFile } from 'remotion';
import { CheckCircle2, Link, Github } from 'lucide-react';

// ── Props ──

export type ShowcaseTranslations = {
    forRunGoddess: string;
    planAndShare: string;
    planYourBuild: string;
    planFeature1: string;
    planFeature2: string;
    planFeature3: string;
    trackYourProgress: string;
    trackFeature1: string;
    trackFeature2: string;
    trackFeature3: string;
    planTrackShare: string;
    shareFeature1: string;
    shareFeature2: string;
    shareFeature3: string;
};

export type ShowcaseProps = {
    locale: string;
    translations: ShowcaseTranslations;
};

// ── Theme (derived from default OKLCH h=234, c=0.18, dark mode) ──

const COLOR = {
    bg: '#00040e',
    surface: '#041d2a',
    borderSubtle: '#223b49',
    accent: '#00adfc',
    text: '#d7ebf7',
    textMuted: '#a7bbc6',
    featureBoxBg: 'rgba(4, 29, 42, 0.7)',
    featureBoxBorder: 'rgba(34, 59, 73, 0.5)',
    appleBezel: '#e8e8e8',
    pixelBezel: '#2a2a2a',
} as const;

// ── Animation ──

const FADE_DURATION = 15;
const FEATURE_STAGGER = 12;
const FPS = 30;
const SPRING_CONFIG = { damping: 10 } as const;
const SPRING_CONFIG_LOGO = { damping: 12 } as const;
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

function fadeIn(frame: number, start: number, range: [number, number] = [0, 1]) {
    return interpolate(frame, [start, start + FADE_DURATION], range, CLAMP);
}

// ── Layout ──

const SLIDE_PADDING = '0 80px';
const CONTENT_GAP = 50;
const FRAME_HEIGHT = 880;
const FRAME_WIDTH = Math.round(FRAME_HEIGHT * (393 / 852));
const FRAME_GAP = 30;
const LOGO_SIZE = 80;
const APPLE_BORDER_RADIUS = 32;
const PIXEL_BORDER_RADIUS = 26;
const BEZEL_WIDTH = 5;
const POLKADOT_SIZE = 2;
const POLKADOT_GRID = 32;

// ── Slide timing (frames at 30fps) ──

const SLIDE_1_DURATION = 120; // 4s
const SLIDE_2_DURATION = 210; // 7s
const SLIDE_3_DURATION = 210; // 7s
const SLIDE_4_DURATION = 210; // 7s

const SLIDE_2_START = SLIDE_1_DURATION;
const SLIDE_3_START = SLIDE_2_START + SLIDE_2_DURATION;
const SLIDE_4_START = SLIDE_3_START + SLIDE_3_DURATION;

// ── Music ──

const MUSIC_FILE = 'music.mp3';

// ── Background (TreeTabs-style gradient + polkadot) ──

const bgStyle: React.CSSProperties = {
    backgroundImage: `
        radial-gradient(circle, rgba(34, 59, 73, 0.3) ${POLKADOT_SIZE}px, transparent ${POLKADOT_SIZE}px),
        radial-gradient(circle at 50% 45%, ${COLOR.surface}, ${COLOR.bg} 100%)
    `,
    backgroundSize: `${POLKADOT_GRID}px ${POLKADOT_GRID}px, 100% 100%`,
};

const slideStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SLIDE_PADDING,
};

// ── Components ──

const Title: React.FC<{ text: string; frame: number; start: number }> = ({ text, frame, start }) => {
    const isIntro = frame === 0 && start === 0;
    const opacity = isIntro ? 1 : fadeIn(frame, start);
    const translateY = isIntro ? 0 : fadeIn(frame, start, [20, 0]);

    return (
        <h1 style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            fontSize: '64px',
            fontWeight: 'bold',
            color: COLOR.accent,
            textAlign: 'left',
            marginBottom: '32px',
            lineHeight: '1.1',
        }}>
            {text}
        </h1>
    );
};

const FeatureList: React.FC<{ items: string[]; frame: number; start: number }> = ({ items, frame, start }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
        {items.map((item, i) => {
            const itemStart = start + i * FEATURE_STAGGER;
            const opacity = fadeIn(frame, itemStart);
            const translateX = fadeIn(frame, itemStart, [-30, 0]);

            return (
                <div key={i} style={{
                    opacity,
                    transform: `translateX(${translateX}px)`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    background: COLOR.featureBoxBg,
                    padding: '20px',
                    borderRadius: '16px',
                    border: `1px solid ${COLOR.featureBoxBorder}`,
                    backdropFilter: 'blur(8px)',
                }}>
                    <CheckCircle2 size={32} color={COLOR.accent} />
                    <span style={{ fontSize: '28px', fontWeight: '500' }}>{item}</span>
                </div>
            );
        })}
    </div>
);

const PhoneFrame: React.FC<{
    file: string;
    frame: number;
    start: number;
    variant: 'apple' | 'pixel';
}> = ({ file, frame, start, variant }) => {
    const isIntro = frame === 0 && start === 0;
    const opacity = isIntro ? 1 : fadeIn(frame, start);
    const raw = isIntro ? 1 : spring({ frame: Math.max(0, frame - start), fps: FPS, config: SPRING_CONFIG });
    const scale = Math.min(raw, 1.02);

    const isApple = variant === 'apple';
    const bezelColor = isApple ? COLOR.appleBezel : COLOR.pixelBezel;
    const borderRadius = isApple ? APPLE_BORDER_RADIUS : PIXEL_BORDER_RADIUS;

    return (
        <div style={{
            opacity,
            transform: `scale(${scale})`,
            height: `${FRAME_HEIGHT}px`,
            width: `${FRAME_WIDTH}px`,
            display: 'flex',
            justifyContent: 'center',
            filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))',
            flexShrink: 0,
        }}>
            <img
                src={staticFile(file)}
                style={{
                    height: '100%',
                    width: 'auto',
                    borderRadius: `${borderRadius}px`,
                    border: `${BEZEL_WIDTH}px solid ${bezelColor}`,
                    objectFit: 'contain',
                }}
            />
        </div>
    );
};

const DualFrames: React.FC<{
    leftFile: string;
    rightFile: string;
    frame: number;
    leftStart: number;
    rightStart: number;
}> = ({ leftFile, rightFile, frame, leftStart, rightStart }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: `${FRAME_GAP}px`,
        justifyContent: 'center',
    }}>
        <PhoneFrame file={leftFile} frame={frame} start={leftStart} variant="pixel" />
        <PhoneFrame file={rightFile} frame={frame} start={rightStart} variant="apple" />
    </div>
);

const UrlBadge: React.FC<{ frame: number; start: number; size?: number }> = ({ frame, start, size = 32 }) => (
    <div style={{
        marginTop: '16px',
        opacity: frame === 0 && start === 0 ? 1 : fadeIn(frame, start),
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
    }}>
        <Link size={size} color={COLOR.accent} />
        <p style={{ fontSize: `${size}px`, fontWeight: 'bold', margin: 0, color: COLOR.text }}>rgbp.app</p>
    </div>
);

const GitHubBadge: React.FC<{ frame: number; start: number; size?: number }> = ({ frame, start, size = 26 }) => (
    <div style={{
        marginTop: '8px',
        opacity: frame === 0 && start === 0 ? 1 : fadeIn(frame, start),
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
    }}>
        <Github size={size} color={COLOR.textMuted} />
        <p style={{ fontSize: `${size}px`, fontWeight: '500', margin: 0, color: COLOR.textMuted }}>github.com/Shilo/rg-backpack-planner</p>
    </div>
);

const Logo: React.FC<{
    frame: number;
    start: number;
    style?: React.CSSProperties;
}> = ({ frame, start, style: extraStyle }) => {
    const isIntro = frame === 0 && start === 0;
    const scale = isIntro ? 1 : spring({ frame: Math.max(0, frame - start), fps: FPS, config: SPRING_CONFIG_LOGO });

    return (
        <img
            src={staticFile("icon.svg")}
            style={{
                width: `${LOGO_SIZE}px`,
                height: `${LOGO_SIZE}px`,
                transform: `scale(${Math.min(scale, 1)})`,
                ...extraStyle,
            }}
        />
    );
};

// ── Composition ──

export const Showcase: React.FC<ShowcaseProps> = ({ locale, translations }) => {
    const frame = useCurrentFrame();

    const SHOT = {
        latePve: `${locale}/mobile_late_pve.png`,
        latePvpContext: `${locale}/mobile_late_pvp_context.png`,
        onboardingStep1: `${locale}/mobile_onboarding_step1.png`,
        onboardingStep2: `${locale}/mobile_onboarding_step2.png`,
        stats: `${locale}/mobile_stats.png`,
        composeStats: `${locale}/mobile_compose_stats.png`,
        settings: `${locale}/mobile_settings.png`,
        generalSettings: `${locale}/mobile_general_settings.png`,
    };

    // Intro: frame 0 shows everything (midpoint snapshot for thumbnails)
    const introVisible = frame === 0 ? 1 : undefined;

    return (
        <AbsoluteFill style={{
            ...bgStyle,
            color: COLOR.text,
            fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
            <Audio src={staticFile(MUSIC_FILE)} />

            {/* Slide 1: Intro */}
            <Sequence durationInFrames={SLIDE_1_DURATION}>
                <AbsoluteFill style={slideStyle}>
                    <div style={{ flex: 1, paddingRight: `${CONTENT_GAP}px`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '24px' }}>
                        <Logo frame={frame} start={0} />
                        <div style={{ textAlign: 'left' }}>
                            <Title text="Backpack Planner" frame={frame} start={0} />
                            <p style={{
                                fontSize: '42px',
                                fontWeight: 'bold',
                                color: COLOR.text,
                                opacity: introVisible ?? fadeIn(frame, 10),
                                margin: '-16px 0 16px 0',
                            }}>
                                {translations.forRunGoddess}
                            </p>
                            <p style={{
                                fontSize: '28px',
                                opacity: introVisible ?? fadeIn(frame, 20),
                                transform: `translateY(${introVisible ? 0 : fadeIn(frame, 20, [20, 0])}px)`,
                                maxWidth: '500px',
                                lineHeight: '1.4',
                                color: COLOR.textMuted,
                                whiteSpace: 'pre-line',
                            }}>
                                {translations.planAndShare}
                            </p>
                            <div style={{ opacity: introVisible ?? fadeIn(frame, 30) }}>
                                <UrlBadge frame={introVisible ? 0 : frame} start={introVisible ? 0 : 30} />
                            </div>
                            <div style={{ opacity: introVisible ?? fadeIn(frame, 35) }}>
                                <GitHubBadge frame={introVisible ? 0 : frame} start={introVisible ? 0 : 35} />
                            </div>
                        </div>
                    </div>
                    <DualFrames
                        leftFile={SHOT.latePve}
                        rightFile={SHOT.latePvpContext}
                        frame={introVisible ? 0 : frame}
                        leftStart={0}
                        rightStart={introVisible ? 0 : 8}
                    />
                </AbsoluteFill>
            </Sequence>

            {/* Slide 2: Plan Your Build */}
            <Sequence from={SLIDE_2_START} durationInFrames={SLIDE_2_DURATION}>
                <AbsoluteFill style={slideStyle}>
                    <div style={{ flex: 1, paddingRight: `${CONTENT_GAP}px`, position: 'relative' }}>
                        <Title text={translations.planYourBuild} frame={frame} start={SLIDE_2_START + 10} />
                        <FeatureList
                            items={[
                                translations.planFeature1,
                                translations.planFeature2,
                                translations.planFeature3,
                            ]}
                            frame={frame}
                            start={SLIDE_2_START + 30}
                        />
                        <Logo frame={frame} start={SLIDE_2_START + 5} style={{ position: 'absolute', top: '24px', right: '60px' }} />
                    </div>
                    <DualFrames
                        leftFile={SHOT.onboardingStep1}
                        rightFile={SHOT.onboardingStep2}
                        frame={frame}
                        leftStart={SLIDE_2_START + 20}
                        rightStart={SLIDE_2_START + 28}
                    />
                </AbsoluteFill>
            </Sequence>

            {/* Slide 3: Track Your Progress */}
            <Sequence from={SLIDE_3_START} durationInFrames={SLIDE_3_DURATION}>
                <AbsoluteFill style={slideStyle}>
                    <div style={{ flex: 1, paddingRight: `${CONTENT_GAP}px` }}>
                        <Title text={translations.trackYourProgress} frame={frame} start={SLIDE_3_START + 10} />
                        <FeatureList
                            items={[
                                translations.trackFeature1,
                                translations.trackFeature2,
                                translations.trackFeature3,
                            ]}
                            frame={frame}
                            start={SLIDE_3_START + 30}
                        />
                        <Logo frame={frame} start={SLIDE_3_START + 5} style={{ marginTop: '40px', marginLeft: '8px' }} />
                    </div>
                    <DualFrames
                        leftFile={SHOT.stats}
                        rightFile={SHOT.composeStats}
                        frame={frame}
                        leftStart={SLIDE_3_START + 20}
                        rightStart={SLIDE_3_START + 28}
                    />
                </AbsoluteFill>
            </Sequence>

            {/* Slide 4: Outro */}
            <Sequence from={SLIDE_4_START}>
                <AbsoluteFill style={slideStyle}>
                    <div style={{ flex: 1, paddingRight: `${CONTENT_GAP}px` }}>
                        <Title text={translations.planTrackShare} frame={frame} start={SLIDE_4_START + 10} />
                        <FeatureList
                            items={[
                                translations.shareFeature1,
                                translations.shareFeature2,
                                translations.shareFeature3,
                            ]}
                            frame={frame}
                            start={SLIDE_4_START + 30}
                        />
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '40px', marginTop: '8px' }}>
                            <div>
                                <UrlBadge frame={frame} start={SLIDE_4_START + 65} size={40} />
                                <GitHubBadge frame={frame} start={SLIDE_4_START + 70} size={28} />
                            </div>
                            <Logo frame={frame} start={SLIDE_4_START + 5} style={{ marginBottom: '6px', marginLeft: '20px' }} />
                        </div>
                    </div>
                    <DualFrames
                        leftFile={SHOT.settings}
                        rightFile={SHOT.generalSettings}
                        frame={frame}
                        leftStart={SLIDE_4_START + 20}
                        rightStart={SLIDE_4_START + 28}
                    />
                </AbsoluteFill>
            </Sequence>
        </AbsoluteFill>
    );
};
