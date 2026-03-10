import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Sequence, staticFile } from 'remotion';
import { Layout, Share2, BarChart3, Binary, Zap, Settings, MousePointer2, Calculator, Save } from 'lucide-react';

const Title: React.FC<{ text: string; frame: number; start: number; color?: string }> = ({ text, frame, start, color = 'white' }) => {
    const opacity = interpolate(frame, [start, start + 15], [0, 1], {
        extrapolateRight: 'clamp',
    });
    const translateY = interpolate(frame, [start, start + 15], [20, 0], {
        extrapolateRight: 'clamp',
    });

    return (
        <h1 style={{ opacity, transform: `translateY(${translateY}px)`, fontSize: '80px', fontWeight: 'bold', color }}>
            {text}
        </h1>
    );
};

const Feature: React.FC<{ icon: React.ReactNode; text: string; frame: number; start: number }> = ({ icon, text, frame, start }) => {
    const opacity = interpolate(frame, [start, start + 15], [0, 1], {
        extrapolateRight: 'clamp',
    });
    const scale = spring({ frame: frame - start, fps: 30, config: { damping: 12 } });

    return (
        <div style={{ opacity, transform: `scale(${scale})`, display: 'flex', alignItems: 'center', gap: '30px', margin: '15px 0' }}>
            <div style={{ color: '#06b6d4' }}>{icon}</div>
            <span style={{ fontSize: '40px' }}>{text}</span>
        </div>
    );
};

const AppShot: React.FC<{ file: string; frame: number; start: number }> = ({ file, frame, start }) => {
    const opacity = interpolate(frame, [start, start + 15], [0, 1], { extrapolateRight: 'clamp' });
    const scale = spring({ frame: frame - start, fps: 30, config: { damping: 12 } });

    return (
        <div style={{ opacity, transform: `scale(${scale})`, width: '100%', height: '100%', position: 'relative' }}>
            <img
                src={staticFile(file)}
                style={{
                    width: '100%',
                    borderRadius: '24px',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
                    border: '4px solid #1e293b'
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
            }}
        >
            {/* Intro Scene (0-90) */}
            <Sequence durationInFrames={90}>
                <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <Title text="Backpack Planner" frame={frame} start={10} color="#06b6d4" />
                    <Title text="Plan. Track. Share." frame={frame} start={40} />
                </AbsoluteFill>
            </Sequence>

            {/* Plan Your Builds (90-210) */}
            <Sequence from={90} durationInFrames={120}>
                <AbsoluteFill style={{ padding: '80px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <Title text="Plan Your Builds" frame={frame} start={100} />
                        <Feature icon={<Zap size={64} />} text="Late-Game Strategies" frame={frame} start={120} />
                        <Feature icon={<Layout size={64} />} text="Optimize All Trees" frame={frame} start={140} />
                    </div>
                    <div style={{ flex: 1.5 }}>
                        <AppShot file="late_pve.png" frame={frame} start={110} />
                    </div>
                </AbsoluteFill>
            </Sequence>

            {/* Track Your Progress (210-330) */}
            <Sequence from={210} durationInFrames={120}>
                <AbsoluteFill style={{ padding: '80px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <div style={{ flex: 1.5 }}>
                        <AppShot file="late_pve.png" frame={frame} start={220} />
                    </div>
                    <div style={{ flex: 1, marginLeft: '40px' }}>
                        <Title text="Track Progress" frame={frame} start={230} />
                        <Feature icon={<Calculator size={64} />} text="Crystal Cost Tracking" frame={frame} start={250} />
                        <Feature icon={<BarChart3 size={64} />} text="Detailed Statistics" frame={frame} start={270} />
                    </div>
                </AbsoluteFill>
            </Sequence>

            {/* Share With Others (330-450) */}
            <Sequence from={330} durationInFrames={120}>
                <AbsoluteFill style={{ padding: '80px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <Title text="Share with Friends" frame={frame} start={340} />
                        <Feature icon={<Share2 size={64} />} text="Instant Share Links" frame={frame} start={360} />
                        <Feature icon={<Save size={64} />} text="Build Export" frame={frame} start={380} />
                    </div>
                    <div style={{ flex: 1.5 }}>
                        <AppShot file="app_main_view.png" frame={frame} start={350} />
                    </div>
                </AbsoluteFill>
            </Sequence>

            {/* Outro (450+) */}
            <Sequence from={450}>
                <AbsoluteFill
                    style={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        textAlign: 'center'
                    }}
                >
                    <h2 style={{ fontSize: '80px', color: '#06b6d4' }}>Available Now</h2>
                    <p style={{ fontSize: '40px', marginTop: '20px' }}>https://rgbp.app</p>
                </AbsoluteFill>
            </Sequence>
        </AbsoluteFill>
    );
};
