import {Easing, interpolate, useCurrentFrame} from "remotion";

export type NumberCounterProps = {
  accentColor?: string;
  durationInFrames?: number;
  end: number;
  label: string;
  locale?: string;
  start?: number;
  unit?: string;
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';

export const NumberCounter = ({
  accentColor = "#38C7C1",
  durationInFrames = 60,
  end,
  label,
  locale = "en-US",
  start = 0,
  unit,
}: NumberCounterProps) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [6, Math.max(7, durationInFrames - 1)], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const value = Math.round(start + (end - start) * progress);

  return (
    <div
      style={{
        alignItems: "flex-start",
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <div
        style={{
          color: "#B8BDC3",
          fontFamily: FONT_FAMILY,
          fontSize: 34,
          fontWeight: 450,
          letterSpacing: 4,
          marginBottom: 16,
        }}
      >
        {label}
      </div>
      <div
        style={{
          alignItems: "baseline",
          display: "flex",
          gap: 18,
        }}
      >
        <div
          style={{
            color: "#F4F1EA",
            fontFamily: FONT_FAMILY,
            fontSize: 156,
            fontVariantNumeric: "tabular-nums",
            fontWeight: 900,
            letterSpacing: -7,
            lineHeight: 1,
          }}
        >
          {value.toLocaleString(locale)}
        </div>
        {unit ? (
          <div
            style={{
              color: accentColor,
              fontFamily: FONT_FAMILY,
              fontSize: 44,
              fontWeight: 750,
            }}
          >
            {unit}
          </div>
        ) : null}
      </div>
      <div
        style={{
          backgroundColor: "rgba(244, 241, 234, 0.12)",
          height: 8,
          marginTop: 34,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div
          style={{
            backgroundColor: accentColor,
            height: "100%",
            scale: `${progress} 1`,
            transformOrigin: "0% 50%",
            width: "100%",
          }}
        />
      </div>
    </div>
  );
};
