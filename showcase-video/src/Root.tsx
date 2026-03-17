import { Composition } from 'remotion';
import { Showcase } from './Showcase';

export const Root: React.FC = () => {
    return (
        <>
            <Composition
                id="Showcase"
                component={Showcase}
                durationInFrames={750} // 25 seconds at 30 fps
                fps={30}
                width={1920}
                height={1080}
            />
        </>
    );
};
