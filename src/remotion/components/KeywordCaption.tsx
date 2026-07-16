import {Easing, interpolate, useCurrentFrame} from "remotion";

export type KeywordCaptionProps = {
  accentColor?: string;
  durationInFrames?: number;
  keyword: string;
  position?: "top" | "upper_third" | "lower_third" | "bottom";
  text: string;
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';

export const KeywordCaption = ({
  accentColor = "#E5483F",
  durationInFrames = 24,
  keyword,
  position = "bottom",
  text,
}: KeywordCaptionProps) => {
  const frame = useCurrentFrame();
  const index = text.indexOf(keyword);
  const before = index >= 0 ? text.slice(0, index) : text;
  const after = index >= 0 ? text.slice(index + keyword.length) : "";
  const reveal = interpolate(frame, [0, Math.max(2, durationInFrames - 1)], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const highlight = interpolate(frame, [8, Math.max(9, durationInFrames - 1)], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const verticalPosition = {
    bottom: {bottom: 280},
    lower_third: {top: 1110},
    top: {top: 250},
    upper_third: {top: 470},
  }[position];

  return (
    <div
      style={{
        backgroundColor: "rgba(7, 9, 13, 0.78)",
        ...verticalPosition,
        color: "#F4F1EA",
        fontFamily: FONT_FAMILY,
        fontSize: 44,
        fontWeight: 700,
        left: 90,
        lineHeight: 1.35,
        opacity: reveal,
        padding: "16px 24px",
        position: "absolute",
        right: 150,
        textAlign: "center",
        translate: `0px ${28 * (1 - reveal)}px`,
      }}
    >
      <span>{before}</span>
      {index >= 0 ? (
        <span style={{display: "inline-block", position: "relative"}}>
          <span
            style={{
              backgroundColor: accentColor,
              bottom: 2,
              height: "42%",
              left: -3,
              opacity: 0.72,
              position: "absolute",
              scale: `${highlight} 1`,
              transformOrigin: "0% 50%",
              width: "calc(100% + 6px)",
              zIndex: 0,
            }}
          />
          <span style={{position: "relative", zIndex: 1}}>{keyword}</span>
        </span>
      ) : null}
      <span>{after}</span>
    </div>
  );
};
