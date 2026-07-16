export type XiaomiOriginalEditorialShot = {
  caption: string;
  disclosure: string;
  durationInFrames: number;
  from: number;
  headline: string;
  shotId: string;
};

export const XIAOMI_ORIGINAL_EDITORIAL_SHOTS: readonly XiaomiOriginalEditorialShot[] = [
  {
    shotId: "shot_01",
    from: 0,
    durationInFrames: 90,
    headline: "小米汽车｜第二条产品线，先讲空间",
    caption: "小米第二条汽车产品线，先讲的不是加速，而是空间。",
    disclosure: "原创示意｜非实拍",
  },
  {
    shotId: "shot_02",
    from: 90,
    durationInFrames: 75,
    headline: "SkyNomad｜小米澎程",
    caption: "它叫 SkyNomad，小米澎程。",
    disclosure: "信息图｜非实拍",
  },
  {
    shotId: "shot_03",
    from: 165,
    durationInFrames: 75,
    headline: "2026.07.09｜正式公布",
    caption: "7月9日，官方正式公布这个新系列。",
    disclosure: "原创时间线｜数据已核验",
  },
  {
    shotId: "shot_04",
    from: 240,
    durationInFrames: 60,
    headline: "智能｜可变｜大空间",
    caption: "定位：智能可变大空间SUV。",
    disclosure: "座舱空间示意｜非实车结构",
  },
  {
    shotId: "shot_05",
    from: 300,
    durationInFrames: 90,
    headline: "驾驶系列 ↔ 澎程空间系列",
    caption: "SU7、YU7面向驾驶者；澎程更重视乘员。",
    disclosure: "产品关系示意｜非车型外观对比",
  },
  {
    shotId: "shot_06",
    from: 390,
    durationInFrames: 90,
    headline: "两条产品线｜两种用车需求",
    caption: "两条产品线，对应两种用车需求。",
    disclosure: "定位归纳｜非市场份额数据",
  },
  {
    shotId: "shot_07",
    from: 480,
    durationInFrames: 90,
    headline: "小米昆仑架构｜2023年初",
    caption: "新昆仑架构，从2023年初开始开发。",
    disclosure: "原创示意｜非官方结构图｜非实拍",
  },
  {
    shotId: "shot_08",
    from: 570,
    durationInFrames: 90,
    headline: "纯平地板｜空间变化基础",
    caption: "纯平地板，是空间变化的基础。",
    disclosure: "原创示意｜非官方结构图｜非实拍",
  },
  {
    shotId: "shot_09",
    from: 660,
    durationInFrames: 90,
    headline: "长滑轨｜可重新组合",
    caption: "长滑轨，让座椅按场景重新组合。",
    disclosure: "原创示意｜非官方结构图｜非实拍",
  },
  {
    shotId: "shot_10",
    from: 750,
    durationInFrames: 90,
    headline: "从驾驶｜扩展到家庭与多场景",
    caption: "小米由驾驶性能，扩展到家庭和多场景。",
    disclosure: "编辑场景示意｜非功能演示",
  },
  {
    shotId: "shot_11",
    from: 840,
    durationInFrames: 90,
    headline: "真正的门槛，不只是“大”",
    caption: "真正的门槛，不是尺寸做得多大。",
    disclosure: "编辑判断｜不含尺寸结论",
  },
  {
    shotId: "shot_12",
    from: 930,
    durationInFrames: 90,
    headline: "安全？顺手？稳定量产？",
    caption: "真正的门槛，是变化能不能安全、顺手地稳定量产。",
    disclosure: "编辑观察｜待实车与独立测试｜非验证结论",
  },
  {
    shotId: "shot_13",
    from: 1020,
    durationInFrames: 75,
    headline: "空间 × 智能生态",
    caption: "空间逻辑，也给智能生态一个新落点。",
    disclosure: "编辑分析｜关系示意｜非已公布功能",
  },
  {
    shotId: "shot_14",
    from: 1095,
    durationInFrames: 75,
    headline: "不是加一辆车｜是改产品逻辑",
    caption: "我的判断：澎程是在改小米汽车的产品逻辑。",
    disclosure: "编辑判断",
  },
  {
    shotId: "shot_15",
    from: 1170,
    durationInFrames: 75,
    headline: "买澎程｜选驾驶型SUV｜继续等",
    caption: "价格公布后，你会买澎程、选同价位驾驶型SUV，还是继续等？",
    disclosure: "互动选择｜不含价格预测",
  },
] as const;

export const XIAOMI_ORIGINAL_EDITORIAL_DURATION_IN_FRAMES = 1245;
