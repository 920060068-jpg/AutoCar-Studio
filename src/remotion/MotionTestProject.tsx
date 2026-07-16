import type {ReactNode} from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {AnimatedTitle} from "./components/AnimatedTitle";
import {CinematicCamera} from "./components/CinematicCamera";
import {KeywordCaption} from "./components/KeywordCaption";
import {NumberCounter} from "./components/NumberCounter";
import {Transition} from "./components/Transition";

const COLORS = {
  accent: "#E5483F",
  background: "#111315",
  data: "#38C7C1",
  muted: "#B8BDC3",
  text: "#F4F1EA",
};

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const ContentFrame = ({children}: {children: ReactNode}) => {
  return (
    <AbsoluteFill
      style={{
        boxSizing: "border-box",
        padding: "150px 150px 260px 90px",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const MotionBackground = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.background, overflow: "hidden"}}>
      <div
        style={{
          backgroundColor: "rgba(229, 72, 63, 0.14)",
          borderRadius: "50%",
          filter: "blur(42px)",
          height: 580,
          left: -270,
          position: "absolute",
          top: 120,
          translate: `${interpolate(frame, [0, durationInFrames], [0, 130], clamp)}px ${interpolate(frame, [0, durationInFrames], [0, 80], clamp)}px`,
          width: 580,
        }}
      />
      <div
        style={{
          backgroundColor: "rgba(56, 199, 193, 0.1)",
          borderRadius: "50%",
          bottom: 120,
          filter: "blur(50px)",
          height: 720,
          position: "absolute",
          right: -360,
          translate: `${interpolate(frame, [0, durationInFrames], [0, -120], clamp)}px ${interpolate(frame, [0, durationInFrames], [0, -60], clamp)}px`,
          width: 720,
        }}
      />
      <div
        style={{
          color: "rgba(244, 241, 234, 0.028)",
          fontFamily: FONT_FAMILY,
          fontSize: 280,
          fontWeight: 900,
          left: -40,
          letterSpacing: -16,
          position: "absolute",
          rotate: "-90deg",
          top: 1020,
          translate: `${interpolate(frame, [0, durationInFrames], [-40, 50], clamp)}px 0px`,
          whiteSpace: "nowrap",
        }}
      >
        MOTION
      </div>
      <div
        style={{
          backgroundColor: "rgba(244, 241, 234, 0.1)",
          height: 2,
          left: 90,
          position: "absolute",
          right: 150,
          top: 150,
        }}
      />
    </AbsoluteFill>
  );
};

const IntroScene = () => {
  const frame = useCurrentFrame();
  const supportReveal = interpolate(frame, [10, 26], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <CinematicCamera durationInFrames={60} intensity={0.65} motion="push_in">
      <ContentFrame>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "center",
          }}
        >
          <AnimatedTitle
            accentColor={COLORS.accent}
            durationInFrames={26}
            eyebrow="MOTION ENGINE"
            fontSize={98}
            text="AutoCar Studio V4"
          />
          <div
            style={{
              color: COLORS.muted,
              fontFamily: FONT_FAMILY,
              fontSize: 30,
              fontWeight: 400,
              letterSpacing: 5,
              marginTop: 54,
              opacity: supportReveal,
              translate: `${-30 * (1 - supportReveal)}px 0px`,
            }}
          >
            CAMERA · TYPE · DATA · TRANSITION
          </div>
        </div>
      </ContentFrame>
    </CinematicCamera>
  );
};

const DataScene = () => {
  return (
    <AbsoluteFill>
      <CinematicCamera durationInFrames={90} intensity={0.3} motion="tracking">
        <ContentFrame>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              justifyContent: "center",
            }}
          >
            <AnimatedTitle
              accentColor={COLORS.data}
              durationInFrames={24}
              eyebrow="DATA MOTION"
              fontSize={64}
              text="汽车热点视频生产系统"
            />
            <div style={{marginTop: 70, width: "94%"}}>
              <NumberCounter
                accentColor={COLORS.data}
                durationInFrames={76}
                end={80000}
                label="本地合成测试值"
                unit="订单"
              />
            </div>
          </div>
        </ContentFrame>
      </CinematicCamera>
      <KeywordCaption
        accentColor={COLORS.data}
        durationInFrames={22}
        keyword="汽车热点"
        text="动态字幕突出汽车热点"
      />
    </AbsoluteFill>
  );
};

const CarGeometry = () => {
  return (
    <svg
      aria-label="本地抽象汽车轮廓"
      viewBox="0 0 820 460"
      style={{display: "block", overflow: "visible", width: "100%"}}
    >
      <defs>
        <linearGradient id="motionCarStroke" x1="0" x2="1">
          <stop offset="0" stopColor={COLORS.accent} />
          <stop offset="1" stopColor="#F4F1EA" />
        </linearGradient>
      </defs>
      <path
        d="M74 316 L126 284 L202 272 L274 170 Q296 140 346 134 L514 134 Q564 138 598 176 L664 252 L744 284 L760 326 L694 326 Q682 262 620 262 Q558 262 542 326 L296 326 Q280 262 218 262 Q156 262 142 326 L74 326 Z"
        fill="rgba(244, 241, 234, 0.025)"
        stroke="url(#motionCarStroke)"
        strokeLinejoin="round"
        strokeWidth="8"
      />
      <path
        d="M286 184 Q306 154 350 152 L498 152 Q544 154 572 190 L618 246 L244 246 Z"
        fill="rgba(56, 199, 193, 0.1)"
        stroke="rgba(56, 199, 193, 0.55)"
        strokeWidth="5"
      />
      <path d="M82 352 L742 352" stroke="rgba(244, 241, 234, 0.16)" strokeWidth="3" />
      <circle cx="218" cy="326" r="58" fill="#111315" stroke="#F4F1EA" strokeWidth="8" />
      <circle cx="620" cy="326" r="58" fill="#111315" stroke="#F4F1EA" strokeWidth="8" />
      <circle cx="218" cy="326" r="19" fill={COLORS.accent} />
      <circle cx="620" cy="326" r="19" fill={COLORS.accent} />
    </svg>
  );
};

const CameraScene = () => {
  const frame = useCurrentFrame();
  const sceneReveal = interpolate(frame, [0, 16], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill>
      <CinematicCamera durationInFrames={90} intensity={0.9} motion="push_in">
        <ContentFrame>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              justifyContent: "center",
              opacity: sceneReveal,
              translate: `0px ${30 * (1 - sceneReveal)}px`,
            }}
          >
            <div
              style={{
                color: COLORS.accent,
                fontFamily: FONT_FAMILY,
                fontSize: 30,
                fontWeight: 750,
                letterSpacing: 7,
                marginBottom: 28,
              }}
            >
              CINEMATIC CAMERA · PUSH IN
            </div>
            <CarGeometry />
          </div>
        </ContentFrame>
      </CinematicCamera>
      <KeywordCaption
        durationInFrames={24}
        keyword="镜头推进"
        text="镜头推进建立汽车视觉重心"
      />
    </AbsoluteFill>
  );
};

const OutroScene = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, 44, 59], [0, 1, 1, 0], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <ContentFrame>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          opacity,
        }}
      >
        <AnimatedTitle
          accentColor={COLORS.accent}
          durationInFrames={24}
          eyebrow="LOCAL PIPELINE VERIFIED"
          fontSize={88}
          text="Sprint 2 Motion Test"
        />
      </div>
    </ContentFrame>
  );
};

export const MotionTestProject = () => {
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.background}}>
      <MotionBackground />
      <Sequence from={0} durationInFrames={60} name="Motion intro">
        <IntroScene />
      </Sequence>
      <Sequence from={60} durationInFrames={90} name="Data motion">
        <DataScene />
      </Sequence>
      <Sequence from={150} durationInFrames={90} name="Camera motion">
        <CameraScene />
      </Sequence>
      <Sequence from={240} durationInFrames={60} name="Motion outro">
        <OutroScene />
      </Sequence>
      <Sequence from={52} durationInFrames={16} name="Light wipe transition">
        <Transition durationInFrames={16} type="light_wipe" />
      </Sequence>
      <Sequence from={142} durationInFrames={16} name="Blur transition">
        <Transition durationInFrames={16} type="cinematic_blur" />
      </Sequence>
      <Sequence from={232} durationInFrames={18} name="Zoom transition">
        <Transition durationInFrames={18} type="zoom_transition" />
      </Sequence>
    </AbsoluteFill>
  );
};
