import {Easing, interpolate, useCurrentFrame} from "remotion";

export type AnimatedTitleProps = {
  accentColor?: string;
  align?: "left" | "center" | "right";
  color?: string;
  durationInFrames?: number;
  eyebrow?: string;
  fontSize?: number;
  text: string;
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';

export const AnimatedTitle = ({
  accentColor = "#E5483F",
  align = "left",
  color = "#F4F1EA",
  durationInFrames = 24,
  eyebrow,
  fontSize = 92,
  text,
}: AnimatedTitleProps) => {
  const frame = useCurrentFrame();
  const entranceEnd = Math.max(2, durationInFrames - 1);
  const reveal = interpolate(frame, [0, entranceEnd], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const lineReveal = interpolate(frame, [4, entranceEnd], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

  return (
    <div
      style={{
        alignItems:
          align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        display: "flex",
        flexDirection: "column",
        textAlign: align,
      }}
    >
      {eyebrow ? (
        <div
          style={{
            color: accentColor,
            fontFamily: FONT_FAMILY,
            fontSize: 30,
            fontWeight: 750,
            letterSpacing: 7,
            marginBottom: 24,
            opacity: interpolate(frame, [2, 14], [0, 1], clamp),
            translate: `${interpolate(frame, [2, 14], [-26, 0], clamp)}px 0px`,
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <div style={{overflow: "hidden", padding: "0 6px 8px"}}>
        <div
          style={{
            color,
            fontFamily: FONT_FAMILY,
            fontSize,
            fontWeight: 850,
            letterSpacing: -3,
            lineHeight: 1.08,
            opacity: reveal,
            translate: `0px ${44 * (1 - reveal)}px`,
          }}
        >
          {text}
        </div>
      </div>
      <div
        style={{
          backgroundColor: accentColor,
          height: 5,
          marginTop: 26,
          scale: `${lineReveal} 1`,
          transformOrigin: align === "right" ? "100% 50%" : align === "center" ? "50% 50%" : "0% 50%",
          width: 150,
        }}
      />
    </div>
  );
};
