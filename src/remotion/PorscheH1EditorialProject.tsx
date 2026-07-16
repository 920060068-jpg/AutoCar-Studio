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
  accent: "#E5483F",
  background: "#111315",
  data: "#38C7C1",
  line: "rgba(244, 241, 234, 0.18)",
  muted: "#B8BDC3",
  surface: "#1B1F23",
  text: "#F4F1EA",
};

const FONT =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
const clamp = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};

type Shot = {
  caption: string;
  disclosure: string;
  duration: number;
  id: string;
  kind:
    | "global"
    | "compare"
    | "china"
    | "regions"
    | "cayenne"
    | "nineeleven"
    | "macan"
    | "positioning"
    | "causes"
    | "analysis"
    | "watch"
    | "ending";
};

export const PORSCHE_H1_SHOTS: readonly Shot[] = [
  {id: "shot_01", kind: "global", duration: 3, disclosure: "原创数据动态图形｜非实拍", caption: "保时捷上半年交付 12.23 万辆，少了 16%"},
  {id: "shot_02", kind: "compare", duration: 3, disclosure: "交付数据｜保时捷官方", caption: "全球交付：14.64 万 → 12.23 万"},
  {id: "shot_03", kind: "china", duration: 3, disclosure: "中国市场｜保时捷官方", caption: "中国交付 1.45 万辆，同比下降 32%"},
  {id: "shot_04", kind: "regions", duration: 3, disclosure: "区域数据｜保时捷官方", caption: "北美仍是最大区域：3.77 万辆"},
  {id: "shot_05", kind: "cayenne", duration: 3, disclosure: "车型数据｜保时捷官方", caption: "Cayenne 仍是最大车型线：3.81 万辆"},
  {id: "shot_06", kind: "nineeleven", duration: 3, disclosure: "车型数据｜保时捷官方", caption: "911 却逆势增长 19%"},
  {id: "shot_07", kind: "macan", duration: 3, disclosure: "车型数据｜保时捷官方", caption: "Macan 3.53 万辆；纯电占 1.56 万辆"},
  {id: "shot_08", kind: "positioning", duration: 3, disclosure: "官方说明｜编辑归纳", caption: "中国市场：保时捷继续强调价值导向销售"},
  {id: "shot_09", kind: "causes", duration: 3, disclosure: "官方说明｜非因果定论", caption: "718 停产、去年高基数、补贴退出共同影响"},
  {id: "shot_10", kind: "analysis", duration: 4, disclosure: "编辑分析｜基于已核验数据", caption: "这不是单一车型的问题，而是组合题"},
  {id: "shot_11", kind: "watch", duration: 3, disclosure: "官方信息｜截至 2026.07.09", caption: "Cayenne Electric 已在 6 月底开始交付"},
  {id: "shot_12", kind: "ending", duration: 4, disclosure: "原创互动图形｜非投资建议", caption: "你会押注 911、纯电，还是价值导向？"},
] as const;

const fadeIn = (frame: number, from = 0, duration = 14): number =>
  interpolate(frame, [from, from + duration], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

const Background = ({accent}: {accent: string}) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 90], [-42, 42], clamp);
  return (
    <AbsoluteFill style={{background: COLORS.background, overflow: "hidden"}}>
      <div
        style={{
          background: `radial-gradient(circle, ${accent}36 0%, ${accent}00 68%)`,
          borderRadius: "50%",
          filter: "blur(34px)",
          height: 780,
          left: -390,
          position: "absolute",
          top: 80,
          translate: `${drift}px ${drift * 0.3}px`,
          width: 780,
        }}
      />
      <div
        style={{
          background: `radial-gradient(circle, ${COLORS.data}1F 0%, ${COLORS.data}00 70%)`,
          borderRadius: "50%",
          bottom: -380,
          filter: "blur(42px)",
          height: 860,
          position: "absolute",
          right: -400,
          translate: `${-drift * 0.7}px ${drift * 0.45}px`,
          width: 860,
        }}
      />
      <div
        style={{
          backgroundImage:
            "linear-gradient(rgba(244,241,234,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(244,241,234,0.04) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          inset: 0,
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.85), transparent 88%)",
          opacity: 0.6,
          position: "absolute",
          translate: `0px ${drift * 0.3}px`,
        }}
      />
    </AbsoluteFill>
  );
};

const Frame = ({
  accent,
  caption,
  children,
  disclosure,
  shotId,
}: {
  accent: string;
  caption: string;
  children: ReactNode;
  disclosure: string;
  shotId: string;
}) => {
  const frame = useCurrentFrame();
  const captionOpacity = fadeIn(frame, 5, 10);
  return (
    <AbsoluteFill data-shot-id={shotId} style={{background: COLORS.background, overflow: "hidden"}}>
      <Background accent={accent} />
      <div
        style={{
          alignItems: "center",
          background: "rgba(17,19,21,0.74)",
          border: `1px solid ${COLORS.line}`,
          borderRadius: 999,
          color: COLORS.muted,
          display: "flex",
          fontFamily: FONT,
          fontSize: 26,
          fontWeight: 700,
          left: 90,
          letterSpacing: 1,
          minHeight: 50,
          padding: "0 22px",
          position: "absolute",
          top: 150,
          zIndex: 20,
        }}
      >
        {disclosure}
      </div>
      <div
        style={{
          color: "rgba(244,241,234,0.44)",
          fontFamily: FONT,
          fontSize: 22,
          fontWeight: 750,
          letterSpacing: 3,
          position: "absolute",
          right: 150,
          top: 166,
          zIndex: 20,
        }}
      >
        {shotId.toUpperCase()}
      </div>
      {children}
      <div
        data-caption-safe-area="top150-right150-bottom260-left90"
        style={{
          bottom: 270,
          color: COLORS.text,
          fontFamily: FONT,
          fontSize: 44,
          fontWeight: 760,
          left: 90,
          lineHeight: 1.32,
          opacity: captionOpacity,
          position: "absolute",
          right: 150,
          textShadow: "0 4px 18px rgba(0,0,0,0.72)",
          translate: `0px ${(1 - captionOpacity) * 22}px`,
          zIndex: 30,
        }}
      >
        <div style={{background: accent, height: 4, marginBottom: 14, width: 84}} />
        {caption}
      </div>
    </AbsoluteFill>
  );
};

const Number = ({children, color = COLORS.text}: {children: ReactNode; color?: string}) => (
  <div
    style={{
      color,
      fontFamily: FONT,
      fontSize: 172,
      fontVariantNumeric: "tabular-nums",
      fontWeight: 900,
      letterSpacing: -9,
      lineHeight: 0.94,
    }}
  >
    {children}
  </div>
);

const Supporting = ({children}: {children: ReactNode}) => (
  <div
    style={{
      color: COLORS.muted,
      fontFamily: FONT,
      fontSize: 34,
      fontWeight: 520,
      letterSpacing: 1,
      lineHeight: 1.35,
      marginTop: 26,
    }}
  >
    {children}
  </div>
);

const Center = ({children}: {children: ReactNode}) => (
  <div
    style={{
      bottom: 420,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      left: 90,
      position: "absolute",
      right: 150,
      top: 270,
      zIndex: 10,
    }}
  >
    {children}
  </div>
);

const GlobalScene = () => {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [0, 54], [0, -18], clamp);
  const headline = 1;
  return (
    <Frame accent={COLORS.accent} shotId="shot_01" disclosure="原创数据动态图形｜非实拍" caption="保时捷上半年交付 12.23 万辆，少了 16%">
      <Center>
        <div style={{color: COLORS.accent, fontFamily: FONT, fontSize: 30, fontWeight: 800, letterSpacing: 7, opacity: headline}}>
          PORSCHE · H1 2026
        </div>
        <div style={{marginTop: 36, opacity: headline, translate: `0px ${rise}px`}}>
          <Number>122,306</Number>
          <Supporting>全球客户交付｜2026 年 1—6 月</Supporting>
        </div>
        <div style={{alignItems: "center", display: "flex", gap: 18, marginTop: 44, opacity: fadeIn(frame, 20, 14)}}>
          <div style={{background: COLORS.accent, height: 4, width: 116}} />
          <div style={{color: COLORS.accent, fontFamily: FONT, fontSize: 64, fontWeight: 900}}>−16%</div>
        </div>
      </Center>
    </Frame>
  );
};

const CompareScene = () => {
  const frame = useCurrentFrame();
  const currentWidth = interpolate(frame, [6, 72], [0, 100], clamp);
  const previousWidth = interpolate(frame, [2, 58], [0, 100], clamp);
  return (
    <Frame accent={COLORS.data} shotId="shot_02" disclosure="交付数据｜保时捷官方" caption="全球交付：14.64 万 → 12.23 万">
      <Center>
        <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 74, fontWeight: 860, lineHeight: 1.08}}>同比不是小波动</div>
        <div style={{display: "flex", flexDirection: "column", gap: 38, marginTop: 70}}>
          {([
            ["2025 H1", "146,391", COLORS.muted, previousWidth],
            ["2026 H1", "122,306", COLORS.accent, currentWidth],
          ] as const).map(([label, value, color, width]) => (
            <div key={String(label)}>
              <div style={{alignItems: "baseline", display: "flex", justifyContent: "space-between"}}>
                <div style={{color, fontFamily: FONT, fontSize: 32, fontWeight: 700}}>{label}</div>
                <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 54, fontVariantNumeric: "tabular-nums", fontWeight: 850}}>{value}</div>
              </div>
              <div style={{background: "rgba(244,241,234,0.12)", height: 24, marginTop: 16, overflow: "hidden"}}>
                <div style={{background: color, height: "100%", width: `${width}%`}} />
              </div>
            </div>
          ))}
        </div>
      </Center>
    </Frame>
  );
};

const ChinaScene = () => {
  const frame = useCurrentFrame();
  const ring = interpolate(frame, [0, 80], [0, 320], clamp);
  return (
    <Frame accent={COLORS.accent} shotId="shot_03" disclosure="中国市场｜保时捷官方" caption="中国交付 1.45 万辆，同比下降 32%">
      <Center>
        <div style={{color: COLORS.muted, fontFamily: FONT, fontSize: 34, fontWeight: 700, letterSpacing: 4}}>CHINA · H1 2026</div>
        <div style={{alignItems: "center", display: "flex", gap: 54, marginTop: 54}}>
          <div style={{alignItems: "center", border: `${ring / 40 + 4}px solid ${COLORS.accent}`, borderRadius: "50%", display: "flex", height: 300, justifyContent: "center", width: 300}}>
            <div style={{color: COLORS.accent, fontFamily: FONT, fontSize: 80, fontWeight: 900}}>−32%</div>
          </div>
          <div>
            <Number color={COLORS.text}>14,501</Number>
            <Supporting>辆｜官方交付口径</Supporting>
          </div>
        </div>
      </Center>
    </Frame>
  );
};

const RegionsScene = () => {
  const frame = useCurrentFrame();
  const regions = [
    ["北美", "37,712", "−13%", COLORS.data],
    ["欧洲（不含德国）", "30,278", "−14%", COLORS.muted],
    ["中国", "14,501", "−32%", COLORS.accent],
  ] as const;
  return (
    <Frame accent={COLORS.data} shotId="shot_04" disclosure="区域数据｜保时捷官方" caption="北美仍是最大区域：3.77 万辆">
      <Center>
        <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 68, fontWeight: 860}}>区域排序没变</div>
        <div style={{display: "flex", flexDirection: "column", gap: 24, marginTop: 64}}>
          {regions.map(([name, value, change, color], index) => {
            const reveal = fadeIn(frame, index * 12, 14);
            return (
              <div key={name} style={{alignItems: "center", background: "rgba(27,31,35,0.82)", borderLeft: `10px solid ${color}`, display: "flex", justifyContent: "space-between", opacity: reveal, padding: "28px 30px", translate: `${(1 - reveal) * 50}px 0px`}}>
                <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 38, fontWeight: 760}}>{name}</div>
                <div style={{alignItems: "baseline", display: "flex", gap: 20}}>
                  <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 48, fontVariantNumeric: "tabular-nums", fontWeight: 850}}>{value}</div>
                  <div style={{color, fontFamily: FONT, fontSize: 30, fontWeight: 800}}>{change}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Center>
    </Frame>
  );
};

const ModelScene = ({
  accent,
  change,
  detail,
  model,
  value,
}: {
  accent: string;
  change: string;
  detail: string;
  model: string;
  value: string;
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 84], [0, 1], clamp);
  const isNineEleven = model === "911";
  return (
    <Frame accent={accent} shotId={model === "Cayenne" ? "shot_05" : "shot_06"} disclosure="车型数据｜保时捷官方" caption={model === "Cayenne" ? "Cayenne 仍是最大车型线：3.81 万辆" : "911 却逆势增长 19%"}>
      <Center>
        {isNineEleven ? (
          <>
            <div style={{alignItems: "flex-start", display: "flex", justifyContent: "space-between"}}>
              <div>
                <div style={{color: accent, fontFamily: FONT, fontSize: 34, fontWeight: 800, letterSpacing: 6}}>MODEL LINE</div>
                <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 172, fontWeight: 920, letterSpacing: -12, lineHeight: 0.9, marginTop: 22}}>911</div>
              </div>
              <div style={{color: accent, fontFamily: FONT, fontSize: 96, fontWeight: 900, lineHeight: 0.9, marginTop: 70}}>↗</div>
            </div>
            <div style={{alignItems: "baseline", display: "flex", gap: 24, justifyContent: "flex-end", marginTop: 96}}>
              <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 112, fontVariantNumeric: "tabular-nums", fontWeight: 900, letterSpacing: -7}}>{value}</div>
              <div style={{color: accent, fontFamily: FONT, fontSize: 64, fontWeight: 900}}>{change}</div>
            </div>
            <div style={{background: "rgba(244,241,234,0.12)", height: 14, marginLeft: 150, marginTop: 26, overflow: "hidden", width: "calc(100% - 150px)"}}>
              <div style={{background: accent, height: "100%", width: `${progress * 100}%`}} />
            </div>
            <Supporting>{detail}</Supporting>
          </>
        ) : (
          <>
            <div style={{color: accent, fontFamily: FONT, fontSize: 34, fontWeight: 800, letterSpacing: 6}}>MODEL LINE</div>
            <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 136, fontWeight: 920, letterSpacing: -8, marginTop: 20, opacity: fadeIn(frame, 2, 14)}}>{model}</div>
            <div style={{alignItems: "flex-end", display: "flex", gap: 22, marginTop: 66}}>
              <Number>{value}</Number>
              <div style={{color: accent, fontFamily: FONT, fontSize: 62, fontWeight: 900, marginBottom: 10}}>{change}</div>
            </div>
            <Supporting>{detail}</Supporting>
            <div style={{background: "rgba(244,241,234,0.12)", height: 14, marginTop: 50, overflow: "hidden", width: "100%"}}>
              <div style={{background: accent, height: "100%", width: `${progress * 100}%`}} />
            </div>
          </>
        )}
      </Center>
    </Frame>
  );
};

const MacanScene = () => {
  const frame = useCurrentFrame();
  const evHeight = interpolate(frame, [12, 78], [0, 280], clamp);
  const iceHeight = interpolate(frame, [0, 66], [0, 350], clamp);
  return (
    <Frame accent={COLORS.data} shotId="shot_07" disclosure="车型数据｜保时捷官方" caption="Macan 3.53 万辆；纯电占 1.56 万辆">
      <Center>
        <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 116, fontWeight: 900, letterSpacing: -7}}>Macan</div>
        <div style={{alignItems: "flex-end", display: "flex", gap: 30, height: 470, marginTop: 48}}>
          <div style={{alignItems: "center", display: "flex", flex: 1, flexDirection: "column", gap: 16, justifyContent: "flex-end"}}>
            <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 52, fontWeight: 880}}>19,695</div>
            <div style={{background: COLORS.muted, height: iceHeight, width: "100%"}} />
            <div style={{color: COLORS.muted, fontFamily: FONT, fontSize: 30, fontWeight: 740}}>燃油版</div>
          </div>
          <div style={{alignItems: "center", display: "flex", flex: 1, flexDirection: "column", gap: 16, justifyContent: "flex-end"}}>
            <div style={{color: COLORS.data, fontFamily: FONT, fontSize: 52, fontWeight: 880}}>15,620</div>
            <div style={{background: COLORS.data, height: evHeight, width: "100%"}} />
            <div style={{color: COLORS.data, fontFamily: FONT, fontSize: 30, fontWeight: 740}}>纯电版</div>
          </div>
        </div>
        <Supporting>车型线合计 35,315 辆，同比 −22%</Supporting>
      </Center>
    </Frame>
  );
};

const PositioningScene = () => {
  const frame = useCurrentFrame();
  const pulse = interpolate(frame, [0, 45, 90], [0.82, 1, 0.82], clamp);
  return (
    <Frame accent={COLORS.accent} shotId="shot_08" disclosure="官方说明｜编辑归纳" caption="中国市场：保时捷继续强调价值导向销售">
      <Center>
        <div style={{alignItems: "center", display: "flex", flexDirection: "column", gap: 30}}>
          <div style={{background: COLORS.accent, borderRadius: "50%", height: 176, opacity: pulse, width: 176}} />
          <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 88, fontWeight: 900, letterSpacing: -4}}>价值导向</div>
          <Supporting>这是保时捷在公告中对中国市场策略的表述</Supporting>
        </div>
        <div style={{border: `2px solid ${COLORS.line}`, marginTop: 72, padding: "30px 34px"}}>
          <div style={{color: COLORS.muted, fontFamily: FONT, fontSize: 34, lineHeight: 1.45}}>不能把它直接等同于价格、折扣或未来销量预测。</div>
        </div>
      </Center>
    </Frame>
  );
};

const CausesScene = () => {
  const frame = useCurrentFrame();
  const causes = ["718 燃油版停产", "去年纯电 Macan 高基数", "美国电动化补贴到期"];
  return (
    <Frame accent={COLORS.data} shotId="shot_09" disclosure="官方说明｜非因果定论" caption="718 停产、去年高基数、补贴退出共同影响">
      <Center>
        <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 72, fontWeight: 860, lineHeight: 1.14}}>官方列出的影响因素</div>
        <div style={{display: "flex", flexDirection: "column", gap: 26, marginTop: 66}}>
          {causes.map((cause, index) => {
            const reveal = fadeIn(frame, 4 + index * 18, 12);
            return (
              <div key={cause} style={{alignItems: "center", display: "flex", gap: 26, opacity: reveal, translate: `${(1 - reveal) * 70}px 0px`}}>
                <div style={{background: index === 2 ? COLORS.accent : COLORS.data, borderRadius: "50%", height: 24, width: 24}} />
                <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 42, fontWeight: 720}}>{cause}</div>
              </div>
            );
          })}
        </div>
      </Center>
    </Frame>
  );
};

const AnalysisScene = () => {
  const frame = useCurrentFrame();
  const nodes = ["市场", "产品", "动力"];
  return (
    <Frame accent={COLORS.accent} shotId="shot_10" disclosure="编辑分析｜基于已核验数据" caption="这不是单一车型的问题，而是组合题">
      <Center>
        <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 78, fontWeight: 900, lineHeight: 1.12}}>看懂这份成绩单，至少要拆三层</div>
        <div style={{alignItems: "center", display: "flex", justifyContent: "space-between", marginTop: 96, position: "relative"}}>
          <div style={{background: COLORS.line, height: 3, left: 90, position: "absolute", right: 90, top: "50%"}} />
          {nodes.map((node, index) => {
            const reveal = fadeIn(frame, 4 + index * 20, 14);
            return (
              <div key={node} style={{alignItems: "center", background: COLORS.surface, border: `3px solid ${index === 2 ? COLORS.accent : COLORS.data}`, borderRadius: "50%", color: COLORS.text, display: "flex", fontFamily: FONT, fontSize: 42, fontWeight: 840, height: 190, justifyContent: "center", opacity: reveal, position: "relative", scale: 0.72 + reveal * 0.28, width: 190, zIndex: 1}}>{node}</div>
            );
          })}
        </div>
        <Supporting>交付数据能说明结果，不能单独证明全部原因。</Supporting>
      </Center>
    </Frame>
  );
};

const WatchScene = () => {
  const frame = useCurrentFrame();
  const beam = interpolate(frame, [0, 90], [-680, 680], clamp);
  return (
    <Frame accent={COLORS.data} shotId="shot_11" disclosure="官方信息｜截至 2026.07.09" caption="Cayenne Electric 已在 6 月底开始交付">
      <Center>
        <div style={{color: COLORS.data, fontFamily: FONT, fontSize: 32, fontWeight: 820, letterSpacing: 7}}>NEXT WATCHPOINT</div>
        <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 92, fontWeight: 900, letterSpacing: -4, lineHeight: 1.12, marginTop: 40}}>Cayenne Electric</div>
        <div style={{background: "linear-gradient(90deg, rgba(56,199,193,0), rgba(56,199,193,0.88), rgba(56,199,193,0))", filter: "blur(8px)", height: 18, marginTop: 56, translate: `${beam}px 0px`, width: 600}} />
        <Supporting>官方称客户交付已于 6 月底开始；后续节奏仍待观察。</Supporting>
      </Center>
    </Frame>
  );
};

const EndingScene = () => {
  const frame = useCurrentFrame();
  const choices = ["守住 911", "押注纯电", "价值导向"];
  return (
    <Frame accent={COLORS.accent} shotId="shot_12" disclosure="原创互动图形｜非投资建议" caption="你会押注 911、纯电，还是价值导向？">
      <Center>
        <div style={{color: COLORS.text, fontFamily: FONT, fontSize: 74, fontWeight: 900, lineHeight: 1.12}}>保时捷的下半场，先看哪一条？</div>
        <div style={{display: "flex", flexDirection: "column", gap: 20, marginTop: 66}}>
          {choices.map((choice, index) => {
            const reveal = fadeIn(frame, 4 + index * 17, 12);
            return (
              <div key={choice} style={{alignItems: "center", border: `2px solid ${index === 1 ? COLORS.accent : COLORS.line}`, color: index === 1 ? COLORS.accent : COLORS.text, display: "flex", fontFamily: FONT, fontSize: 48, fontWeight: 830, justifyContent: "space-between", opacity: reveal, padding: "28px 34px", translate: `${(1 - reveal) * -70}px 0px`}}>
                <span>0{index + 1}</span><span>{choice}</span>
              </div>
            );
          })}
        </div>
      </Center>
    </Frame>
  );
};

const renderShot = (shot: Shot) => {
  if (shot.kind === "global") return <GlobalScene />;
  if (shot.kind === "compare") return <CompareScene />;
  if (shot.kind === "china") return <ChinaScene />;
  if (shot.kind === "regions") return <RegionsScene />;
  if (shot.kind === "cayenne") return <ModelScene accent={COLORS.data} model="Cayenne" value="38,141" change="−9%" detail="2026 H1 最大车型线" />;
  if (shot.kind === "nineeleven") return <ModelScene accent={COLORS.accent} model="911" value="30,534" change="+19%" detail="2026 H1 逆势增长" />;
  if (shot.kind === "macan") return <MacanScene />;
  if (shot.kind === "positioning") return <PositioningScene />;
  if (shot.kind === "causes") return <CausesScene />;
  if (shot.kind === "analysis") return <AnalysisScene />;
  if (shot.kind === "watch") return <WatchScene />;
  return <EndingScene />;
};

export const PorscheH1EditorialProject = () => {
  const {fps} = useVideoConfig();
  let from = 0;
  return (
    <AbsoluteFill>
      {PORSCHE_H1_SHOTS.map((shot, index) => {
        const durationInFrames = shot.duration * fps;
        const sequence = <Sequence key={shot.id} from={from} durationInFrames={durationInFrames}>{renderShot(shot)}</Sequence>;
        from += durationInFrames;
        return sequence;
      })}
    </AbsoluteFill>
  );
};
