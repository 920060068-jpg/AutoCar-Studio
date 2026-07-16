import type {ReactNode} from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const COLORS = {
  accent: "#FF5A3D",
  background: "#07090D",
  muted: "#AEB6C2",
  text: "#F7F8FA",
};

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const SafeArea = ({children}: {children: ReactNode}) => {
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: "150px 150px 260px 90px",
        textAlign: "center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const DynamicBackground = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 52% 35%, #182130 0%, #0C1119 38%, #07090D 76%)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "rgba(255, 90, 61, 0.15)",
          borderRadius: "50%",
          filter: "blur(28px)",
          height: 540,
          left: -220,
          position: "absolute",
          top: 180,
          translate: `${interpolate(frame, [0, durationInFrames], [0, 150], clamp)}px ${interpolate(frame, [0, durationInFrames], [0, 90], clamp)}px`,
          width: 540,
        }}
      />
      <div
        style={{
          background: "rgba(44, 122, 255, 0.14)",
          borderRadius: "50%",
          filter: "blur(34px)",
          height: 680,
          position: "absolute",
          right: -330,
          top: 760,
          translate: `${interpolate(frame, [0, durationInFrames], [0, -110], clamp)}px ${interpolate(frame, [0, durationInFrames], [0, -70], clamp)}px`,
          width: 680,
        }}
      />
      <div
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          height: 2,
          left: -180,
          position: "absolute",
          rotate: "-14deg",
          top: 1180,
          translate: `${interpolate(frame, [0, durationInFrames], [-80, 180], clamp)}px 0px`,
          width: 1440,
        }}
      />
    </AbsoluteFill>
  );
};

const Intro = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 50, 59], [0, 1, 1, 0], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <SafeArea>
      <div
        style={{
          opacity,
          scale: interpolate(frame, [0, 59], [0.96, 1.02], clamp),
        }}
      >
        <div
          style={{
            color: COLORS.accent,
            fontFamily: FONT_FAMILY,
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: 8,
            marginBottom: 34,
          }}
        >
          AUTOCAR STUDIO
        </div>
        <div
          style={{
            color: COLORS.text,
            fontFamily: FONT_FAMILY,
            fontSize: 100,
            fontWeight: 800,
            lineHeight: 1.12,
          }}
        >
          AutoCar Studio V4
        </div>
      </div>
    </SafeArea>
  );
};

const OrderCounter = () => {
  const frame = useCurrentFrame();
  const count = Math.round(interpolate(frame, [10, 72], [0, 80000], clamp));
  const opacity = interpolate(frame, [0, 10, 78, 89], [0, 1, 1, 0], clamp);

  return (
    <SafeArea>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: 30,
          opacity,
        }}
      >
        <div
          style={{
            color: COLORS.text,
            fontFamily: FONT_FAMILY,
            fontSize: 66,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          汽车热点视频生产系统
        </div>
        <div
          style={{
            color: COLORS.accent,
            fontFamily: FONT_FAMILY,
            fontSize: 154,
            fontVariantNumeric: "tabular-nums",
            fontWeight: 850,
            letterSpacing: -6,
            lineHeight: 1,
          }}
        >
          {count.toLocaleString("en-US")}
        </div>
        <div
          style={{
            color: COLORS.muted,
            fontFamily: FONT_FAMILY,
            fontSize: 46,
            fontWeight: 650,
            letterSpacing: 8,
          }}
        >
          订单
        </div>
      </div>
    </SafeArea>
  );
};

const AbstractCar = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, 78, 89], [0, 1, 1, 0], clamp);

  return (
    <SafeArea>
      <div
        style={{
          opacity,
          scale: interpolate(frame, [0, 89], [0.96, 1.08], clamp),
          translate: `0px ${interpolate(frame, [0, 89], [30, -18], clamp)}px`,
          width: "100%",
        }}
      >
        <svg
          aria-label="抽象汽车轮廓占位图形"
          viewBox="0 0 820 420"
          style={{display: "block", overflow: "visible", width: "100%"}}
        >
          <defs>
            <linearGradient id="carStroke" x1="0" x2="1">
              <stop offset="0" stopColor="#FF5A3D" />
              <stop offset="1" stopColor="#FFB09F" />
            </linearGradient>
          </defs>
          <path
            d="M98 274 L156 266 L230 178 Q258 142 306 134 L496 134 Q548 138 580 174 L648 246 L724 268 Q748 276 750 302 L750 318 L674 318 Q660 256 598 256 Q536 256 520 318 L302 318 Q286 256 224 256 Q162 256 148 318 L82 318 L82 296 Q82 280 98 274 Z"
            fill="rgba(255, 255, 255, 0.025)"
            stroke="url(#carStroke)"
            strokeWidth="8"
            strokeLinejoin="round"
          />
          <path
            d="M252 184 Q274 154 316 152 L474 152 Q522 154 550 188 L592 238 L212 238 Z"
            fill="rgba(53, 119, 255, 0.12)"
            stroke="rgba(170, 204, 255, 0.42)"
            strokeWidth="5"
          />
          <circle cx="224" cy="318" r="54" fill="#0A0D13" stroke="#F7F8FA" strokeWidth="8" />
          <circle cx="598" cy="318" r="54" fill="#0A0D13" stroke="#F7F8FA" strokeWidth="8" />
          <circle cx="224" cy="318" r="18" fill="#FF5A3D" />
          <circle cx="598" cy="318" r="18" fill="#FF5A3D" />
        </svg>
        <div
          style={{
            color: COLORS.muted,
            fontFamily: FONT_FAMILY,
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: 5,
            marginTop: 30,
          }}
        >
          LOCAL GEOMETRY PLACEHOLDER
        </div>
      </div>
    </SafeArea>
  );
};

const Outro = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 44, 59], [0, 1, 1, 0], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <SafeArea>
      <div
        style={{
          opacity,
          scale: interpolate(frame, [0, 59], [0.98, 1.025], clamp),
        }}
      >
        <div
          style={{
            backgroundColor: COLORS.accent,
            height: 6,
            margin: "0 auto 38px",
            width: 120,
          }}
        />
        <div
          style={{
            color: COLORS.text,
            fontFamily: FONT_FAMILY,
            fontSize: 88,
            fontWeight: 800,
            lineHeight: 1.15,
          }}
        >
          Sprint 1 Render Test
        </div>
      </div>
    </SafeArea>
  );
};

export const VideoProject = () => {
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.background}}>
      <DynamicBackground />
      <Sequence from={0} durationInFrames={60} name="Intro">
        <Intro />
      </Sequence>
      <Sequence from={60} durationInFrames={90} name="Order counter">
        <OrderCounter />
      </Sequence>
      <Sequence from={150} durationInFrames={90} name="Abstract car">
        <AbstractCar />
      </Sequence>
      <Sequence from={240} durationInFrames={60} name="Outro">
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
