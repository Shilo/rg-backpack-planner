import { Composition } from 'remotion';
import { Showcase } from './Showcase';

export const Root: React.FC = () => {
    return (
        <>
            <Composition
                id="Showcase"
                component={Showcase}
                durationInFrames={300} // 10 seconds at 30 fps
                fps={30}
                width={1920}
                height={1080}
            />
        </>
    );
};
