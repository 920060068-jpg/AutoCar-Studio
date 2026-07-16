import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from "remotion";

export type TransitionName =
  | "speed_blur"
  | "light_flash"
  | "directional_wipe"
  | "light_wipe"
  | "cinematic_blur"
  | "zoom_transition";

export type TransitionProps = {
  accentColor?: string;
  durationInFrames?: number;
  type: TransitionName;
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const Transition = ({
  accentColor = "#E5483F",
  durationInFrames = 15,
  type,
}: TransitionProps) => {
  const frame = useCurrentFrame();
  const duration = Math.max(2, durationInFrames);
  const progress = interpolate(frame, [0, duration - 1], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  const peak = Math.sin(progress * Math.PI);

  if (type === "speed_blur") {
    const travel = interpolate(progress, [0, 1], [-1280, 1280], clamp);
    return (
      <AbsoluteFill
        data-transition={type}
        style={{
          backdropFilter: `blur(${peak * 20}px)`,
          backgroundColor: `rgba(17, 19, 21, ${peak * 0.22})`,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            style={{
              background: index === 1 ? accentColor : "rgba(244, 241, 234, 0.72)",
              filter: "blur(18px)",
              height: 320,
              left: -420,
              opacity: peak * (0.42 - index * 0.08),
              position: "absolute",
              top: 430 + index * 350,
              transform: `translateX(${travel + index * 160}px) skewX(-24deg)`,
              width: 1420,
            }}
          />
        ))}
      </AbsoluteFill>
    );
  }

  if (type === "light_flash") {
    return (
      <AbsoluteFill
        data-transition={type}
        style={{
          background: `radial-gradient(circle at 62% 46%, rgba(255,255,255,${peak * 0.95}) 0%, rgba(255,255,255,${peak * 0.72}) 18%, ${accentColor} 42%, rgba(17,19,21,0) 76%)`,
          mixBlendMode: "screen",
          opacity: peak,
          pointerEvents: "none",
          zIndex: 100,
        }}
      />
    );
  }

  if (type === "directional_wipe") {
    const travel = interpolate(progress, [0, 0.5, 1], [-1320, 0, 1320], clamp);
    return (
      <AbsoluteFill data-transition={type} style={{overflow: "hidden", pointerEvents: "none", zIndex: 100}}>
        <div
          style={{
            background: `linear-gradient(112deg, rgba(17,19,21,0) 0%, ${accentColor} 30%, rgba(244,241,234,0.96) 49%, ${accentColor} 68%, rgba(17,19,21,0) 100%)`,
            filter: "blur(8px)",
            height: "130%",
            left: -420,
            opacity: 0.92,
            position: "absolute",
            top: "-15%",
            transform: `translateX(${travel}px) skewX(-16deg)`,
            width: 1500,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (type === "cinematic_blur") {
    return (
      <AbsoluteFill
        data-transition={type}
        style={{
          backdropFilter: `blur(${peak * 14}px)`,
          backgroundColor: `rgba(244, 241, 234, ${peak * 0.24})`,
          pointerEvents: "none",
          zIndex: 100,
        }}
      />
    );
  }

  if (type === "zoom_transition") {
    return (
      <AbsoluteFill
        data-transition={type}
        style={{
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        <div
          style={{
            background: `radial-gradient(circle, ${accentColor} 0%, rgba(229, 72, 63, 0) 68%)`,
            borderRadius: "50%",
            height: 1500,
            opacity: peak * 0.72,
            scale: 0.7 + progress * 1.1,
            width: 1500,
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      data-transition={type}
      style={{overflow: "hidden", pointerEvents: "none", zIndex: 100}}
    >
      <div
        style={{
          background: `linear-gradient(90deg, rgba(229, 72, 63, 0), ${accentColor}, rgba(244, 241, 234, 0.96), ${accentColor}, rgba(229, 72, 63, 0))`,
          filter: "blur(12px)",
          height: "130%",
          left: "50%",
          position: "absolute",
          top: "-15%",
          translate: `${interpolate(progress, [0, 1], [-1100, 1100], clamp)}px 0px`,
          width: 460,
        }}
      />
    </AbsoluteFill>
  );
};
