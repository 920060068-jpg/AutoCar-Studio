import type {CSSProperties, ReactNode} from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type CameraMotion =
  | "dolly_in"
  | "dolly_out"
  | "truck_left"
  | "truck_right"
  | "pan_left"
  | "pan_right"
  | "tilt_up"
  | "tilt_down"
  | "push_in"
  | "pull_out"
  | "orbit"
  | "tracking"
  | "parallax";

export type CinematicCameraProps = {
  children: ReactNode;
  durationInFrames?: number;
  intensity?: number;
  motion: CameraMotion;
  style?: CSSProperties;
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const CinematicCamera = ({
  children,
  durationInFrames,
  intensity = 1,
  motion,
  style,
}: CinematicCameraProps) => {
  const frame = useCurrentFrame();
  const videoConfig = useVideoConfig();
  const duration = Math.max(2, durationInFrames ?? videoConfig.durationInFrames);
  const strength = Math.max(0, Math.min(2, intensity));
  const progress = interpolate(frame, [0, duration - 1], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.33, 0, 0.2, 1),
  });

  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let rotateX = 0;
  let rotateY = 0;
  let rotateZ = 0;

  if (motion === "push_in" || motion === "dolly_in") {
    scale = 1 + progress * 0.08 * strength;
    translateY = (0.5 - progress) * 14 * strength;
  } else if (motion === "pull_out" || motion === "dolly_out") {
    scale = 1.08 * strength + (1 - strength) * 1 - progress * 0.08 * strength;
    translateY = (progress - 0.5) * 14 * strength;
  } else if (motion === "orbit") {
    translateX = (progress - 0.5) * 72 * strength;
    translateY = Math.sin(progress * Math.PI) * -8 * strength;
    rotateY = (progress - 0.5) * -8 * strength;
    rotateZ = (progress - 0.5) * 1.5 * strength;
    scale = 1 + Math.sin(progress * Math.PI) * 0.025 * strength;
  } else if (motion === "tracking" || motion === "truck_right") {
    translateX = (progress - 0.5) * 54 * strength;
    scale = 1.025;
  } else if (motion === "truck_left") {
    translateX = (0.5 - progress) * 54 * strength;
    scale = 1.025;
  } else if (motion === "pan_left") {
    translateX = (0.5 - progress) * 74 * strength;
    rotateY = (progress - 0.5) * 3.5 * strength;
    scale = 1.035;
  } else if (motion === "pan_right") {
    translateX = (progress - 0.5) * 74 * strength;
    rotateY = (0.5 - progress) * 3.5 * strength;
    scale = 1.035;
  } else if (motion === "tilt_up") {
    translateY = (0.5 - progress) * 52 * strength;
    rotateX = (progress - 0.5) * 2.4 * strength;
    scale = 1.025;
  } else if (motion === "tilt_down") {
    translateY = (progress - 0.5) * 52 * strength;
    rotateX = (0.5 - progress) * 2.4 * strength;
    scale = 1.025;
  } else if (motion === "parallax") {
    translateX = (progress - 0.5) * 42 * strength;
    translateY = (0.5 - progress) * 16 * strength;
    scale = 1 + progress * 0.025 * strength;
  }

  return (
    <AbsoluteFill
      data-camera-motion={motion}
      style={{
        ...style,
        transform: `perspective(1800px) translate3d(${translateX}px, ${translateY}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
        transformOrigin: "50% 50%",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
