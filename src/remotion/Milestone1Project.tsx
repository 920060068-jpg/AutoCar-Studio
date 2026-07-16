import type {ReactNode} from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {AudioTrack} from "./components/AudioTrack";
import {CinematicCamera} from "./components/CinematicCamera";
import {KeywordCaption} from "./components/KeywordCaption";
import {NumberCounter} from "./components/NumberCounter";
import {Transition} from "./components/Transition";
import {
  DIRECTOR_V2_CAPTIONS,
  DIRECTOR_V2_SHOTS,
  DIRECTOR_V2_TRANSITIONS,
  MILESTONE1_CAPTIONS,
  MILESTONE1_SHOTS,
} from "./milestone1Data";

const COLORS = {
  accent: "#E5483F",
  background: "#111315",
  data: "#38C7C1",
  line: "rgba(244, 241, 234, 0.18)",
  muted: "#B8BDC3",
  sand: "#D9C7A3",
  surface: "#1B1F23",
  text: "#F4F1EA",
};

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

type DirectorAssetPlacement = {
  assetId: string;
  backgroundExtension: boolean;
  fit: "contain" | "cover";
  objectPosition: string;
  opacity: number;
  path: string;
  scaleEnd: number;
  scaleStart: number;
  translateEnd: [number, number];
  translateStart: [number, number];
};

const DIRECTOR_ASSET_PLACEMENTS: Record<string, DirectorAssetPlacement> = {
  dv2_01: {
    assetId: "toyota_land_cruiser_fj_driving_19d6466b27ae",
    backgroundExtension: true,
    fit: "contain",
    objectPosition: "50% 50%",
    opacity: 0.9,
    path: "brands/toyota/driving/20260514_01_01.jpg",
    scaleEnd: 1.05,
    scaleStart: 0.98,
    translateEnd: [0, -12],
    translateStart: [0, 16],
  },
  dv2_02: {
    assetId: "toyota_land_cruiser_fj_exterior_c8736e037aa0",
    backgroundExtension: true,
    fit: "contain",
    objectPosition: "50% 52%",
    opacity: 0.88,
    path: "brands/toyota/exterior/20260514_01_21.jpg",
    scaleEnd: 1.02,
    scaleStart: 0.97,
    translateEnd: [24, 0],
    translateStart: [-24, 0],
  },
  dv2_03: {
    assetId: "toyota_land_cruiser_fj_driving_45c1062b42d7",
    backgroundExtension: false,
    fit: "cover",
    objectPosition: "52% 50%",
    opacity: 0.82,
    path: "brands/toyota/driving/20260514_01_03.jpg",
    scaleEnd: 1.12,
    scaleStart: 1.06,
    translateEnd: [-26, 0],
    translateStart: [22, 0],
  },
  dv2_05: {
    assetId: "toyota_land_cruiser_fj_exterior_c8736e037aa0",
    backgroundExtension: true,
    fit: "contain",
    objectPosition: "50% 58%",
    opacity: 0.78,
    path: "brands/toyota/exterior/20260514_01_21.jpg",
    scaleEnd: 1.04,
    scaleStart: 1,
    translateEnd: [-34, 34],
    translateStart: [34, 22],
  },
  dv2_06: {
    assetId: "toyota_land_cruiser_fj_exterior_c8736e037aa0",
    backgroundExtension: true,
    fit: "contain",
    objectPosition: "50% 46%",
    opacity: 0.62,
    path: "brands/toyota/exterior/20260514_01_21.jpg",
    scaleEnd: 0.94,
    scaleStart: 1.03,
    translateEnd: [0, -38],
    translateStart: [0, 12],
  },
  dv2_08: {
    assetId: "toyota_land_cruiser_fj_driving_19d6466b27ae",
    backgroundExtension: true,
    fit: "contain",
    objectPosition: "46% 54%",
    opacity: 0.72,
    path: "brands/toyota/driving/20260514_01_01.jpg",
    scaleEnd: 0.99,
    scaleStart: 0.94,
    translateEnd: [42, 18],
    translateStart: [-42, -8],
  },
  dv2_09: {
    assetId: "toyota_land_cruiser_fj_exterior_2a80fcbae3e4",
    backgroundExtension: false,
    fit: "cover",
    objectPosition: "50% 58%",
    opacity: 0.76,
    path: "brands/toyota/exterior/20260514_01_27.jpg",
    scaleEnd: 1.1,
    scaleStart: 1.04,
    translateEnd: [0, 36],
    translateStart: [0, -30],
  },
  dv2_12: {
    assetId: "toyota_land_cruiser_fj_driving_45c1062b42d7",
    backgroundExtension: false,
    fit: "cover",
    objectPosition: "50% 54%",
    opacity: 0.68,
    path: "brands/toyota/driving/20260514_01_03.jpg",
    scaleEnd: 1.22,
    scaleStart: 1.16,
    translateEnd: [18, -10],
    translateStart: [-18, 10],
  },
  dv2_14: {
    assetId: "toyota_land_cruiser_fj_launch_5bdbd4759f87",
    backgroundExtension: true,
    fit: "contain",
    objectPosition: "50% 52%",
    opacity: 0.86,
    path: "brands/toyota/launch/20260514_01_19.jpg",
    scaleEnd: 0.96,
    scaleStart: 1.04,
    translateEnd: [0, 26],
    translateStart: [0, -18],
  },
};

const ApprovedToyotaAssetLayer = ({durationInFrames, shotId}: {durationInFrames: number; shotId: string}) => {
  const frame = useCurrentFrame();
  const placement = DIRECTOR_ASSET_PLACEMENTS[shotId];

  if (!placement) return null;

  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 1], clamp);
  const scale = interpolate(progress, [0, 1], [placement.scaleStart, placement.scaleEnd], clamp);
  const translateX = interpolate(progress, [0, 1], [placement.translateStart[0], placement.translateEnd[0]], clamp);
  const translateY = interpolate(progress, [0, 1], [placement.translateStart[1], placement.translateEnd[1]], clamp);
  const src = staticFile(placement.path);

  return (
    <AbsoluteFill data-asset-id={placement.assetId} style={{backgroundColor: COLORS.background, overflow: "hidden"}}>
      {placement.backgroundExtension ? (
        <Img
          src={src}
          style={{
            filter: "blur(42px) brightness(0.42) saturate(0.8)",
            height: "100%",
            objectFit: "cover",
            opacity: 0.86,
            scale: 1.18,
            width: "100%",
          }}
        />
      ) : null}
      <Img
        src={src}
        style={{
          height: "100%",
          objectFit: placement.fit,
          objectPosition: placement.objectPosition,
          opacity: placement.opacity,
          scale,
          translate: `${translateX}px ${translateY}px`,
          width: "100%",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(8,10,12,0.58) 0%, rgba(8,10,12,0.12) 38%, rgba(8,10,12,0.36) 65%, rgba(8,10,12,0.68) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const SafeFrame = ({children}: {children: ReactNode}) => {
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

const GlobalBackground = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const travel = interpolate(frame, [0, durationInFrames - 1], [0, -190], clamp);

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.background, overflow: "hidden"}}>
      <div
        style={{
          background:
            "radial-gradient(circle, rgba(229,72,63,0.22) 0%, rgba(229,72,63,0) 68%)",
          borderRadius: "50%",
          filter: "blur(36px)",
          height: 760,
          left: -420,
          position: "absolute",
          top: 80,
          translate: `${interpolate(frame, [0, durationInFrames - 1], [0, 170], clamp)}px 0px`,
          width: 760,
        }}
      />
      <div
        style={{
          background:
            "radial-gradient(circle, rgba(56,199,193,0.15) 0%, rgba(56,199,193,0) 70%)",
          borderRadius: "50%",
          bottom: -260,
          filter: "blur(46px)",
          height: 920,
          position: "absolute",
          right: -500,
          translate: `${interpolate(frame, [0, durationInFrames - 1], [0, -150], clamp)}px 0px`,
          width: 920,
        }}
      />
      <svg
        aria-label="持续运动的原创地形线背景"
        viewBox="0 0 1080 1920"
        style={{height: "100%", opacity: 0.54, position: "absolute", width: "100%"}}
      >
        <g fill="none" stroke="rgba(217,199,163,0.13)" strokeWidth="3" transform={`translate(${travel} 0)`}>
          <path d="M-220 1240 C40 1110 210 1320 470 1180 S890 1050 1320 1220" />
          <path d="M-220 1300 C50 1170 250 1380 510 1240 S920 1110 1320 1280" />
          <path d="M-220 1360 C80 1230 300 1430 560 1310 S980 1180 1320 1340" />
          <path d="M-220 1420 C110 1300 350 1490 620 1380 S1010 1260 1320 1410" />
        </g>
      </svg>
      <div
        style={{
          backgroundColor: "rgba(244,241,234,0.1)",
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

const EditorialHeader = ({section}: {section: string}) => {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          color: COLORS.accent,
          fontFamily: FONT_FAMILY,
          fontSize: 29,
          fontWeight: 800,
          letterSpacing: 5,
        }}
      >
        MILESTONE 01 · REAL NEWS
      </div>
      <div
        style={{
          color: COLORS.muted,
          fontFamily: FONT_FAMILY,
          fontSize: 27,
          fontWeight: 600,
          letterSpacing: 3,
        }}
      >
        {section}
      </div>
    </div>
  );
};

const SourceNote = ({children}: {children: ReactNode}) => {
  return (
    <div
      style={{
        color: "rgba(244,241,234,0.62)",
        fontFamily: FONT_FAMILY,
        fontSize: 27,
        fontWeight: 500,
        letterSpacing: 1,
        lineHeight: 1.35,
        marginTop: 26,
      }}
    >
      {children}
    </div>
  );
};

const GenericSuv = ({detail = false}: {detail?: boolean}) => {
  return (
    <svg
      aria-label="项目自有方正越野车抽象轮廓"
      viewBox="0 0 860 500"
      style={{display: "block", overflow: "visible", width: "100%"}}
    >
      <path
        d="M92 356 L118 270 L190 252 L248 142 Q262 116 296 116 L598 116 Q628 116 646 144 L710 248 L784 278 L802 356 L722 356 Q710 286 642 286 Q574 286 558 356 L324 356 Q308 286 240 286 Q172 286 158 356 Z"
        fill="rgba(244,241,234,0.035)"
        stroke={COLORS.text}
        strokeLinejoin="round"
        strokeWidth="8"
      />
      <path
        d="M270 154 L590 154 L662 246 L224 246 Z"
        fill="rgba(56,199,193,0.11)"
        stroke="rgba(56,199,193,0.72)"
        strokeWidth="5"
      />
      <path d="M438 154 L438 246" stroke="rgba(244,241,234,0.42)" strokeWidth="5" />
      <path d="M92 356 L800 356" stroke="rgba(217,199,163,0.34)" strokeWidth="4" />
      <circle cx="240" cy="356" r="66" fill={COLORS.background} stroke={COLORS.text} strokeWidth="9" />
      <circle cx="642" cy="356" r="66" fill={COLORS.background} stroke={COLORS.text} strokeWidth="9" />
      <circle cx="240" cy="356" r="21" fill={COLORS.accent} />
      <circle cx="642" cy="356" r="21" fill={COLORS.accent} />
      {detail ? (
        <g fill="none" stroke={COLORS.accent} strokeWidth="7">
          <path d="M212 300 L670 300" />
          <path d="M226 332 L656 332" />
          <path d="M270 292 L270 340 M378 292 L378 340 M486 292 L486 340 M594 292 L594 340" />
        </g>
      ) : null}
    </svg>
  );
};

const FrontSuvDiagram = () => {
  return (
    <svg aria-label="项目自有越野车低机位正面示意" viewBox="0 0 860 520" style={{display: "block", overflow: "visible", width: "100%"}}>
      <path d="M118 390 L154 220 Q170 160 238 132 L622 132 Q690 160 706 220 L742 390 Z" fill="rgba(244,241,234,0.04)" stroke={COLORS.text} strokeLinejoin="round" strokeWidth="9" />
      <path d="M234 166 H626 L676 262 H184 Z" fill="rgba(56,199,193,0.12)" stroke={COLORS.data} strokeWidth="6" />
      <path d="M170 306 H690" stroke={COLORS.text} strokeWidth="10" />
      <path d="M298 304 V392 M430 304 V392 M562 304 V392" stroke={COLORS.accent} strokeWidth="9" />
      <rect x="136" y="272" width="128" height="54" rx="14" fill={COLORS.sand} opacity="0.88" />
      <rect x="596" y="272" width="128" height="54" rx="14" fill={COLORS.sand} opacity="0.88" />
      <path d="M92 420 H768" stroke="rgba(217,199,163,0.35)" strokeWidth="5" />
    </svg>
  );
};

const TopDownSuvDiagram = () => {
  return (
    <svg aria-label="项目自有越野车俯视动态示意" viewBox="0 0 520 860" style={{display: "block", overflow: "visible", width: "100%"}}>
      <path d="M126 118 Q260 62 394 118 L432 218 V642 L394 742 Q260 798 126 742 L88 642 V218 Z" fill="rgba(244,241,234,0.05)" stroke={COLORS.text} strokeLinejoin="round" strokeWidth="12" />
      <path d="M150 198 Q260 158 370 198 V354 H150 Z" fill="rgba(56,199,193,0.15)" stroke={COLORS.data} strokeWidth="7" />
      <path d="M150 506 H370 V668 Q260 704 150 668 Z" fill="rgba(229,72,63,0.1)" stroke={COLORS.accent} strokeWidth="7" />
      <path d="M128 430 H392" stroke={COLORS.sand} strokeWidth="7" />
      <rect x="54" y="226" width="54" height="154" rx="18" fill={COLORS.background} stroke={COLORS.text} strokeWidth="8" />
      <rect x="412" y="226" width="54" height="154" rx="18" fill={COLORS.background} stroke={COLORS.text} strokeWidth="8" />
      <rect x="54" y="488" width="54" height="154" rx="18" fill={COLORS.background} stroke={COLORS.text} strokeWidth="8" />
      <rect x="412" y="488" width="54" height="154" rx="18" fill={COLORS.background} stroke={COLORS.text} strokeWidth="8" />
    </svg>
  );
};

const RearSuvDiagram = () => {
  return (
    <svg aria-label="项目自有越野车远离尾部示意" viewBox="0 0 860 500" style={{display: "block", overflow: "visible", width: "100%"}}>
      <path d="M132 372 L170 182 Q182 134 238 122 H622 Q678 134 690 182 L728 372 Z" fill="rgba(244,241,234,0.035)" stroke={COLORS.text} strokeLinejoin="round" strokeWidth="9" />
      <path d="M236 158 H624 L666 256 H194 Z" fill="rgba(17,19,21,0.8)" stroke="rgba(56,199,193,0.68)" strokeWidth="6" />
      <rect x="168" y="284" width="138" height="58" rx="14" fill={COLORS.accent} />
      <rect x="554" y="284" width="138" height="58" rx="14" fill={COLORS.accent} />
      <path d="M308 370 H552" stroke={COLORS.sand} strokeWidth="7" />
      <path d="M70 420 H790" stroke="rgba(217,199,163,0.28)" strokeWidth="5" />
    </svg>
  );
};

const DimensionProfileDiagram = () => {
  return (
    <svg
      aria-label="项目自有车辆尺寸侧视示意"
      viewBox="0 0 900 430"
      style={{display: "block", overflow: "visible", width: "100%"}}
    >
      <path
        d="M78 308 L110 238 L228 214 L292 124 L604 124 L694 214 L806 244 L830 308"
        fill="rgba(56,199,193,0.06)"
        stroke={COLORS.text}
        strokeLinejoin="round"
        strokeWidth="8"
      />
      <path d="M292 124 L262 214 L684 214 L604 124 Z" fill="rgba(56,199,193,0.13)" stroke={COLORS.data} strokeWidth="5" />
      <path d="M78 308 H830" stroke={COLORS.sand} strokeWidth="5" />
      <circle cx="242" cy="308" r="62" fill={COLORS.background} stroke={COLORS.text} strokeWidth="9" />
      <circle cx="674" cy="308" r="62" fill={COLORS.background} stroke={COLORS.text} strokeWidth="9" />
      <path d="M242 378 H674" stroke={COLORS.accent} strokeDasharray="16 12" strokeWidth="5" />
      <path d="M242 358 V398 M674 358 V398" stroke={COLORS.accent} strokeWidth="5" />
    </svg>
  );
};

const LadderFrameDiagram = () => {
  return (
    <svg
      aria-label="项目自有梯形车架结构示意"
      viewBox="0 0 900 430"
      style={{display: "block", overflow: "visible", width: "100%"}}
    >
      <g fill="none" stroke={COLORS.text} strokeLinecap="round" strokeLinejoin="round">
        <path d="M124 108 L776 108 L700 328 L200 328 Z" strokeWidth="18" />
        <path d="M194 160 H748 M178 216 H730 M164 272 H716" stroke={COLORS.data} strokeWidth="13" />
        <path d="M266 108 L314 328 M634 108 L586 328" stroke="rgba(244,241,234,0.42)" strokeWidth="8" />
      </g>
      <circle cx="210" cy="328" r="56" fill={COLORS.background} stroke={COLORS.sand} strokeWidth="10" />
      <circle cx="690" cy="328" r="56" fill={COLORS.background} stroke={COLORS.sand} strokeWidth="10" />
      <circle cx="210" cy="328" r="17" fill={COLORS.accent} />
      <circle cx="690" cy="328" r="17" fill={COLORS.accent} />
    </svg>
  );
};

const HeroScene = () => {
  const frame = useCurrentFrame();
  const questionReveal = interpolate(frame, [8, 28], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <CinematicCamera durationInFrames={120} intensity={0.65} motion="push_in">
      <SafeFrame>
        <EditorialHeader section="TOYOTA LAND CRUISER FJ" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              color: COLORS.text,
              fontFamily: FONT_FAMILY,
              fontSize: 112,
              fontWeight: 900,
              letterSpacing: -5,
              lineHeight: 1.06,
              maxWidth: 800,
            }}
          >
            兰德酷路泽
            <br />
            <span style={{color: COLORS.accent}}>变小了？</span>
          </div>
          <div
            style={{
              marginTop: 58,
              opacity: questionReveal,
              translate: `${-34 * (1 - questionReveal)}px 0px`,
              width: "96%",
            }}
          >
            <GenericSuv />
          </div>
          <SourceNote>原创程序化示意 · 非实车照片</SourceNote>
        </div>
      </SafeFrame>
    </CinematicCamera>
  );
};

const PriceScene = () => {
  return (
    <CinematicCamera durationInFrames={180} intensity={0.55} motion="tracking">
      <SafeFrame>
        <EditorialHeader section="LAUNCH / PRICE" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              color: COLORS.text,
              fontFamily: FONT_FAMILY,
              fontSize: 72,
              fontWeight: 850,
              letterSpacing: -2,
              lineHeight: 1.12,
            }}
          >
            2026.05.14
            <span style={{color: COLORS.muted, fontSize: 46, marginLeft: 24}}>日本上市</span>
          </div>
          <div style={{marginTop: 72, width: "100%"}}>
            <NumberCounter
              accentColor={COLORS.accent}
              durationInFrames={150}
              end={4500100}
              label="VX · 含税厂家建议零售价"
              unit="日元"
            />
          </div>
          <SourceNote>价格不含回收费用 · 冲绳地区另有定价</SourceNote>
        </div>
      </SafeFrame>
    </CinematicCamera>
  );
};

const DimensionScene = () => {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [16, 88], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const delta = interpolate(frame, [72, 118], [0, 1], clamp);

  return (
    <CinematicCamera durationInFrames={210} intensity={0.45} motion="pull_out">
      <SafeFrame>
        <EditorialHeader section="PACKAGE" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "center",
          }}
        >
          <div style={{width: "96%"}}>
            <DimensionProfileDiagram />
          </div>
          <div style={{marginTop: 30, position: "relative", width: "96%"}}>
            <div
              style={{
                backgroundColor: COLORS.data,
                height: 6,
                scale: `${line} 1`,
                transformOrigin: "0% 50%",
                width: "100%",
              }}
            />
            <div
              style={{
                alignItems: "baseline",
                display: "flex",
                justifyContent: "space-between",
                marginTop: 22,
                opacity: line,
              }}
            >
              <span style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 92, fontWeight: 900}}>4575</span>
              <span style={{color: COLORS.data, fontFamily: FONT_FAMILY, fontSize: 42, fontWeight: 750}}>mm 车长</span>
            </div>
          </div>
          <div
            style={{
              color: COLORS.sand,
              fontFamily: FONT_FAMILY,
              fontSize: 54,
              fontWeight: 780,
              marginTop: 36,
              opacity: delta,
              translate: `${32 * (1 - delta)}px 0px`,
            }}
          >
            比 250 系列短 350 mm
          </div>
          <SourceNote>轴距 2580 mm · 比 250 系列短 270 mm</SourceNote>
        </div>
      </SafeFrame>
    </CinematicCamera>
  );
};

const TurningScene = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [12, 154], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.33, 0, 0.2, 1),
  });
  const angle = -38 + progress * 62;

  return (
    <SafeFrame>
      <EditorialHeader section="MANEUVERABILITY" />
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: COLORS.text,
            fontFamily: FONT_FAMILY,
            fontSize: 66,
            fontWeight: 800,
            letterSpacing: -1,
            marginBottom: 38,
          }}
        >
          最小转弯半径
        </div>
        <div style={{height: 700, position: "relative", width: 760}}>
          <svg viewBox="0 0 760 700" style={{height: "100%", width: "100%"}}>
            <path
              d="M118 590 A270 270 0 0 1 642 590"
              fill="none"
              stroke="rgba(244,241,234,0.18)"
              strokeDasharray="12 16"
              strokeWidth="5"
            />
            <path
              d="M118 590 A270 270 0 0 1 642 590"
              fill="none"
              pathLength="1"
              stroke={COLORS.data}
              strokeDasharray="1"
              strokeDashoffset={1 - progress}
              strokeLinecap="round"
              strokeWidth="10"
            />
            <circle cx="380" cy="590" fill={COLORS.accent} r="12" />
            <path d="M380 590 L380 318" stroke="rgba(229,72,63,0.55)" strokeWidth="4" />
          </svg>
          <div
            style={{
              backgroundColor: COLORS.sand,
              border: `5px solid ${COLORS.text}`,
              borderRadius: 34,
              height: 190,
              left: 285,
              position: "absolute",
              rotate: `${angle}deg`,
              top: 265 - Math.sin(progress * Math.PI) * 68,
              translate: `${(progress - 0.5) * 430}px ${Math.abs(progress - 0.5) * 210}px`,
              width: 108,
            }}
          >
            <div style={{backgroundColor: COLORS.background, height: 76, margin: "28px 18px", opacity: 0.72}} />
          </div>
        </div>
        <div
          style={{
            color: COLORS.text,
            fontFamily: FONT_FAMILY,
            fontSize: 130,
            fontVariantNumeric: "tabular-nums",
            fontWeight: 900,
            letterSpacing: -6,
            lineHeight: 1,
          }}
        >
          5.5<span style={{color: COLORS.data, fontSize: 48, letterSpacing: 0, marginLeft: 18}}>m</span>
        </div>
        <SourceNote>官方规格 · 不是自动驾驶轨迹模拟</SourceNote>
      </div>
    </SafeFrame>
  );
};

const ChassisScene = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [12, 78], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const specs = [
    {at: 72, text: "2.7 L 自然吸气"},
    {at: 104, text: "163 PS"},
    {at: 136, text: "6AT"},
    {at: 168, text: "分时四驱"},
  ];

  return (
    <CinematicCamera durationInFrames={240} intensity={0.5} motion="parallax">
      <SafeFrame>
        <EditorialHeader section="HARDWARE" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              color: COLORS.text,
              fontFamily: FONT_FAMILY,
              fontSize: 80,
              fontWeight: 880,
              letterSpacing: -2,
              lineHeight: 1.1,
            }}
          >
            尺寸变小
            <br />
            <span style={{color: COLORS.accent}}>结构没有变软</span>
          </div>
          <div
            style={{
              marginTop: 56,
              opacity: 0.42 + reveal * 0.58,
              translate: `0px ${24 * (1 - reveal)}px`,
              width: "96%",
            }}
          >
            <LadderFrameDiagram />
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              marginTop: 30,
            }}
          >
            {specs.map((spec) => {
              const specReveal = interpolate(frame, [spec.at, spec.at + 20], [0, 1], clamp);
              return (
                <div
                  key={spec.text}
                  style={{
                    borderBottom: `4px solid ${COLORS.data}`,
                    color: COLORS.text,
                    fontFamily: FONT_FAMILY,
                    fontSize: 38,
                    fontWeight: 760,
                    opacity: specReveal,
                    padding: "12px 2px",
                    translate: `${20 * (1 - specReveal)}px 0px`,
                  }}
                >
                  {spec.text}
                </div>
              );
            })}
          </div>
          <SourceNote>梯形车架结构 · 日本规格</SourceNote>
        </div>
      </SafeFrame>
    </CinematicCamera>
  );
};

const FinalScene = () => {
  const frame = useCurrentFrame();
  const question = interpolate(frame, [116, 154], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <CinematicCamera durationInFrames={240} intensity={0.5} motion="pull_out">
      <SafeFrame>
        <EditorialHeader section="THE TRADE-OFF" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              color: COLORS.muted,
              fontFamily: FONT_FAMILY,
              fontSize: 42,
              fontWeight: 650,
              letterSpacing: 4,
            }}
          >
            WLTC 燃油经济性
          </div>
          <div
            style={{
              alignItems: "baseline",
              display: "flex",
              gap: 24,
              marginTop: 18,
            }}
          >
            <div
              style={{
                color: COLORS.text,
                fontFamily: FONT_FAMILY,
                fontSize: 222,
                fontVariantNumeric: "tabular-nums",
                fontWeight: 930,
                letterSpacing: -12,
                lineHeight: 1,
              }}
            >
              8.7
            </div>
            <div style={{color: COLORS.data, fontFamily: FONT_FAMILY, fontSize: 48, fontWeight: 760}}>km/L</div>
          </div>
          <div
            style={{
              backgroundColor: COLORS.accent,
              height: 7,
              marginTop: 46,
              scale: `${interpolate(frame, [28, 88], [0, 1], clamp)} 1`,
              transformOrigin: "0% 50%",
              width: "100%",
            }}
          />
          <div
            style={{
              color: COLORS.sand,
              fontFamily: FONT_FAMILY,
              fontSize: 68,
              fontWeight: 820,
              lineHeight: 1.16,
              marginTop: 46,
            }}
          >
            更灵活
            <span style={{color: COLORS.muted, margin: "0 24px"}}>但</span>
            并不高效
          </div>
          <div
            style={{
              color: COLORS.text,
              fontFamily: FONT_FAMILY,
              fontSize: 58,
              fontWeight: 780,
              lineHeight: 1.25,
              marginTop: 68,
              opacity: question,
              translate: `0px ${32 * (1 - question)}px`,
            }}
          >
            你更在意灵活尺寸，
            <br />
            还是高效动力？
          </div>
          <SourceNote>数据来源：Toyota 官方公告 / Response.jp · 日本市场</SourceNote>
        </div>
      </SafeFrame>
    </CinematicCamera>
  );
};

const DirectorHeader = ({section, shotId}: {section: string; shotId: string}) => {
  return (
    <div style={{alignItems: "center", display: "flex", justifyContent: "space-between"}}>
      <div style={{alignItems: "center", display: "flex", gap: 16}}>
        <div style={{backgroundColor: COLORS.accent, height: 34, width: 7}} />
        <span style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 27, fontWeight: 820, letterSpacing: 3}}>
          DIRECTOR V2 · {section}
        </span>
      </div>
      <span style={{color: COLORS.muted, fontFamily: FONT_FAMILY, fontSize: 24, fontWeight: 650, letterSpacing: 2}}>
        {shotId.toUpperCase()}
      </span>
    </div>
  );
};

const DirectorShot = ({
  durationInFrames,
  kind,
  motion,
  section,
  shotId,
}: {
  durationInFrames: number;
  kind: (typeof DIRECTOR_V2_SHOTS)[number]["kind"];
  motion: (typeof DIRECTOR_V2_SHOTS)[number]["motion"];
  section: string;
  shotId: string;
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 1], clamp);
  const reveal = interpolate(frame, [0, Math.min(18, durationInFrames - 1)], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const lateReveal = interpolate(frame, [18, Math.min(42, durationInFrames - 1)], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const highlight = interpolate(frame, [Math.max(0, durationInFrames - 24), durationInFrames - 5], [0, 1], clamp);

  let visual: ReactNode;

  if (kind === "hero_impact") {
    visual = (
      <div style={{height: "100%", position: "relative"}}>
        <div style={{color: "rgba(244,241,234,0.05)", fontFamily: FONT_FAMILY, fontSize: 520, fontWeight: 950, left: -38, letterSpacing: -52, lineHeight: 1, position: "absolute", top: 230}}>FJ</div>
        {[0, 1, 2, 3].map((line) => (
          <div
            key={line}
            style={{
              background: line % 2 === 0 ? COLORS.accent : COLORS.data,
              filter: "blur(5px)",
              height: 5 + line * 2,
              left: -320,
              opacity: 0.38 - line * 0.05,
              position: "absolute",
              top: 510 + line * 118,
              transform: `translateX(${progress * 1380 - line * 120}px) skewX(-28deg)`,
              width: 760,
            }}
          />
        ))}
        <div style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 116, fontWeight: 930, left: 0, letterSpacing: -6, lineHeight: 0.98, position: "absolute", top: 285}}>
          LAND CRUISER
          <br />
          <span style={{color: COLORS.accent}}>压缩到新尺度</span>
        </div>
        <div style={{left: -70, opacity: 0.35 + reveal * 0.65, position: "absolute", top: 760, transform: `translateX(${(1 - reveal) * 180}px) rotate(-2deg)`, width: 920}}>
          <FrontSuvDiagram />
        </div>
        <div style={{background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)`, bottom: 370, filter: "blur(12px)", height: 18, left: -120, opacity: 0.8, position: "absolute", transform: `translateX(${progress * 980}px)`, width: 380}} />
      </div>
    );
  } else if (kind === "hero_identity") {
    visual = (
      <div style={{height: "100%", position: "relative"}}>
        <div style={{border: `2px solid ${COLORS.line}`, height: 820, left: 25, position: "absolute", top: 360, transform: `perspective(900px) rotateX(62deg) translateY(${progress * 90}px)`, width: 780}}>
          {Array.from({length: 8}).map((_, index) => <div key={index} style={{borderTop: `2px solid ${COLORS.line}`, position: "absolute", top: index * 110, width: "100%"}} />)}
        </div>
        <div style={{color: COLORS.muted, fontFamily: FONT_FAMILY, fontSize: 34, fontWeight: 700, letterSpacing: 8, position: "absolute", top: 300}}>NOT JUST A CITY SUV</div>
        <div style={{left: -15, opacity: reveal, position: "absolute", top: 610, transform: `translateX(${(1 - reveal) * -130}px)`, width: 890}}><GenericSuv detail /></div>
        <div style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 86, fontWeight: 900, lineHeight: 1.05, position: "absolute", right: 0, textAlign: "right", top: 1010}}>
          小车身
          <br />
          <span style={{color: COLORS.data}}>硬结构</span>
        </div>
      </div>
    );
  } else if (kind === "launch") {
    visual = (
      <div style={{height: "100%", position: "relative"}}>
        <div style={{border: `4px solid ${COLORS.data}`, borderRadius: "50%", height: 570, left: 140, opacity: 0.18 + reveal * 0.62, position: "absolute", top: 390, transform: `rotate(${progress * 24 - 12}deg)`, width: 570}}>
          <div style={{border: `2px dashed ${COLORS.sand}`, borderRadius: "50%", inset: 52, position: "absolute", transform: `rotate(${-progress * 76}deg)`}} />
          <div style={{backgroundColor: COLORS.accent, borderRadius: "50%", height: 20, left: "50%", position: "absolute", top: -10, width: 20}} />
        </div>
        <div style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 58, fontWeight: 760, left: 0, letterSpacing: 5, position: "absolute", top: 485}}>JAPAN LAUNCH</div>
        <div style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 188, fontVariantNumeric: "tabular-nums", fontWeight: 950, left: -6, letterSpacing: -12, lineHeight: 0.95, position: "absolute", top: 590}}>05.14</div>
        <div style={{backgroundColor: COLORS.accent, height: 8, left: 0, position: "absolute", scale: `${reveal} 1`, top: 805, transformOrigin: "0 50%", width: 720}} />
        <div style={{color: COLORS.sand, fontFamily: FONT_FAMILY, fontSize: 44, fontWeight: 700, position: "absolute", right: 0, textAlign: "right", top: 850}}>2026 · 正式上市</div>
      </div>
    );
  } else if (kind === "price") {
    visual = (
      <div style={{display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", position: "relative"}}>
        <div style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 64, fontWeight: 850, letterSpacing: -1, opacity: reveal}}>含税指导价</div>
        <div style={{backgroundColor: COLORS.accent, height: 8, marginTop: 20, scale: `${reveal} 1`, transformOrigin: "0 50%", width: 240}} />
        <Sequence from={14} durationInFrames={70} layout="none">
          <div style={{marginTop: 54}}>
            <NumberCounter accentColor={COLORS.data} durationInFrames={52} end={4500100} label="VX · JAPAN" unit="日元" />
          </div>
        </Sequence>
        <div style={{border: `4px solid ${COLORS.accent}`, inset: "545px -20px auto -20px", opacity: highlight, position: "absolute", boxShadow: `0 0 ${40 * highlight}px rgba(229,72,63,0.55)`, height: 330}} />
        <SourceNote>数字顺序：标题 → 滚动 → 高亮</SourceNote>
      </div>
    );
  } else if (kind === "length") {
    const line = interpolate(frame, [8, 58], [0, 1], clamp);
    visual = (
      <div style={{display: "flex", flexDirection: "column", height: "100%", justifyContent: "center"}}>
        <div style={{opacity: 0.28 + reveal * 0.72, width: "100%"}}><DimensionProfileDiagram /></div>
        <div style={{backgroundColor: COLORS.data, height: 7, marginTop: 28, scale: `${line} 1`, transformOrigin: "0 50%", width: "100%"}} />
        <div style={{alignItems: "baseline", display: "flex", justifyContent: "space-between", marginTop: 18}}>
          <span style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 156, fontWeight: 930, letterSpacing: -8}}>4575</span>
          <span style={{color: COLORS.data, fontFamily: FONT_FAMILY, fontSize: 48, fontWeight: 800}}>mm</span>
        </div>
      </div>
    );
  } else if (kind === "size_comparison") {
    const shortBody = interpolate(frame, [8, 54], [0, 1], clamp);
    const wheelbase = interpolate(frame, [22, 70], [0, 1], clamp);
    visual = (
      <div style={{display: "flex", flexDirection: "column", gap: 72, height: "100%", justifyContent: "center"}}>
        <div style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 56, fontWeight: 850}}>相比 250 系列</div>
        {[
          {label: "车长", progress: shortBody, value: "−350 mm", width: 690},
          {label: "轴距", progress: wheelbase, value: "−270 mm", width: 540},
        ].map((bar) => (
          <div key={bar.label}>
            <div style={{alignItems: "baseline", display: "flex", justifyContent: "space-between"}}>
              <span style={{color: COLORS.muted, fontFamily: FONT_FAMILY, fontSize: 40, fontWeight: 700}}>{bar.label}</span>
              <span style={{color: COLORS.sand, fontFamily: FONT_FAMILY, fontSize: 58, fontWeight: 880}}>{bar.value}</span>
            </div>
            <div style={{backgroundColor: "rgba(244,241,234,0.12)", height: 28, marginTop: 20, overflow: "hidden"}}>
              <div style={{background: `linear-gradient(90deg, ${COLORS.data}, ${COLORS.accent})`, height: "100%", transform: `translateX(${(bar.progress - 1) * bar.width}px)`, width: bar.width}} />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (kind === "turning_radius") {
    const turn = interpolate(frame, [6, 72], [0, 1], {...clamp, easing: Easing.bezier(0.33, 0, 0.2, 1)});
    visual = (
      <div style={{height: "100%", position: "relative"}}>
        <svg viewBox="0 0 840 1000" style={{height: 1000, left: 0, position: "absolute", top: 270, width: 840}}>
          <path d="M90 760 A330 330 0 0 1 750 760" fill="none" pathLength="1" stroke="rgba(244,241,234,0.14)" strokeDasharray="0.02 0.025" strokeWidth="7" />
          <path d="M90 760 A330 330 0 0 1 750 760" fill="none" pathLength="1" stroke={COLORS.data} strokeDasharray="1" strokeDashoffset={1 - turn} strokeLinecap="round" strokeWidth="13" />
          <line x1="420" y1="760" x2="420" y2="430" stroke={COLORS.accent} strokeDasharray="14 12" strokeWidth="5" />
          <circle cx="420" cy="760" fill={COLORS.accent} r="12" />
        </svg>
        <div style={{backgroundColor: COLORS.sand, border: `5px solid ${COLORS.text}`, borderRadius: 30, height: 168, left: 365, position: "absolute", top: 592 - Math.sin(turn * Math.PI) * 178, transform: `translateX(${(turn - 0.5) * 570}px) rotate(${turn * 66 - 33}deg)`, width: 96}} />
        <div style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 164, fontWeight: 940, left: 0, letterSpacing: -8, position: "absolute", top: 930}}>5.5 <span style={{color: COLORS.data, fontSize: 54}}>m</span></div>
      </div>
    );
  } else if (kind === "agility") {
    const lateral = Math.sin(progress * Math.PI * 1.2) * 170;
    visual = (
      <div style={{height: "100%", position: "relative"}}>
        <div style={{borderLeft: `10px solid ${COLORS.line}`, borderRight: `10px solid ${COLORS.line}`, bottom: 160, height: 1080, left: 160, position: "absolute", transform: "perspective(700px) rotateX(58deg)", width: 520}}>
          <div style={{borderLeft: `5px dashed ${COLORS.data}`, height: "100%", left: "50%", position: "absolute"}} />
        </div>
        <div style={{left: 255 + lateral, position: "absolute", top: 560 + progress * 90, transform: "rotate(-3deg)", width: 320}}><TopDownSuvDiagram /></div>
        <div style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 86, fontWeight: 900, lineHeight: 1.05, position: "absolute", right: 0, textAlign: "right", top: 320}}>更短<br /><span style={{color: COLORS.accent}}>更灵活</span></div>
      </div>
    );
  } else if (kind === "chassis") {
    visual = (
      <div style={{display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", position: "relative"}}>
        <div style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 72, fontWeight: 900}}>梯形车架没有消失</div>
        <div style={{marginTop: 70, opacity: 0.32 + reveal * 0.68}}><LadderFrameDiagram /></div>
        <div style={{background: `linear-gradient(90deg, transparent, ${COLORS.data}, transparent)`, filter: "blur(4px)", height: 12, left: -120, position: "absolute", top: 850, transform: `translateX(${progress * 1120}px)`, width: 360}} />
      </div>
    );
  } else if (kind === "engine") {
    const pulse = 0.92 + Math.sin(frame * 0.32) * 0.08;
    visual = (
      <div style={{height: "100%", position: "relative"}}>
        <div style={{border: `12px solid ${COLORS.text}`, borderRadius: 70, height: 580, left: 105, position: "absolute", top: 470, transform: `scale(${0.82 + reveal * 0.18})`, width: 620}}>
          {[0, 1, 2, 3].map((cylinder) => (
            <div key={cylinder} style={{backgroundColor: cylinder % 2 === 0 ? COLORS.accent : COLORS.data, borderRadius: 16, bottom: 100 + (cylinder % 2) * 60, height: 220, left: 48 + cylinder * 142, opacity: 0.75, position: "absolute", transform: `scaleY(${pulse})`, transformOrigin: "50% 100%", width: 88}} />
          ))}
          <div style={{border: `8px solid ${COLORS.sand}`, borderRadius: "50%", bottom: 38, height: 140, left: 240, position: "absolute", transform: `rotate(${frame * 7}deg)`, width: 140}} />
        </div>
        <div style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 136, fontWeight: 940, left: 0, letterSpacing: -7, position: "absolute", top: 1080}}>2.7 L</div>
        <div style={{color: COLORS.muted, fontFamily: FONT_FAMILY, fontSize: 43, fontWeight: 700, position: "absolute", right: 0, textAlign: "right", top: 1115}}>自然吸气<br />汽油机</div>
      </div>
    );
  } else if (kind === "powertrain") {
    visual = (
      <div style={{height: "100%", position: "relative"}}>
        <div style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 204, fontWeight: 950, left: 0, letterSpacing: -12, opacity: reveal, position: "absolute", top: 430, transform: `translateX(${(1 - reveal) * -90}px)`}}>163</div>
        <div style={{color: COLORS.accent, fontFamily: FONT_FAMILY, fontSize: 50, fontWeight: 850, left: 480, position: "absolute", top: 565}}>PS</div>
        <div style={{backgroundColor: COLORS.line, height: 6, left: 0, position: "absolute", top: 760, width: "100%"}} />
        <div style={{color: COLORS.data, fontFamily: FONT_FAMILY, fontSize: 190, fontWeight: 950, opacity: lateReveal, position: "absolute", right: 0, top: 790, transform: `translateX(${(1 - lateReveal) * 90}px)`}}>6AT</div>
        <div style={{color: COLORS.muted, fontFamily: FONT_FAMILY, fontSize: 36, fontWeight: 700, letterSpacing: 5, position: "absolute", right: 0, top: 1010}}>AUTOMATIC</div>
      </div>
    );
  } else if (kind === "four_wheel_drive") {
    const torque = (frame % 24) / 24;
    visual = (
      <div style={{height: "100%", position: "relative"}}>
        <svg viewBox="0 0 840 960" style={{height: 960, left: 0, position: "absolute", top: 310, width: 840}}>
          <g fill="none" stroke={COLORS.text} strokeWidth="12">
            <rect x="150" y="110" width="540" height="700" rx="70" />
            <line x1="270" y1="220" x2="570" y2="220" />
            <line x1="270" y1="700" x2="570" y2="700" />
            <line x1="420" y1="220" x2="420" y2="700" stroke={COLORS.data} />
            <circle cx="420" cy="460" r="76" stroke={COLORS.accent} />
          </g>
          {[220, 700].flatMap((y) => [270, 570].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} fill="none" r={34 + torque * 22} stroke={COLORS.accent} strokeWidth="6" opacity={1 - torque} />))}
        </svg>
        <div style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 76, fontWeight: 900, position: "absolute", right: 0, textAlign: "right", top: 1050}}>PART-TIME<br /><span style={{color: COLORS.data}}>4WD</span></div>
      </div>
    );
  } else if (kind === "efficiency") {
    const numberProgress = interpolate(frame, [16, 63], [0, 1], {...clamp, easing: Easing.bezier(0.22, 1, 0.36, 1)});
    const value = (8.7 * numberProgress).toFixed(1);
    const dataHighlight = interpolate(frame, [64, 82], [0, 1], clamp);
    visual = (
      <div style={{display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", position: "relative"}}>
        <div style={{color: COLORS.muted, fontFamily: FONT_FAMILY, fontSize: 42, fontWeight: 720, letterSpacing: 6, opacity: reveal}}>WLTC 燃油经济性</div>
        <div style={{alignItems: "baseline", display: "flex", gap: 22, marginTop: 34}}>
          <span style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 244, fontVariantNumeric: "tabular-nums", fontWeight: 950, letterSpacing: -14}}>{value}</span>
          <span style={{color: COLORS.data, fontFamily: FONT_FAMILY, fontSize: 52, fontWeight: 850}}>km/L</span>
        </div>
        <div style={{backgroundColor: dataHighlight > 0.5 ? COLORS.accent : COLORS.data, boxShadow: `0 0 ${dataHighlight * 50}px rgba(229,72,63,0.7)`, height: 12, marginTop: 34, scale: `${numberProgress} 1`, transformOrigin: "0 50%", width: "100%"}} />
        <div style={{color: COLORS.sand, fontFamily: FONT_FAMILY, fontSize: 56, fontWeight: 830, marginTop: 56, opacity: dataHighlight}}>灵活，不等于高效</div>
      </div>
    );
  } else {
    const outro = interpolate(frame, [durationInFrames - 22, durationInFrames - 1], [1, 0], clamp);
    visual = (
      <div style={{height: "100%", opacity: outro, position: "relative"}}>
        <div style={{color: COLORS.text, fontFamily: FONT_FAMILY, fontSize: 82, fontWeight: 920, left: 0, lineHeight: 1.04, position: "absolute", top: 360}}>
          灵活尺寸
          <span style={{color: COLORS.muted, fontSize: 44, margin: "0 22px"}}>VS</span>
          <br />
          <span style={{color: COLORS.data}}>高效动力</span>
        </div>
        <div style={{left: 70, opacity: 0.95, position: "absolute", top: 700, transform: `translateY(${progress * -28}px) scale(${1 - progress * 0.08})`, width: 760}}><RearSuvDiagram /></div>
        <div style={{backgroundColor: COLORS.accent, bottom: 350, height: 8, left: 0, position: "absolute", scale: `${lateReveal} 1`, transformOrigin: "0 50%", width: 300}} />
        <div style={{bottom: 285, color: COLORS.muted, fontFamily: FONT_FAMILY, fontSize: 30, fontWeight: 700, letterSpacing: 4, position: "absolute"}}>SILENT HUMAN REVIEW · NOT FOR PUBLISHING</div>
      </div>
    );
  }

  return (
    <AbsoluteFill>
      <ApprovedToyotaAssetLayer durationInFrames={durationInFrames} shotId={shotId} />
      <CinematicCamera durationInFrames={durationInFrames} intensity={0.78} motion={motion}>
        <SafeFrame>
          <DirectorHeader section={section} shotId={shotId} />
          {visual}
        </SafeFrame>
      </CinematicCamera>
    </AbsoluteFill>
  );
};

export const DirectorV2Project = () => {
  return (
    <AbsoluteFill style={{backgroundColor: COLORS.background, overflow: "hidden"}}>
      <GlobalBackground />
      {DIRECTOR_V2_SHOTS.map((shot, index) => {
        const caption = DIRECTOR_V2_CAPTIONS[index];
        return (
          <Sequence key={shot.id} durationInFrames={shot.durationInFrames} from={shot.from} name={`${shot.id}-${shot.role}`} premountFor={20}>
            <DirectorShot durationInFrames={shot.durationInFrames} kind={shot.kind} motion={shot.motion} section={shot.section} shotId={shot.id} />
            <Sequence durationInFrames={caption.durationInFrames} from={caption.from} layout="none">
              <KeywordCaption
                accentColor={index === 12 || index === 13 ? COLORS.accent : COLORS.data}
                durationInFrames={Math.min(16, caption.durationInFrames)}
                keyword={caption.keyword}
                position={shot.captionPosition}
                text={caption.text}
              />
            </Sequence>
          </Sequence>
        );
      })}
      {DIRECTOR_V2_TRANSITIONS.map((transition) => (
        <Sequence key={`${transition.type}-${transition.from}`} durationInFrames={transition.durationInFrames} from={transition.from} name={`dv2-transition-${transition.type}`}>
          <Transition durationInFrames={transition.durationInFrames} type={transition.type} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const SCENES = [HeroScene, PriceScene, DimensionScene, TurningScene, ChassisScene, FinalScene] as const;
const TRANSITIONS = [
  {durationInFrames: 12, from: 108, type: "light_wipe" as const},
  {durationInFrames: 14, from: 286, type: "cinematic_blur" as const},
  {durationInFrames: 12, from: 498, type: "light_wipe" as const},
  {durationInFrames: 12, from: 708, type: "zoom_transition" as const},
  {durationInFrames: 14, from: 946, type: "cinematic_blur" as const},
] as const;

export type Milestone1ProjectProps = {
  voiceSrc?: string;
};

export const Milestone1Project = ({voiceSrc}: Milestone1ProjectProps) => {
  const voiceFile = voiceSrc ? staticFile(voiceSrc) : undefined;

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.background, overflow: "hidden"}}>
      <GlobalBackground />
      {MILESTONE1_SHOTS.map((shot, index) => {
        const SceneComponent = SCENES[index];
        const captions = MILESTONE1_CAPTIONS[index];

        return (
          <Sequence
            key={shot.id}
            durationInFrames={shot.durationInFrames}
            from={shot.from}
            name={shot.id}
            premountFor={30}
          >
            <SceneComponent />
            {captions.map((caption) => (
              <Sequence
                key={`${shot.id}-${caption.from}`}
                durationInFrames={caption.durationInFrames}
                from={caption.from}
                layout="none"
              >
                <KeywordCaption
                  accentColor={index === 5 ? COLORS.accent : COLORS.data}
                  durationInFrames={Math.min(18, caption.durationInFrames)}
                  keyword={caption.keyword}
                  text={caption.text}
                />
              </Sequence>
            ))}
          </Sequence>
        );
      })}
      {TRANSITIONS.map((transition) => (
        <Sequence
          key={`${transition.type}-${transition.from}`}
          durationInFrames={transition.durationInFrames}
          from={transition.from}
          name={`transition-${transition.type}`}
        >
          <Transition durationInFrames={transition.durationInFrames} type={transition.type} />
        </Sequence>
      ))}
      <AudioTrack
        durationInFrames={1200}
        name="MiniMax 沉曜男声"
        src={voiceFile}
        track="voice"
        volume={1}
      />
    </AbsoluteFill>
  );
};
