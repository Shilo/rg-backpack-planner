import { Composition } from 'remotion';
import { Showcase } from './Showcase';

export const Root: React.FC = () => {
    return (
        <>
            <Composition
                id="Showcase"
                component={Showcase}
                durationInFrames={540} // 18 seconds at 30 fps
                fps={30}
                width={1080}
                height={1920}
            />
        </>
    );
};
