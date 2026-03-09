import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const Showcase: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames, width, height } = useVideoConfig();

    const opacity = interpolate(frame, [0, 30], [0, 1], {
        extrapolateRight: 'clamp',
    });

    return (
        <AbsoluteFill
            style={{
                backgroundColor: '#0f172a',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                fontSize: '80px',
                fontFamily: 'sans-serif',
            }}
        >
            <div style={{ opacity }}>
                <h1>Backpack Planner</h1>
                <p style={{ fontSize: '40px', textAlign: 'center' }}>
                    Professional Showcase Video
                </p>
            </div>
        </AbsoluteFill>
    );
};
