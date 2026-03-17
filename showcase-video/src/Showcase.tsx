import { AbsoluteFill, interpolate, spring, useCurrentFrame, Sequence, staticFile } from 'remotion';
import { CheckCircle2, Link } from 'lucide-react';

// ── Theme (derived from default OKLCH h=234, c=0.18, dark mode) ──

const COLOR = {
    bg: '#00040e',
    accent: '#00adfc',
    text: '#d7ebf7',
    textMuted: '#a7bbc6',
    border: '#223b49',
    featureBoxBg: 'rgba(7, 19, 26, 0.6)',
    featureBoxBorder: 'rgba(167, 187, 198, 0.1)',
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

const SLIDE_PADDING = '0 100px';
const CONTENT_GAP = '60px';

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
            fontSize: '70px',
            fontWeight: 'bold',
            color,
            textAlign: 'left',
            marginBottom: '40px',
            lineHeight: '1.1',
        }}>
            {text}
        </h1>
    );
};

const FeatureList: React.FC<{ items: string[]; frame: number; start: number }> = ({ items, frame, start }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
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
                    gap: '24px',
                    background: COLOR.featureBoxBg,
                    padding: '24px',
                    borderRadius: '20px',
                    border: `1px solid ${COLOR.featureBoxBorder}`,
                }}>
                    <CheckCircle2 size={36} color={COLOR.accent} />
                    <span style={{ fontSize: '32px', fontWeight: '500' }}>{item}</span>
                </div>
            );
        })}
    </div>
);

const MobileFrame: React.FC<{ file: string; frame: number; start: number }> = ({ file, frame, start }) => {
    const isFirstFrame = frame === 0 && start === 0;
    const opacity = isFirstFrame ? 1 : fadeIn(frame, start);
    const scale = isFirstFrame ? 1 : spring({ frame: frame - start, fps: FPS, config: SPRING_CONFIG });

    return (
        <div style={{
            opacity,
            transform: `scale(${scale})`,
            height: '850px',
            width: '400px',
            display: 'flex',
            justifyContent: 'center',
            filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.5))',
        }}>
            <img
                src={staticFile(file)}
                style={{
                    height: '100%',
                    width: 'auto',
                    borderRadius: '48px',
                    border: `12px solid ${COLOR.border}`,
                    objectFit: 'contain',
                }}
            />
        </div>
    );
};

const DesktopFrame: React.FC<{ file: string; frame: number; start: number }> = ({ file, frame, start }) => {
    const opacity = fadeIn(frame, start);
    const scale = spring({ frame: frame - start, fps: FPS, config: SPRING_CONFIG });

    return (
        <div style={{
            opacity,
            transform: `scale(${scale})`,
            width: '1000px',
            height: '563px',
            filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.5))',
        }}>
            <img
                src={staticFile(file)}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '20px',
                    border: `8px solid ${COLOR.border}`,
                    objectFit: 'cover',
                }}
            />
        </div>
    );
};

const UrlBadge: React.FC<{ frame: number; start: number; size?: number }> = ({ frame, start, size = 36 }) => (
    <div style={{
        marginTop: '30px',
        opacity: frame === 0 && start === 0 ? 1 : fadeIn(frame, start),
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    }}>
        <Link size={size} color={COLOR.accent} />
        <p style={{ fontSize: `${size}px`, fontWeight: 'bold', margin: 0, color: COLOR.text }}>rgbp.app</p>
    </div>
);

// ── Composition ──

export const Showcase: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{ backgroundColor: COLOR.bg, color: COLOR.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Intro (0-90) */}
            <Sequence durationInFrames={90}>
                <AbsoluteFill style={{ ...slideStyle, backgroundColor: COLOR.bg }}>
                    <div style={{ flex: 1, paddingRight: CONTENT_GAP, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '40px' }}>
                        <img
                            src={staticFile("icon.svg")}
                            style={{
                                width: '150px',
                                height: '150px',
                                transform: frame === 0 ? 'scale(1)' : `scale(${spring({ frame, fps: FPS, config: { damping: 12 } })})`,
                            }}
                        />
                        <div style={{ textAlign: 'left' }}>
                            <Title text="Backpack Planner" frame={frame} start={0} color={COLOR.accent} />
                            <p style={{
                                fontSize: '48px',
                                fontWeight: 'bold',
                                color: COLOR.text,
                                opacity: frame === 0 ? 1 : fadeIn(frame, 10),
                                margin: '-20px 0 20px 0',
                            }}>
                                For Run! Goddess
                            </p>
                            <p style={{
                                fontSize: '32px',
                                opacity: frame === 0 ? 1 : fadeIn(frame, 20),
                                transform: `translateY(${frame === 0 ? 0 : fadeIn(frame, 20, [20, 0])}px)`,
                                maxWidth: '600px',
                                lineHeight: '1.4',
                                color: COLOR.textMuted,
                            }}>
                                Plan and share optimized Backpack Tech builds.
                            </p>
                            <UrlBadge frame={frame} start={30} />
                        </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <MobileFrame file="mobile_late_pvp_context.png" frame={frame} start={0} />
                    </div>
                </AbsoluteFill>
            </Sequence>

            {/* Plan Your Builds (90-240) */}
            <Sequence from={90} durationInFrames={150}>
                <AbsoluteFill style={slideStyle}>
                    <div style={{ flex: 1, paddingRight: CONTENT_GAP }}>
                        <Title text="Plan Your Builds" frame={frame} start={100} />
                        <FeatureList
                            items={[
                                "Optimize for Late Game PvE and PvP",
                                "Manage All Skill Trees",
                                "Refine Your Strategy",
                            ]}
                            frame={frame}
                            start={120}
                        />
                    </div>
                    <div style={{ flex: 1.5, display: 'flex', justifyContent: 'center' }}>
                        <DesktopFrame file="desktop_plan_onboarding.png" frame={frame} start={110} />
                    </div>
                </AbsoluteFill>
            </Sequence>

            {/* Tech Crystals (240-390) */}
            <Sequence from={240} durationInFrames={150}>
                <AbsoluteFill style={slideStyle}>
                    <div style={{ flex: 1, paddingRight: CONTENT_GAP }}>
                        <Title text="Tech Crystals" frame={frame} start={250} />
                        <FeatureList
                            items={[
                                "Track Tech Crystal Costs",
                                "Budget Your Progress",
                                "Analyze Your Stats",
                            ]}
                            frame={frame}
                            start={270}
                        />
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <MobileFrame file="mobile_stats.png" frame={frame} start={260} />
                    </div>
                </AbsoluteFill>
            </Sequence>

            {/* Outro (390+) */}
            <Sequence from={390}>
                <AbsoluteFill style={slideStyle}>
                    <div style={{ flex: 1, paddingRight: CONTENT_GAP }}>
                        <div style={{ marginBottom: '40px' }}>
                            <img src={staticFile("icon.svg")} style={{ width: '120px' }} />
                        </div>
                        <Title text="Build & Optimize Now" frame={frame} start={400} color={COLOR.accent} />
                        <FeatureList
                            items={[
                                "Create Multiple Build Presets",
                                "Share and Preview Builds",
                                "Use Anywhere, Offline and in Your Language",
                            ]}
                            frame={frame}
                            start={420}
                        />
                        <UrlBadge frame={frame} start={450} size={48} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <MobileFrame file="mobile_settings.png" frame={frame} start={410} />
                    </div>
                </AbsoluteFill>
            </Sequence>
        </AbsoluteFill>
    );
};
