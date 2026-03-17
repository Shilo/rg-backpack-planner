import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Sequence, staticFile } from 'remotion';
import { Layout, Share2, BarChart3, Binary, Zap, Settings, MousePointer2, Calculator, Save, Smartphone, CheckCircle2, Link } from 'lucide-react';

const Title: React.FC<{ text: string; frame: number; start: number; color?: string; align?: 'left' | 'center' }> = ({ text, frame, start, color = 'white', align = 'center' }) => {
    // If it's the very first frame and we are at start, show it immediately without animation
    const isFirstFrame = frame === 0 && start === 0;

    const opacity = isFirstFrame ? 1 : interpolate(frame, [start, start + 15], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const translateY = isFirstFrame ? 0 : interpolate(frame, [start, start + 15], [20, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    return (
        <h1 style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            fontSize: '70px',
            fontWeight: 'bold',
            color,
            textAlign: align,
            marginBottom: '40px',
            lineHeight: '1.1'
        }}>
            {text}
        </h1>
    );
};

const FeatureList: React.FC<{ items: string[]; frame: number; start: number }> = ({ items, frame, start }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
            {items.map((item, i) => {
                const itemStart = start + (i * 12);
                const opacity = interpolate(frame, [itemStart, itemStart + 15], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                });
                const translateX = interpolate(frame, [itemStart, itemStart + 15], [-30, 0], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                });

                return (
                    <div key={i} style={{
                        opacity,
                        transform: `translateX(${translateX}px)`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '24px',
                        background: 'rgba(7, 19, 26, 0.6)',
                        padding: '24px',
                        borderRadius: '20px',
                        border: '1px solid rgba(167, 187, 198, 0.1)'
                    }}>
                        <CheckCircle2 size={36} color="#00adfc" />
                        <span style={{ fontSize: '32px', fontWeight: '500' }}>{item}</span>
                    </div>
                );
            })}
        </div>
    );
};

const MobileFrame: React.FC<{ file: string; frame: number; start: number }> = ({ file, frame, start }) => {
    const isFirstFrame = frame === 0 && start === 0;
    const opacity = isFirstFrame ? 1 : interpolate(frame, [start, start + 15], [0, 1], { extrapolateRight: 'clamp' });
    const scale = isFirstFrame ? 1 : spring({ frame: frame - start, fps: 30, config: { damping: 10 } });

    return (
        <div style={{
            opacity,
            transform: `scale(${scale})`,
            height: '850px',
            width: '400px',
            display: 'flex',
            justifyContent: 'center',
            filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.5))'
        }}>
            <img
                src={staticFile(file)}
                style={{
                    height: '100%',
                    width: 'auto',
                    borderRadius: '48px',
                    border: '12px solid #223b49',
                    objectFit: 'contain'
                }}
            />
        </div>
    );
};

const DesktopFrame: React.FC<{ file: string; frame: number; start: number }> = ({ file, frame, start }) => {
    const opacity = interpolate(frame, [start, start + 15], [0, 1], { extrapolateRight: 'clamp' });
    const scale = spring({ frame: frame - start, fps: 30, config: { damping: 10 } });

    return (
        <div style={{
            opacity,
            transform: `scale(${scale})`,
            width: '1000px',
            height: '563px',
            filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.5))'
        }}>
            <img
                src={staticFile(file)}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '20px',
                    border: '8px solid #223b49',
                    objectFit: 'cover'
                }}
            />
        </div>
    );
};

export const Showcase: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    return (
        <AbsoluteFill
            style={{
                backgroundColor: '#00040e',
                color: '#d7ebf7',
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
        >
            {/* Intro Scene (0-90) - STATIC START */}
            <Sequence durationInFrames={90}>
                <AbsoluteFill style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0 100px', backgroundColor: '#00040e' }}>
                    <div style={{ flex: 1, paddingRight: '60px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '40px' }}>
                        <img
                            src={staticFile("icon.svg")}
                            style={{
                                width: '150px',
                                height: '150px',
                                transform: frame === 0 ? 'scale(1)' : `scale(${spring({ frame, fps: 30, config: { damping: 12 } })})`
                            }}
                        />
                        <div style={{ textAlign: 'left' }}>
                            <Title text="Backpack Planner" frame={frame} start={0} color="#00adfc" align="left" />
                            <p style={{
                                fontSize: '48px',
                                fontWeight: 'bold',
                                color: '#d7ebf7',
                                opacity: frame === 0 ? 1 : interpolate(frame, [10, 25], [0, 1]),
                                margin: '-20px 0 20px 0'
                            }}>
                                For Run! Goddess
                            </p>
                            <p style={{
                                fontSize: '32px',
                                opacity: frame === 0 ? 1 : interpolate(frame, [20, 40], [0, 1]),
                                transform: `translateY(${frame === 0 ? 0 : interpolate(frame, [20, 40], [20, 0], { extrapolateRight: 'clamp' })}px)`,
                                maxWidth: '600px',
                                lineHeight: '1.4',
                                color: '#a7bbc6'
                            }}>
                                Plan and share optimized Backpack Tech builds.
                            </p>
                            <div style={{
                                marginTop: '30px',
                                opacity: frame === 0 ? 1 : interpolate(frame, [30, 50], [0, 1]),
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px'
                            }}>
                                <Link size={36} color="#00adfc" />
                                <p style={{ fontSize: '36px', fontWeight: 'bold', margin: 0, color: '#d7ebf7' }}>rgbp.app</p>
                            </div>
                        </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <MobileFrame file="mobile_late_pvp_context.png" frame={frame} start={0} />
                    </div>
                </AbsoluteFill>
            </Sequence>

            {/* Plan Your Builds: Late PvP (90-240) */}
            <Sequence from={90} durationInFrames={150}>
                <AbsoluteFill style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0 100px' }}>
                    <div style={{ flex: 1, paddingRight: '60px' }}>
                        <Title text="Plan Your Builds" frame={frame} start={100} align="left" />
                        <FeatureList
                            items={[
                                "Optimize for Late Game PvE and PvP",
                                "Manage All Skill Trees",
                                "Refine Your Strategy"
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

            {/* Track Tech Crystals (240-390) */}
            <Sequence from={240} durationInFrames={150}>
                <AbsoluteFill style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0 100px' }}>
                    <div style={{ flex: 1, paddingRight: '60px' }}>
                        <Title text="Tech Crystals" frame={frame} start={250} align="left" />
                        <FeatureList
                            items={[
                                "Track Tech Crystal Costs",
                                "Budget Your Progress",
                                "Analyze Your Stats"
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
                <AbsoluteFill style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0 100px' }}>
                    <div style={{ flex: 1, paddingRight: '60px' }}>
                        <div style={{ marginBottom: '40px' }}>
                            <img src={staticFile("icon.svg")} style={{ width: '120px' }} />
                        </div>
                        <Title text="Build & Optimize Now" frame={frame} start={400} align="left" color="#00adfc" />
                        <FeatureList
                            items={[
                                "Create Multiple Build Presets",
                                "Share and Preview Builds",
                                "Use Anywhere, Offline and in Your Language"
                            ]}
                            frame={frame}
                            start={420}
                        />
                        <div style={{
                            marginTop: '60px',
                            opacity: interpolate(frame, [450, 470], [0, 1]),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            <Link size={48} color="#00adfc" />
                            <p style={{ fontSize: '48px', fontWeight: 'bold', margin: 0 }}>rgbp.app</p>
                        </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <MobileFrame file="mobile_settings.png" frame={frame} start={410} />
                    </div>
                </AbsoluteFill>
            </Sequence>
        </AbsoluteFill>
    );
};
