import {createContext, useContext, type CSSProperties, type ReactNode} from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {XIAOMI_ORIGINAL_EDITORIAL_SHOTS} from "./xiaomiOriginalEditorialData";
import {XIAOMI_ORIGINAL_EDITORIAL_AUDIO_TIMING_SHOTS} from "./xiaomiOriginalEditorialAudioTimingData";

const COLORS = {
  background: "#090D12",
  background2: "#101722",
  orange: "#FF6A1A",
  orangeSoft: "#FF9A5A",
  blue: "#35A7FF",
  cyan: "#54E1D0",
  text: "#F4F7FA",
  muted: "#A9B5C3",
  line: "rgba(244,247,250,0.16)",
};

const FONT =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
const clamp = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};

const progress = (frame: number, durationInFrames: number) =>
  interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

const enter = (frame: number, delay = 0, length = 14) =>
  interpolate(frame, [delay, delay + length], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

const Backdrop = ({accent, angle = 135}: {accent: string; angle?: number}) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 90], [-35, 35], clamp);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, ${COLORS.background} 0%, ${COLORS.background2} 62%, #07101A 100%)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: `radial-gradient(circle, ${accent}40 0%, ${accent}00 70%)`,
          borderRadius: "50%",
          filter: "blur(36px)",
          height: 760,
          left: -360 + drift,
          position: "absolute",
          top: 80,
          width: 760,
        }}
      />
      <div
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          inset: 0,
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.8), transparent 86%)",
          opacity: 0.55,
          position: "absolute",
          transform: `translateY(${drift * 0.35}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

const Disclosure = ({children, strong = false}: {children: ReactNode; strong?: boolean}) => (
  <div
    data-disclosure="persistent"
    style={{
      alignItems: "center",
      background: strong ? "rgba(255,106,26,0.14)" : "rgba(9,13,18,0.68)",
      border: `1px solid ${strong ? "rgba(255,154,90,0.72)" : "rgba(244,247,250,0.25)"}`,
      borderRadius: 999,
      color: strong ? "#FFD2B7" : COLORS.muted,
      display: "flex",
      fontFamily: FONT,
      fontSize: strong ? 30 : 28,
      fontWeight: 650,
      left: 90,
      letterSpacing: 1,
      maxWidth: 840,
      minHeight: 52,
      padding: "0 22px",
      position: "absolute",
      top: 150,
      whiteSpace: "nowrap",
      zIndex: 20,
    }}
  >
    {children}
  </div>
);

const ShotId = ({children}: {children: ReactNode}) => (
  <div
    style={{
      color: "rgba(244,247,250,0.46)",
      fontFamily: FONT,
      fontSize: 24,
      fontWeight: 700,
      letterSpacing: 3,
      position: "absolute",
      right: 150,
      top: 166,
      zIndex: 20,
    }}
  >
    {children}
  </div>
);

type CaptionTimingOverride = {
  endFrameExclusive: number;
  text: string;
};

const CaptionTimingContext = createContext<CaptionTimingOverride | null>(null);

const Subtitle = ({children, accent = COLORS.orange}: {children: ReactNode; accent?: string}) => {
  const frame = useCurrentFrame();
  const timingOverride = useContext(CaptionTimingContext);
  const alpha = timingOverride ? enter(frame, 0, 2) : enter(frame, 5, 10);
  if (timingOverride && frame >= timingOverride.endFrameExclusive) return null;
  return (
    <div
      data-caption-safe-area="top150-right150-bottom260-left90"
      style={{
        alignItems: "flex-start",
        bottom: 270,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        left: 90,
        opacity: alpha,
        position: "absolute",
        right: 150,
        transform: `translateY(${(1 - alpha) * 18}px)`,
        zIndex: 30,
      }}
    >
      <div style={{background: accent, height: 4, width: 88}} />
      <div
        style={{
          color: COLORS.text,
          filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.72))",
          fontFamily: FONT,
          fontSize: 46,
          fontWeight: 720,
          letterSpacing: -0.6,
          lineHeight: 1.34,
          maxWidth: 840,
        }}
      >
        {timingOverride?.text ?? children}
      </div>
    </div>
  );
};

const Frame = ({
  accent,
  angle,
  children,
  disclosure,
  shotId,
  strongDisclosure = false,
}: {
  accent: string;
  angle?: number;
  children: ReactNode;
  disclosure: string;
  shotId: string;
  strongDisclosure?: boolean;
}) => (
  <AbsoluteFill data-shot-id={shotId} style={{backgroundColor: COLORS.background, overflow: "hidden"}}>
    <Backdrop accent={accent} angle={angle} />
    {children}
    <Disclosure strong={strongDisclosure}>{disclosure}</Disclosure>
    <ShotId>{shotId.toUpperCase()}</ShotId>
  </AbsoluteFill>
);

const Label = ({children, style}: {children: ReactNode; style?: CSSProperties}) => (
  <div
    style={{
      color: COLORS.muted,
      fontFamily: FONT,
      fontSize: 28,
      fontWeight: 680,
      letterSpacing: 2,
      ...style,
    }}
  >
    {children}
  </div>
);

const Headline = ({children, style}: {children: ReactNode; style?: CSSProperties}) => (
  <div
    style={{
      color: COLORS.text,
      fontFamily: FONT,
      fontSize: 90,
      fontWeight: 820,
      letterSpacing: -3,
      lineHeight: 1.08,
      ...style,
    }}
  >
    {children}
  </div>
);

const Shot01 = () => {
  const frame = useCurrentFrame();
  const p = progress(frame, 90);
  return (
    <Frame accent={COLORS.orange} angle={145} disclosure="原创示意｜非实拍" shotId="shot_01">
      <div style={{left: 90, position: "absolute", top: 280, zIndex: 4}}>
        <Label style={{color: COLORS.orangeSoft, fontSize: 36}}>XIAOMI AUTO / ORIGINAL EDITORIAL</Label>
        <Headline style={{fontSize: 124, marginTop: 18}}>小米汽车</Headline>
        <div
          style={{
            color: COLORS.text,
            fontFamily: FONT,
            fontSize: 62,
            fontWeight: 760,
            lineHeight: 1.18,
            marginTop: 24,
            maxWidth: 770,
          }}
        >
          第二条产品线
          <br />
          <span style={{color: COLORS.orange}}>先讲空间</span>
        </div>
      </div>
      <svg
        aria-label="原创抽象 SUV 轮廓"
        height="700"
        style={{
          bottom: 420,
          left: -20,
          position: "absolute",
          transform: `translate(${p * 64}px, ${-p * 22}px) scale(${1 + p * 0.06})`,
        }}
        viewBox="0 0 1120 700"
        width="1120"
      >
        <path
          d="M118 442 L188 350 L342 308 L492 214 L738 212 L884 294 L990 338 L1020 442"
          fill="none"
          stroke={COLORS.orange}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="12"
        />
        <path d="M178 442 H956" fill="none" stroke="rgba(244,247,250,0.62)" strokeWidth="5" />
        <circle cx="328" cy="445" fill={COLORS.background} r="66" stroke={COLORS.blue} strokeWidth="9" />
        <circle cx="824" cy="445" fill={COLORS.background} r="66" stroke={COLORS.blue} strokeWidth="9" />
        <path d="M346 306 L510 250 H706 L806 304" fill="none" stroke="rgba(84,225,208,0.75)" strokeWidth="6" />
        {[0, 1, 2, 3, 4].map((n) => (
          <path
            d={`M${200 + n * 170} 540 L${420 + n * 95} 650`}
            fill="none"
            key={n}
            opacity={0.14 + n * 0.06}
            stroke={COLORS.blue}
            strokeWidth="3"
          />
        ))}
      </svg>
      <Subtitle>小米第二条汽车产品线，先讲的不是加速，而是空间。</Subtitle>
    </Frame>
  );
};

const Shot02 = () => {
  const frame = useCurrentFrame();
  const x = interpolate(enter(frame, 0, 18), [0, 1], [-120, 0]);
  const y = interpolate(enter(frame, 10, 18), [0, 1], [120, 0]);
  return (
    <Frame accent={COLORS.blue} angle={20} disclosure="信息图｜非实拍" shotId="shot_02">
      <div style={{left: 90, position: "absolute", right: 150, top: 405}}>
        <div
          style={{
            color: COLORS.blue,
            fontFamily: FONT,
            fontSize: 114,
            fontWeight: 340,
            letterSpacing: -4,
            transform: `translateX(${x}px)`,
          }}
        >
          SkyNomad
        </div>
        <div style={{background: COLORS.orange, height: 8, margin: "54px 0", width: 560}} />
        <Headline style={{fontSize: 142, transform: `translateY(${y}px)`}}>小米澎程</Headline>
        <Label style={{marginTop: 46}}>SECOND AUTOMOTIVE PRODUCT SERIES</Label>
      </div>
      <div
        style={{
          borderLeft: `2px solid ${COLORS.line}`,
          bottom: 580,
          position: "absolute",
          right: 230,
          top: 300,
        }}
      />
      <Subtitle accent={COLORS.blue}>它叫 SkyNomad，小米澎程。</Subtitle>
    </Frame>
  );
};

const Shot03 = () => {
  const frame = useCurrentFrame();
  const p = enter(frame, 0, 22);
  const nodeY = interpolate(p, [0, 1], [330, 670]);
  return (
    <Frame accent={COLORS.blue} angle={180} disclosure="原创时间线｜数据已核验" shotId="shot_03">
      <div style={{left: 150, position: "absolute", top: 310}}>
        <Label style={{color: COLORS.cyan}}>VERIFIED ANNOUNCEMENT DATE</Label>
        <Headline style={{fontSize: 112, marginTop: 26}}>2026.07.09</Headline>
      </div>
      <div
        style={{
          background: COLORS.line,
          height: 670,
          left: 270,
          position: "absolute",
          top: 640,
          width: 4,
        }}
      />
      <div
        style={{
          background: COLORS.blue,
          border: `12px solid ${COLORS.background2}`,
          borderRadius: "50%",
          boxShadow: `0 0 0 3px ${COLORS.blue}, 0 0 60px ${COLORS.blue}80`,
          height: 46,
          left: 249,
          position: "absolute",
          top: nodeY,
          width: 46,
        }}
      />
      <div
        style={{
          color: COLORS.text,
          fontFamily: FONT,
          fontSize: 58,
          fontWeight: 780,
          left: 350,
          lineHeight: 1.2,
          opacity: p,
          position: "absolute",
          top: nodeY - 18,
        }}
      >
        正式公布
        <div style={{color: COLORS.muted, fontSize: 30, fontWeight: 560, marginTop: 16}}>SkyNomad 小米澎程</div>
      </div>
      <Subtitle accent={COLORS.blue}>7月9日，官方正式公布这个新系列。</Subtitle>
    </Frame>
  );
};

const Shot04 = () => {
  const frame = useCurrentFrame();
  const p = progress(frame, 60);
  const scale = 1 + p * 0.16;
  return (
    <Frame accent={COLORS.cyan} angle={230} disclosure="座舱空间示意｜非实车结构" shotId="shot_04">
      <div style={{left: 90, position: "absolute", top: 300}}>
        <Label style={{color: COLORS.cyan}}>OFFICIAL POSITIONING / DIAGRAM</Label>
        <Headline style={{fontSize: 92, marginTop: 24}}>智能｜可变｜大空间</Headline>
      </div>
      <svg
        height="880"
        style={{bottom: 360, position: "absolute", transform: `scale(${scale})`, transformOrigin: "50% 55%"}}
        viewBox="0 0 1080 880"
        width="1080"
      >
        {[0, 1, 2, 3].map((n) => {
          const inset = 100 + n * 82;
          return (
            <rect
              fill="none"
              height={500 - n * 96}
              key={n}
              opacity={0.85 - n * 0.16}
              stroke={n % 2 === 0 ? COLORS.cyan : COLORS.blue}
              strokeWidth="5"
              width={880 - n * 164}
              x={inset}
              y={190 + n * 55}
            />
          );
        })}
        <path d="M100 690 L540 435 L980 690" fill="none" stroke={COLORS.orange} strokeWidth="7" />
        <path d="M100 190 L540 435 L980 190" fill="none" stroke="rgba(244,247,250,0.2)" strokeWidth="3" />
        <circle cx="540" cy="435" fill={COLORS.orange} r="12" />
      </svg>
      <Subtitle accent={COLORS.cyan}>定位：智能可变大空间SUV。</Subtitle>
    </Frame>
  );
};

const Shot05 = () => {
  const frame = useCurrentFrame();
  const spread = interpolate(enter(frame, 2, 20), [0, 1], [0, 250]);
  const focus = frame < 45 ? COLORS.blue : COLORS.orange;
  return (
    <Frame accent={COLORS.orange} angle={90} disclosure="产品关系示意｜非车型外观对比" shotId="shot_05">
      <div style={{left: 90, position: "absolute", right: 150, textAlign: "center", top: 280}}>
        <Label>小米汽车产品关系</Label>
        <div
          style={{
            border: `3px solid ${COLORS.line}`,
            borderRadius: "50%",
            color: COLORS.text,
            fontFamily: FONT,
            fontSize: 42,
            fontWeight: 760,
            height: 190,
            lineHeight: "190px",
            margin: "70px auto 0",
            width: 190,
          }}
        >
          小米汽车
        </div>
      </div>
      <div style={{left: 540, position: "absolute", top: 625}}>
        <div style={{background: COLORS.line, height: 300, left: -2, position: "absolute", top: 0, width: 4}} />
        <div style={{background: COLORS.line, height: 4, left: -spread, position: "absolute", top: 298, width: spread * 2}} />
        {[{x: -spread, color: COLORS.blue, title: "SU7 / YU7", sub: "驾驶者"}, {x: spread, color: COLORS.orange, title: "澎程", sub: "乘员与空间"}].map((item) => (
          <div
            key={item.title}
            style={{
              border: `4px solid ${item.color}`,
              borderRadius: 30,
              boxShadow: item.color === focus ? `0 0 70px ${item.color}55` : "none",
              color: COLORS.text,
              fontFamily: FONT,
              height: 230,
              left: item.x - 175,
              paddingTop: 44,
              position: "absolute",
              textAlign: "center",
              top: 300,
              width: 350,
            }}
          >
            <div style={{fontSize: 50, fontWeight: 820}}>{item.title}</div>
            <div style={{color: item.color, fontSize: 30, fontWeight: 680, marginTop: 20}}>{item.sub}</div>
          </div>
        ))}
      </div>
      <Subtitle>SU7、YU7面向驾驶者；澎程更重视乘员。</Subtitle>
    </Frame>
  );
};

const Shot06 = () => {
  const frame = useCurrentFrame();
  const theta = progress(frame, 90) * Math.PI * 1.1;
  const orbitItem = (radius: number, phase: number, label: string, color: string) => {
    const x = 540 + Math.cos(theta + phase) * radius;
    const y = 820 + Math.sin(theta + phase) * radius * 0.68;
    return (
      <div
        key={label}
        style={{
          alignItems: "center",
          background: COLORS.background2,
          border: `3px solid ${color}`,
          borderRadius: "50%",
          color: COLORS.text,
          display: "flex",
          fontFamily: FONT,
          fontSize: 31,
          fontWeight: 720,
          height: 142,
          justifyContent: "center",
          left: x - 71,
          position: "absolute",
          textAlign: "center",
          top: y - 71,
          width: 142,
        }}
      >
        {label}
      </div>
    );
  };
  return (
    <Frame accent={COLORS.blue} angle={310} disclosure="定位归纳｜非市场份额数据" shotId="shot_06">
      <Headline style={{fontSize: 76, left: 90, position: "absolute", top: 290}}>两条产品线</Headline>
      <Label style={{left: 96, position: "absolute", top: 400}}>对应两种用车需求</Label>
      {[310, 215].map((r, index) => (
        <div
          key={r}
          style={{
            border: `2px solid ${index === 0 ? "rgba(53,167,255,0.36)" : "rgba(255,106,26,0.42)"}`,
            borderRadius: "50%",
            height: r * 1.36,
            left: 540 - r,
            position: "absolute",
            top: 820 - r * 0.68,
            width: r * 2,
          }}
        />
      ))}
      <div
        style={{
          alignItems: "center",
          background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.blue})`,
          borderRadius: "50%",
          color: COLORS.text,
          display: "flex",
          fontFamily: FONT,
          fontSize: 32,
          fontWeight: 820,
          height: 180,
          justifyContent: "center",
          left: 450,
          position: "absolute",
          textAlign: "center",
          top: 730,
          width: 180,
        }}
      >
        小米汽车
      </div>
      {orbitItem(310, 0, "驾驶", COLORS.blue)}
      {orbitItem(310, Math.PI, "乘员", COLORS.orange)}
      {orbitItem(215, Math.PI / 2, "空间", COLORS.cyan)}
      <Subtitle accent={COLORS.blue}>两条产品线，对应两种用车需求。</Subtitle>
    </Frame>
  );
};

const Shot07 = () => {
  const frame = useCurrentFrame();
  const p = enter(frame, 0, 24);
  return (
    <Frame
      accent={COLORS.orange}
      angle={35}
      disclosure="原创示意｜非官方结构图｜非实拍"
      shotId="shot_07"
      strongDisclosure
    >
      <div style={{left: 90, position: "absolute", top: 280}}>
        <Label style={{color: COLORS.orangeSoft}}>VERIFIED START DATE</Label>
        <Headline style={{fontSize: 78, marginTop: 22}}>小米昆仑架构</Headline>
        <div style={{color: COLORS.orange, fontFamily: FONT, fontSize: 110, fontWeight: 860, marginTop: 12}}>2023年初</div>
      </div>
      <div style={{left: 140, position: "absolute", top: 770, width: 800}}>
        {[0, 1, 2].map((n) => {
          const offset = interpolate(p, [0, 1], [0, n * 115]);
          return (
            <div
              key={n}
              style={{
                background: `linear-gradient(90deg, rgba(255,106,26,${0.1 + n * 0.07}), rgba(53,167,255,${0.18 + n * 0.06}))`,
                border: `3px solid ${n === 2 ? COLORS.blue : COLORS.orange}`,
                borderRadius: 24,
                height: 160,
                left: n * 45,
                position: "absolute",
                top: 280 - offset,
                transform: `skewY(-7deg)`,
                width: 710 - n * 90,
              }}
            />
          );
        })}
        <div style={{background: COLORS.line, height: 420, left: 16, position: "absolute", top: -50, width: 3}} />
        <Label style={{left: 34, position: "absolute", top: -90}}>开发起点</Label>
      </div>
      <Subtitle>新昆仑架构，从2023年初开始开发。</Subtitle>
    </Frame>
  );
};

const Shot08 = () => {
  const frame = useCurrentFrame();
  const travel = interpolate(progress(frame, 90), [0, 1], [-80, 110]);
  const seatOpacity = interpolate(frame, [45, 65], [1, 0.28], clamp);
  return (
    <Frame
      accent={COLORS.cyan}
      angle={170}
      disclosure="原创示意｜非官方结构图｜非实拍"
      shotId="shot_08"
      strongDisclosure
    >
      <div style={{left: 90, position: "absolute", top: 300}}>
        <Headline style={{fontSize: 100}}>纯平地板</Headline>
        <Label style={{color: COLORS.cyan, marginTop: 24}}>空间变化的基础</Label>
      </div>
      <div style={{left: travel, position: "absolute", top: 690, width: 1140}}>
        <div
          style={{
            background: `linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.blue})`,
            boxShadow: `0 0 36px ${COLORS.cyan}55`,
            height: 18,
            left: 60,
            position: "absolute",
            top: 520,
            width: 920,
          }}
        />
        {[230, 650].map((left, index) => (
          <div key={left} style={{left, opacity: seatOpacity, position: "absolute", top: index === 0 ? 180 : 220}}>
            <div style={{border: `5px solid ${COLORS.orange}`, borderRadius: "70px 70px 22px 22px", height: 210, width: 150}} />
            <div style={{background: "rgba(255,106,26,0.18)", border: `4px solid ${COLORS.orange}`, height: 110, marginLeft: 18, width: 180}} />
          </div>
        ))}
        {[0, 1, 2, 3, 4].map((n) => (
          <div
            key={n}
            style={{
              background: COLORS.line,
              height: 130,
              left: 100 + n * 190,
              position: "absolute",
              top: 530,
              transform: "skewX(-22deg)",
              width: 3,
            }}
          />
        ))}
      </div>
      <Subtitle accent={COLORS.cyan}>纯平地板，是空间变化的基础。</Subtitle>
    </Frame>
  );
};

const Shot09 = () => {
  const frame = useCurrentFrame();
  const p = progress(frame, 90);
  const seatX = interpolate(p, [0, 0.8, 1], [215, 690, 690], clamp);
  const seatY = interpolate(p, [0, 0.8, 1], [1030, 660, 660], clamp);
  return (
    <Frame
      accent={COLORS.orange}
      angle={215}
      disclosure="原创示意｜非官方结构图｜非实拍"
      shotId="shot_09"
      strongDisclosure
    >
      <div style={{left: 90, position: "absolute", top: 300}}>
        <Label style={{color: COLORS.orangeSoft}}>MOTION PATH / NO REAL DISTANCE</Label>
        <Headline style={{fontSize: 96, marginTop: 18}}>长滑轨</Headline>
        <Label style={{fontSize: 36, marginTop: 18}}>按场景重新组合</Label>
      </div>
      <svg height="900" style={{bottom: 330, position: "absolute"}} viewBox="0 0 1080 900" width="1080">
        <path d="M160 700 C300 660 410 510 535 455 C690 385 755 260 930 205" fill="none" stroke="rgba(244,247,250,0.18)" strokeWidth="52" />
        <path d="M160 700 C300 660 410 510 535 455 C690 385 755 260 930 205" fill="none" stroke={COLORS.orange} strokeDasharray="20 18" strokeWidth="8" />
        <path d="M885 190 L938 202 L908 248" fill="none" stroke={COLORS.orange} strokeWidth="10" />
      </svg>
      <div
        style={{
          background: "rgba(53,167,255,0.16)",
          border: `5px solid ${COLORS.blue}`,
          borderRadius: "54px 54px 18px 18px",
          boxShadow: `0 0 46px ${COLORS.blue}55`,
          height: 190,
          left: seatX,
          position: "absolute",
          top: seatY,
          transform: "rotate(-35deg)",
          width: 160,
        }}
      />
      <Subtitle>长滑轨，让座椅按场景重新组合。</Subtitle>
    </Frame>
  );
};

const PersonIcon = ({color, label}: {color: string; label: string}) => (
  <div style={{alignItems: "center", display: "flex", flexDirection: "column", gap: 12}}>
    <div style={{border: `4px solid ${color}`, borderRadius: "50%", height: 58, width: 58}} />
    <div style={{border: `4px solid ${color}`, borderRadius: "42px 42px 18px 18px", height: 88, width: 92}} />
    <Label style={{color, fontSize: 26}}>{label}</Label>
  </div>
);

const Shot10 = () => {
  const frame = useCurrentFrame();
  const p = enter(frame, 0, 28);
  const zone = (left: number, top: number, color: string, label: string) => (
    <div
      key={label}
      style={{
        alignItems: "center",
        border: `3px solid ${color}`,
        borderRadius: 160,
        display: "flex",
        height: 300,
        justifyContent: "center",
        left,
        opacity: p,
        position: "absolute",
        top,
        transform: `scale(${0.82 + p * 0.18})`,
        width: 300,
      }}
    >
      <PersonIcon color={color} label={label} />
    </div>
  );
  return (
    <Frame accent={COLORS.blue} angle={260} disclosure="编辑场景示意｜非功能演示" shotId="shot_10">
      <div style={{left: 90, position: "absolute", top: 285}}>
        <Headline style={{fontSize: 78}}>从驾驶</Headline>
        <div style={{color: COLORS.orange, fontFamily: FONT, fontSize: 66, fontWeight: 820, marginTop: 14}}>扩展到家庭与多场景</div>
      </div>
      <div style={{height: 750, left: 90, position: "absolute", top: 575, width: 840}}>
        {zone(20, 50, COLORS.blue, "驾驶")}
        {zone(480, 10, COLORS.orange, "家庭")}
        {zone(260, 365, COLORS.cyan, "多场景")}
        <div style={{background: COLORS.line, height: 4, left: 280, position: "absolute", top: 250, transform: "rotate(-9deg)", width: 280}} />
        <div style={{background: COLORS.line, height: 4, left: 280, position: "absolute", top: 380, transform: "rotate(35deg)", width: 250}} />
      </div>
      <Subtitle accent={COLORS.blue}>小米由驾驶性能，扩展到家庭和多场景。</Subtitle>
    </Frame>
  );
};

const Shot11 = () => {
  const frame = useCurrentFrame();
  const p = progress(frame, 90);
  return (
    <Frame accent={COLORS.orange} angle={5} disclosure="编辑判断｜不含尺寸结论" shotId="shot_11">
      <div style={{left: 90, position: "absolute", right: 150, top: 350}}>
        <Label>真正的门槛</Label>
        <Headline style={{fontSize: 110, marginTop: 34}}>不只是</Headline>
        <div
          style={{
            color: COLORS.orange,
            fontFamily: FONT,
            fontSize: 250,
            fontWeight: 900,
            letterSpacing: -12,
            lineHeight: 1,
            marginLeft: -10,
            marginTop: 18,
            transform: `scale(${1 + p * 0.08})`,
            transformOrigin: "0 50%",
          }}
        >
          “大”
        </div>
        <div style={{background: COLORS.line, height: 4, marginTop: 100, position: "relative", width: 820}}>
          <div style={{background: COLORS.orange, height: 4, width: 820 * p}} />
          <div style={{background: COLORS.orange, borderRadius: "50%", height: 28, left: 800 * p, position: "absolute", top: -12, width: 28}} />
        </div>
      </div>
      <Subtitle>真正的门槛，不是尺寸做得多大。</Subtitle>
    </Frame>
  );
};

const Shot12 = () => {
  const frame = useCurrentFrame();
  const p = progress(frame, 90);
  const items = ["安全？", "顺手？", "稳定量产？"];
  return (
    <Frame
      accent={COLORS.orange}
      angle={120}
      disclosure="编辑观察｜待实车与独立测试｜非验证结论"
      shotId="shot_12"
      strongDisclosure
    >
      <div style={{left: 90, position: "absolute", top: 280}}>
        <Label style={{color: COLORS.orangeSoft}}>WATCH POINT / QUESTIONS, NOT RESULTS</Label>
        <Headline style={{fontSize: 75, marginTop: 24}}>变化能不能真正可用？</Headline>
      </div>
      <div style={{display: "flex", gap: 34, left: 80, position: "absolute", top: 680}}>
        {items.map((item, index) => {
          const active = p > index / 3;
          return (
            <div key={item} style={{alignItems: "center", display: "flex", gap: 28}}>
              <div
                style={{
                  alignItems: "center",
                  background: active ? "rgba(255,106,26,0.16)" : "rgba(244,247,250,0.035)",
                  border: `4px solid ${active ? COLORS.orange : COLORS.line}`,
                  borderRadius: 30,
                  color: COLORS.text,
                  display: "flex",
                  fontFamily: FONT,
                  fontSize: index === 2 ? 37 : 44,
                  fontWeight: 820,
                  height: 240,
                  justifyContent: "center",
                  textAlign: "center",
                  width: 250,
                }}
              >
                {item}
              </div>
              {index < items.length - 1 ? <div style={{color: COLORS.muted, fontFamily: FONT, fontSize: 56}}>→</div> : null}
            </div>
          );
        })}
      </div>
      <div
        style={{
          borderLeft: `6px solid ${COLORS.orange}`,
          color: "#FFD2B7",
          fontFamily: FONT,
          fontSize: 34,
          fontWeight: 720,
          left: 90,
          lineHeight: 1.45,
          paddingLeft: 24,
          position: "absolute",
          top: 1110,
        }}
      >
        这些是待验证条件，<br />不是已经完成的实车结论。
      </div>
      <Subtitle>真正的门槛，是变化能不能安全、顺手地稳定量产。</Subtitle>
    </Frame>
  );
};

const Shot13 = () => {
  const frame = useCurrentFrame();
  const p = enter(frame, 0, 22);
  const nodes = [
    {x: 180, y: 990, label: "空间", color: COLORS.orange},
    {x: 540, y: 540, label: "智能", color: COLORS.blue},
    {x: 860, y: 1030, label: "生态", color: COLORS.cyan},
  ];
  return (
    <Frame
      accent={COLORS.blue}
      angle={330}
      disclosure="编辑分析｜关系示意｜非已公布功能"
      shotId="shot_13"
      strongDisclosure
    >
      <div style={{left: 90, position: "absolute", top: 295}}>
        <Label style={{color: COLORS.blue}}>EDITORIAL RELATIONSHIP</Label>
        <Headline style={{fontSize: 90, marginTop: 18}}>空间 × 智能生态</Headline>
      </div>
      <svg height="850" style={{bottom: 360, position: "absolute"}} viewBox="0 0 1080 850" width="1080">
        <path d="M180 630 L540 180 L860 670 Z" fill="rgba(53,167,255,0.06)" stroke="rgba(244,247,250,0.25)" strokeDasharray="16 14" strokeWidth="5" />
        <path d="M180 630 L540 180" fill="none" stroke={COLORS.orange} strokeWidth={8 * p} />
        <path d="M540 180 L860 670" fill="none" stroke={COLORS.blue} strokeWidth={8 * p} />
      </svg>
      {nodes.map((node) => (
        <div
          key={node.label}
          style={{
            alignItems: "center",
            background: COLORS.background2,
            border: `5px solid ${node.color}`,
            borderRadius: "50%",
            color: COLORS.text,
            display: "flex",
            fontFamily: FONT,
            fontSize: 40,
            fontWeight: 820,
            height: 170,
            justifyContent: "center",
            left: node.x - 85,
            position: "absolute",
            top: node.y - 85,
            transform: `scale(${0.7 + p * 0.3})`,
            width: 170,
          }}
        >
          {node.label}
        </div>
      ))}
      <Subtitle accent={COLORS.blue}>空间逻辑，也给智能生态一个新落点。</Subtitle>
    </Frame>
  );
};

const Shot14 = () => {
  const frame = useCurrentFrame();
  const p = progress(frame, 75);
  return (
    <Frame accent={COLORS.orange} angle={65} disclosure="编辑判断" shotId="shot_14">
      <div style={{left: 90, position: "absolute", top: 300}}>
        <Label style={{color: COLORS.orangeSoft}}>EDITORIAL CONCLUSION</Label>
        <Headline style={{fontSize: 72, marginTop: 25}}>不是加一辆车</Headline>
        <Headline style={{color: COLORS.orange, fontSize: 86, marginTop: 18}}>是改产品逻辑</Headline>
      </div>
      <div style={{left: 540, position: "absolute", top: 900}}>
        <div
          style={{
            alignItems: "center",
            background: `linear-gradient(135deg, ${COLORS.orange}, #C84213)`,
            borderRadius: "50%",
            color: COLORS.text,
            display: "flex",
            fontFamily: FONT,
            fontSize: 38,
            fontWeight: 850,
            height: 220,
            justifyContent: "center",
            left: -110,
            position: "absolute",
            textAlign: "center",
            top: -110,
            width: 220,
          }}
        >
          产品逻辑
        </div>
        {[0, 1, 2, 3].map((n) => {
          const angle = (-140 + n * 90) * (Math.PI / 180);
          const radius = 250 + p * 90;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          return (
            <div key={n}>
              <div style={{background: COLORS.line, height: 3, left: 0, position: "absolute", top: 0, transform: `rotate(${angle}rad)`, transformOrigin: "0 50%", width: radius}} />
              <div style={{background: n % 2 === 0 ? COLORS.blue : COLORS.cyan, borderRadius: "50%", height: 52, left: x - 26, position: "absolute", top: y - 26, width: 52}} />
            </div>
          );
        })}
      </div>
      <Subtitle>我的判断：澎程是在改小米汽车的产品逻辑。</Subtitle>
    </Frame>
  );
};

const Shot15 = () => {
  const frame = useCurrentFrame();
  const p = enter(frame, 0, 20);
  const choices = [
    {label: "买澎程", color: COLORS.orange, offset: -34},
    {label: "选驾驶型 SUV", color: COLORS.blue, offset: 0},
    {label: "继续等", color: COLORS.cyan, offset: 34},
  ];
  return (
    <Frame accent={COLORS.orange} angle={200} disclosure="互动选择｜不含价格预测" shotId="shot_15">
      <div style={{left: 90, position: "absolute", top: 280}}>
        <Label style={{color: COLORS.orangeSoft}}>价格公布后</Label>
        <Headline style={{fontSize: 94, marginTop: 20}}>你的选择？</Headline>
      </div>
      <div style={{display: "flex", gap: 18, left: 70, position: "absolute", top: 680}}>
        {choices.map((choice, index) => (
          <div
            key={choice.label}
            style={{
              background: `linear-gradient(180deg, ${choice.color}26, rgba(9,13,18,0.32))`,
              border: `4px solid ${choice.color}`,
              borderRadius: "28px 28px 90px 90px",
              color: COLORS.text,
              display: "flex",
              flexDirection: "column",
              fontFamily: FONT,
              fontSize: index === 1 ? 37 : 44,
              fontWeight: 820,
              height: 590,
              justifyContent: "flex-start",
              opacity: p,
              paddingTop: 72,
              textAlign: "center",
              transform: `translateY(${(1 - p) * 110 + choice.offset}px) perspective(900px) rotateX(7deg)`,
              width: 300,
            }}
          >
            <div style={{padding: "0 18px"}}>{choice.label}</div>
            <div style={{background: choice.color, height: 7, margin: "44px auto 0", width: 100}} />
            <div style={{color: choice.color, fontSize: 86, marginTop: "auto", paddingBottom: 74}}>0{index + 1}</div>
          </div>
        ))}
      </div>
      <Subtitle>价格公布后，你会买澎程、选同价位驾驶型SUV，还是继续等？</Subtitle>
    </Frame>
  );
};

const SHOT_COMPONENTS = [
  Shot01,
  Shot02,
  Shot03,
  Shot04,
  Shot05,
  Shot06,
  Shot07,
  Shot08,
  Shot09,
  Shot10,
  Shot11,
  Shot12,
  Shot13,
  Shot14,
  Shot15,
] as const;

export const XiaomiOriginalEditorialProject = () => {
  const {durationInFrames, fps, height, width} = useVideoConfig();

  if (durationInFrames !== 1245 || fps !== 30 || width !== 1080 || height !== 1920) {
    throw new Error("Picture Review composition config does not match the approved lock.");
  }

  return (
    <AbsoluteFill
      data-audio-mode="silent"
      data-external-visual-assets="0"
      style={{backgroundColor: COLORS.background}}
    >
      {XIAOMI_ORIGINAL_EDITORIAL_SHOTS.map((shot, index) => {
        const Component = SHOT_COMPONENTS[index];
        return (
          <Sequence
            durationInFrames={shot.durationInFrames}
            from={shot.from}
            key={shot.shotId}
            name={`${shot.shotId} / ${shot.headline}`}
          >
            <Component />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const XiaomiOriginalEditorialAudioTimingProject = () => {
  const {durationInFrames, fps, height, width} = useVideoConfig();

  if (durationInFrames !== 1245 || fps !== 30 || width !== 1080 || height !== 1920) {
    throw new Error("Audio Timing Review composition config does not match the approved revision.");
  }

  return (
    <AbsoluteFill
      data-audio-mode="existing-minimax-segments-muxed-after-picture-render"
      data-external-visual-assets="0"
      style={{backgroundColor: COLORS.background}}
    >
      {XIAOMI_ORIGINAL_EDITORIAL_AUDIO_TIMING_SHOTS.map((shot, index) => {
        const Component = SHOT_COMPONENTS[index];
        return (
          <Sequence
            durationInFrames={shot.durationInFrames}
            from={shot.from}
            key={shot.shotId}
            name={`${shot.shotId} / ${shot.headline} / audio-timing-r2`}
            premountFor={30}
          >
            <CaptionTimingContext.Provider
              value={{endFrameExclusive: shot.captionEndFrameExclusive, text: shot.caption}}
            >
              <Component />
            </CaptionTimingContext.Provider>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
