import {Composition} from "remotion";

import {DirectorV2Project, Milestone1Project} from "./Milestone1Project";
import {MotionTestProject} from "./MotionTestProject";
import {VideoProject} from "./VideoProject";
import {
  XiaomiOriginalEditorialAudioTimingProject,
  XiaomiOriginalEditorialProject,
} from "./XiaomiOriginalEditorialProject";
import {PorscheH1EditorialProject} from "./PorscheH1EditorialProject";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="AutoCarStudioTest"
        component={VideoProject}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="AutoCarStudioMotionTest"
        component={MotionTestProject}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="AutoCarMilestone1FJ"
        component={Milestone1Project}
        durationInFrames={1200}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="AutoCarDirectorV2"
        component={DirectorV2Project}
        durationInFrames={1200}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="XiaomiSkyNomadOriginalEditorialSilentReviewV1"
        component={XiaomiOriginalEditorialProject}
        durationInFrames={1245}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="XiaomiSkyNomadAudioTimingR2"
        component={XiaomiOriginalEditorialAudioTimingProject}
        durationInFrames={1245}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="PorscheH1DeliveriesOriginalEditorialR1"
        component={PorscheH1EditorialProject}
        durationInFrames={1140}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
