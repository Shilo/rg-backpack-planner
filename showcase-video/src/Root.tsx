import { Composition } from 'remotion';
import { Showcase } from './Showcase';
import type { ShowcaseProps } from './Showcase';

const defaultProps: ShowcaseProps = {
    locale: 'en',
    translations: {
        forRunGoddess: 'For Run! Goddess',
        planAndShare: 'Plan and share optimized\nbackpack builds',
        planYourBuild: 'Plan Your Build',
        planFeature1: 'Prepare for late game PvE and PvP',
        planFeature2: 'Quickly manage every skill tree',
        planFeature3: 'Optimize your strategy and progression',
        trackYourProgress: 'Track Your Progress',
        trackFeature1: 'Monitor Tech Crystals and node levels',
        trackFeature2: 'Budget your progress and plan ahead',
        trackFeature3: 'Review and share your total stats',
        planTrackShare: 'Plan, Track and Share',
        shareFeature1: 'Create and edit multiple build presets',
        shareFeature2: 'Share and preview custom or recommended builds',
        shareFeature3: 'Use everywhere, offline and in your language',
    },
};

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
                defaultProps={defaultProps}
            />
        </>
    );
};
