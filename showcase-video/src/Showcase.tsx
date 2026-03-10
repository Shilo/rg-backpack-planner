import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Sequence, staticFile } from 'remotion';
import { Layout, Share2, BarChart3, Binary, Zap, Settings, MousePointer2, Calculator, Save, Smartphone, CheckCircle2 } from 'lucide-react';

const Title: React.FC<{ text: string; frame: number; start: number; color?: string }> = ({ text, frame, start, color = 'white' }) => {
    const opacity = frame < start ? 0 : interpolate(frame, [start, start + 15], [0.1, 1], {
        extrapolateRight: 'clamp',
    });
    const translateY = interpolate(frame, [start, start + 15], [frame <= start ? 0 : 20, 0], {
        extrapolateRight: 'clamp',
    });

    return (
        <h1 style={{
            opacity: frame <= start ? 1 : opacity,
            transform: `translateY(${frame <= start ? 0 : translateY}px)`,
            fontSize: '60px',
            fontWeight: 'bold',
            color,
            textAlign: 'center',
            marginBottom: '40px',
            lineHeight: '1.1'
        }}>
            {text}
        </h1>
    );
};

const FeatureList: React.FC<{ items: string[]; frame: number; start: number }> = ({ items, frame, start }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', padding: '0 40px' }}>
            {items.map((item, i) => {
                const itemStart = start + (i * 15);
                const opacity = interpolate(frame, [itemStart, itemStart + 15], [0, 1], {
                    extrapolateRight: 'clamp',
                });
                const scale = spring({ frame: frame - itemStart, fps: 30, config: { damping: 12 } });

                return (
                    <div key={i} style={{
                        opacity,
                        transform: `scale(${scale})`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        background: 'rgba(30, 41, 59, 0.5)',
                        padding: '20px',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <CheckCircle2 size={32} color="#06b6d4" />
                        <span style={{ fontSize: '28px', fontWeight: '500' }}>{item}</span>
                    </div>
                );
            })}
        </div>
    );
};

const AppShot: React.FC<{ file: string; frame: number; start: number }> = ({ file, frame, start }) => {
    const opacity = interpolate(frame, [start, start + 15], [0, 1], { extrapolateRight: 'clamp' });
    const translateY = interpolate(frame, [start, start + 20], [100, 0], { extrapolateRight: 'clamp' });

    return (
        <div style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            width: '80%',
            margin: '0 auto',
            position: 'relative',
            zIndex: 1
        }}>
            <img
                src={staticFile(file)}
                style={{
                    width: '100%',
                    borderRadius: '40px',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
                    border: '8px solid #1e293b'
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
                backgroundColor: '#0f172a',
                color: 'white',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Intro Scene (0-90) */}
            <Sequence durationInFrames={90}>
                <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 40px' }}>
                    <Title text="Backpack Planner" frame={frame} start={0} color="#06b6d4" />
                    <Title text="The Ultimate Mobile Guide" frame={frame} start={20} />
                </AbsoluteFill>
            </Sequence>

            {/* Plan Your Builds: Late PvE (90-210) */}
            <Sequence from={90} durationInFrames={120}>
                <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', paddingTop: '80px' }}>
                    <Title text="Plan Your Builds" frame={frame} start={100} />
                    <AppShot file="mobile_late_pve.png" frame={frame} start={110} />
                    <div style={{ marginTop: '60px' }}>
                        <FeatureList
                            items={[
                                "Optimize Late PvE Builds",
                                "Manage All Skill Trees",
                                "Refine Your Strategy"
                            ]}
                            frame={frame}
                            start={130}
                        />
                    </div>
                </AbsoluteFill>
            </Sequence>

            {/* Track Tech Crystals (210-330) */}
            <Sequence from={210} durationInFrames={120}>
                <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', paddingTop: '80px' }}>
                    <Title text="Tech Crystals" frame={frame} start={220} />
                    <AppShot file="mobile_mid_build.png" frame={frame} start={230} />
                    <div style={{ marginTop: '60px' }}>
                        <FeatureList
                            items={[
                                "Track Tech Crystal Costs",
                                "Budget Your Progress",
                                "Analyze Your Stats"
                            ]}
                            frame={frame}
                            start={250}
                        />
                    </div>
                </AbsoluteFill>
            </Sequence>

            {/* Fully Customizable (330-450) */}
            <Sequence from={330} durationInFrames={120}>
                <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', paddingTop: '80px' }}>
                    <Title text="Personalize" frame={frame} start={340} />
                    <AppShot file="mobile_settings.png" frame={frame} start={350} />
                    <div style={{ marginTop: '60px' }}>
                        <FeatureList
                            items={[
                                "Custom Dark/Light Themes",
                                "Adjust UI & Node Labels",
                                "Localized Experience"
                            ]}
                            frame={frame}
                            start={370}
                        />
                    </div>
                </AbsoluteFill>
            </Sequence>

            {/* Outro (450+) */}
            <Sequence from={450}>
                <AbsoluteFill
                    style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.98)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        textAlign: 'center',
                        padding: '0 40px'
                    }}
                >
                    <div style={{ transform: `scale(${spring({ frame: frame - 460, fps: 30 })})`, marginBottom: '20px' }}>
                        <img src={staticFile("icon.svg")} style={{ width: '180px', height: '180px' }} />
                    </div>

                    <div style={{ marginTop: '20px', marginBottom: '40px' }}>
                        <Title text="Build & Optimize Now" frame={frame} start={470} color="#06b6d4" />
                    </div>

                    <div style={{ transform: `translateY(${interpolate(frame, [480, 500], [50, 0], { extrapolateRight: 'clamp' })}px)`, opacity: interpolate(frame, [480, 500], [0, 1]) }}>
                        <AppShot file="mobile_late_pve.png" frame={frame} start={480} />
                    </div>

                    <div style={{ marginTop: '60px', opacity: interpolate(frame, [500, 520], [0, 1]) }}>
                        <p style={{ fontSize: '36px', fontWeight: 'bold' }}>https://rgbp.app</p>
                    </div>
                </AbsoluteFill>
            </Sequence>
        </AbsoluteFill>
    );
};
