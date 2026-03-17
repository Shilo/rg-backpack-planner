import { AbsoluteFill, interpolate, spring, useCurrentFrame, Sequence, staticFile } from 'remotion';
import { CheckCircle2, Link, Github } from 'lucide-react';

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
    iosBezel: '#6b7d8a',
    androidBezel: '#1a2a35',
} as const;

// ── Animation ──

const FADE_DURATION = 15;
const FEATURE_STAGGER = 12;
const FPS = 30;
const SPRING_CONFIG = { damping: 10 } as const;
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

// ── Background (TreeTabs-style gradient + polkadot) ──

const bgStyle: React.CSSProperties = {
    backgroundImage: `
        radial-gradient(circle, rgba(34, 59, 73, 0.3) 2px, transparent 2px),
        radial-gradient(circle at 50% 45%, ${COLOR.surface}, ${COLOR.bg} 100%)
    `,
    backgroundSize: '32px 32px, 100% 100%',
};

const slideStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SLIDE_PADDING,
};

// ── Components ──

const Title: React.FC<{ text: string; frame: number; start: number; color?: string }> = ({ text, frame, start, color = COLOR.text }) => {
    const isFirstFrame = frame === 0 && start === 0;
    const opacity = isFirstFrame ? 1 : fadeIn(frame, start);
    const translateY = isFirstFrame ? 0 : fadeIn(frame, start, [20, 0]);

    return (
        <h1 style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            fontSize: '64px',
            fontWeight: 'bold',
            color,
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
    variant: 'ios' | 'android';
}> = ({ file, frame, start, variant }) => {
    const isFirstFrame = frame === 0 && start === 0;
    const opacity = isFirstFrame ? 1 : fadeIn(frame, start);
    const raw = isFirstFrame ? 1 : spring({ frame: Math.max(0, frame - start), fps: FPS, config: SPRING_CONFIG });
    const scale = Math.min(raw, 1.02);

    const isIos = variant === 'ios';
    const bezelColor = isIos ? COLOR.iosBezel : COLOR.androidBezel;
    const borderWidth = 5;
    const borderRadius = isIos ? 32 : 26;

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
                    border: `${borderWidth}px solid ${bezelColor}`,
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
        <PhoneFrame file={leftFile} frame={frame} start={leftStart} variant="ios" />
        <PhoneFrame file={rightFile} frame={frame} start={rightStart} variant="android" />
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
    const isFirstFrame = frame === 0 && start === 0;
    const scale = isFirstFrame ? 1 : spring({ frame: Math.max(0, frame - start), fps: FPS, config: { damping: 12 } });

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

export const Showcase: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{
            ...bgStyle,
            color: COLOR.text,
            fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
            {/* Slide 1: Intro (0-90) */}
            <Sequence durationInFrames={90}>
                <AbsoluteFill style={slideStyle}>
                    <div style={{ flex: 1, paddingRight: `${CONTENT_GAP}px`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '24px' }}>
                        <Logo frame={frame} start={0} style={{ width: '120px', height: '120px' }} />
                        <div style={{ textAlign: 'left' }}>
                            <Title text="Backpack Planner" frame={frame} start={0} color={COLOR.accent} />
                            <p style={{
                                fontSize: '42px',
                                fontWeight: 'bold',
                                color: COLOR.text,
                                opacity: frame === 0 ? 1 : fadeIn(frame, 10),
                                margin: '-16px 0 16px 0',
                            }}>
                                For Run! Goddess
                            </p>
                            <p style={{
                                fontSize: '28px',
                                opacity: frame === 0 ? 1 : fadeIn(frame, 20),
                                transform: `translateY(${frame === 0 ? 0 : fadeIn(frame, 20, [20, 0])}px)`,
                                maxWidth: '500px',
                                lineHeight: '1.4',
                                color: COLOR.textMuted,
                            }}>
                                Plan and share optimized{'\n'}Backpack Tech builds
                            </p>
                            <UrlBadge frame={frame} start={30} />
                            <GitHubBadge frame={frame} start={35} />
                        </div>
                    </div>
                    <DualFrames
                        leftFile="mobile_late_pve.png"
                        rightFile="mobile_late_pvp_context.png"
                        frame={frame}
                        leftStart={0}
                        rightStart={8}
                    />
                </AbsoluteFill>
            </Sequence>

            {/* Slide 2: Plan Your Build (90-240) */}
            <Sequence from={90} durationInFrames={150}>
                <AbsoluteFill style={slideStyle}>
                    <div style={{ flex: 1, paddingRight: `${CONTENT_GAP}px`, position: 'relative' }}>
                        <Logo frame={frame} start={95} style={{ position: 'absolute', top: '30px', right: '20px' }} />
                        <Title text="Plan Your Build" frame={frame} start={100} />
                        <FeatureList
                            items={[
                                "Prepare for late game PvE and PvP",
                                "Quickly manage all skill trees",
                                "Optimize your strategy and progress",
                            ]}
                            frame={frame}
                            start={120}
                        />
                    </div>
                    <DualFrames
                        leftFile="mobile_onboarding_step1.png"
                        rightFile="mobile_onboarding_step2.png"
                        frame={frame}
                        leftStart={110}
                        rightStart={118}
                    />
                </AbsoluteFill>
            </Sequence>

            {/* Slide 3: Track Your Progress (240-390) */}
            <Sequence from={240} durationInFrames={150}>
                <AbsoluteFill style={slideStyle}>
                    <div style={{ flex: 1, paddingRight: `${CONTENT_GAP}px`, position: 'relative' }}>
                        <Logo frame={frame} start={245} style={{ position: 'absolute', bottom: '30px', right: '20px' }} />
                        <Title text="Track Your Progress" frame={frame} start={250} />
                        <FeatureList
                            items={[
                                "Track Tech Crystal costs",
                                "Budget your progress",
                                "Analyze your stats",
                            ]}
                            frame={frame}
                            start={270}
                        />
                    </div>
                    <DualFrames
                        leftFile="mobile_stats.png"
                        rightFile="mobile_compose_stats.png"
                        frame={frame}
                        leftStart={260}
                        rightStart={268}
                    />
                </AbsoluteFill>
            </Sequence>

            {/* Slide 4: Outro (390+) */}
            <Sequence from={390}>
                <AbsoluteFill style={slideStyle}>
                    <div style={{ flex: 1, paddingRight: `${CONTENT_GAP}px` }}>
                        <div style={{ marginBottom: '24px' }}>
                            <Logo frame={frame} start={395} style={{ width: '120px', height: '120px' }} />
                        </div>
                        <Title text="Plan, Track and Share" frame={frame} start={400} color={COLOR.accent} />
                        <FeatureList
                            items={[
                                "Create multiple build presets",
                                "Share and preview builds",
                                "Use everywhere, offline and any language",
                            ]}
                            frame={frame}
                            start={420}
                        />
                        <UrlBadge frame={frame} start={450} size={40} />
                        <GitHubBadge frame={frame} start={455} size={28} />
                    </div>
                    <DualFrames
                        leftFile="mobile_settings.png"
                        rightFile="mobile_general_settings.png"
                        frame={frame}
                        leftStart={410}
                        rightStart={418}
                    />
                </AbsoluteFill>
            </Sequence>
        </AbsoluteFill>
    );
};
