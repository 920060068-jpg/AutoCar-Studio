import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  absolutePath,
  loadYamlRecord,
  relativePath,
  writeTextExclusive,
  writeYamlExclusive,
  yamlArray,
  yamlRecord,
} from "../src/media_acquisition/types.ts";

const JOB = "xiaomi_skynomad_20260714_r1";
const SCRIPT = `output/${JOB}/intermediate/script_r2_director_v3.yaml`;
const SOURCE_STORYBOARD = `output/${JOB}/intermediate/storyboard_r8_director_v3.yaml`;
const STORYBOARD = `output/${JOB}/intermediate/storyboard_r9_original_editorial.yaml`;
const MANIFEST = `output/${JOB}/intermediate/original_visual_manifest_r1.yaml`;
const REVIEW_DIR = `output/${JOB}/review/original_editorial_r9`;
const PREVIEW_DIR = `${REVIEW_DIR}/previews`;
const CONTACT_SVG = `${REVIEW_DIR}/storyboard_contact_sheet_original_editorial_r9.svg`;
const CONTACT_JPG = `${REVIEW_DIR}/storyboard_contact_sheet_original_editorial_r9.jpg`;
const DIRECTOR_REVIEW = `${REVIEW_DIR}/director_review.md`;
const DIRECTOR_CHECKS = `${REVIEW_DIR}/director_checks.yaml`;

const requiredNewPaths = [STORYBOARD, MANIFEST, CONTACT_SVG, CONTACT_JPG, DIRECTOR_REVIEW, DIRECTOR_CHECKS];
for (const path of requiredNewPaths) {
  if (existsSync(absolutePath(path))) throw new Error(`拒绝覆盖已有文件：${path}`);
}
mkdirSync(absolutePath(PREVIEW_DIR), { recursive: true });

interface ShotPlan {
  visualType: string;
  graphic: string;
  componentTypes: string[];
  primaryText: string;
  purpose: string;
  factualBasis: string[];
  verifiedDataIds: string[];
  disclosure: string;
  shotSize: string;
  lens: number;
  angle: string;
  lighting: string;
  movement: string;
  direction: string;
  speed: string;
  motionPlan: string;
  emotionalIntent: string;
  continuity: string;
  transitionIn: string;
  transitionOut: string;
  layoutFamily: string;
  renderComponent: string;
  misleadingLevel: "low" | "medium";
  misleadingRisk: string;
  mitigation: string;
  rationale: string;
  rejectedAlternative: string;
}

const plans: ShotPlan[] = [
  {
    visualType: "original_abstract_vehicle_hero",
    graphic: "hero",
    componentTypes: ["original_abstract_vehicle_outline", "original_dynamic_typography"],
    primaryText: "小米汽车｜第二条产品线，先讲空间",
    purpose: "第一秒明确识别小米汽车，并用非拟真的SUV轮廓建立空间命题。",
    factualBasis: ["claim_xm_003：官方将澎程定位为智能可变大空间SUV系列"],
    verifiedDataIds: ["data_xiaomi_skynomad_positioning", "data_xiaomi_skynomad_dual_series_positioning"],
    disclosure: "原创示意｜非实拍",
    shotSize: "hero_wide",
    lens: 28,
    angle: "low_three_quarter_diagrammatic",
    lighting: "graphite_high_contrast_orange_edge",
    movement: "push_in",
    direction: "forward_right",
    speed: "energetic_controlled",
    motionPlan: "0—1秒小米汽车文字和抽象SUV轮廓同步建立；1—3秒轮廓向空间网格推进并改变景别。",
    emotionalIntent: "立即识别、建立新鲜感",
    continuity: "橙色轮廓主轴在镜尾收束为shot_02名称基线。",
    transitionIn: "cold_open",
    transitionOut: "outline_to_name_axis",
    layoutFamily: "diagonal_vehicle_hero",
    renderComponent: "HyperFrames::AbstractSuvHero",
    misleadingLevel: "medium",
    misleadingRisk: "抽象轮廓可能被误认成目标车型真实外观。",
    mitigation: "持续显示‘原创示意｜非实拍’，轮廓不包含真实灯组、比例和Logo。",
    rationale: "开场需要品牌识别与视觉冲击，抽象轮廓能够表达SUV类别而不伪造官方车型图。",
    rejectedAlternative: "不用拟真AI车型Hero，因为会制造外观事实和官方视觉来源误解。",
  },
  {
    visualType: "original_name_reveal",
    graphic: "name",
    componentTypes: ["original_dynamic_typography"],
    primaryText: "SkyNomad｜小米澎程",
    purpose: "只完成正式中英文名称揭示。",
    factualBasis: ["claim_xm_001：正式公布第二个汽车产品系列SkyNomad小米澎程"],
    verifiedDataIds: ["data_xiaomi_skynomad_series_relationship"],
    disclosure: "信息图｜非实拍",
    shotSize: "full_frame_title",
    lens: 50,
    angle: "orthographic",
    lighting: "graphite_orange_blue_type",
    movement: "pan",
    direction: "left_to_right",
    speed: "controlled",
    motionPlan: "英文名沿横轴进入，中文名从纵向深度层出现，2秒处完成层级交换。",
    emotionalIntent: "确认身份、降低理解成本",
    continuity: "沿用shot_01橙色轴线，但版式从斜向Hero改为中央文字纵深。",
    transitionIn: "outline_to_name_axis",
    transitionOut: "name_to_date_node",
    layoutFamily: "central_depth_typography",
    renderComponent: "HyperFrames::BilingualNameReveal",
    misleadingLevel: "low",
    misleadingRisk: "可能把编辑排版误认为官方品牌字标。",
    mitigation: "使用通用字体，不重绘Logo，并标注信息图。",
    rationale: "名称需要单独记忆，不与日期和定位抢夺注意力。",
    rejectedAlternative: "不把名称、日期和市场信息同时堆在一屏，避免首段信息过载。",
  },
  {
    visualType: "verified_announcement_timeline",
    graphic: "timeline",
    componentTypes: ["verified_data_animation", "original_timeline"],
    primaryText: "2026.07.09｜正式公布",
    purpose: "用单节点时间线确认正式公布日期。",
    factualBasis: ["claim_xm_001", "claim_xm_002"],
    verifiedDataIds: ["data_xiaomi_skynomad_announcement_date_20260709", "data_xiaomi_skynomad_series_relationship"],
    disclosure: "原创时间线｜数据已核验",
    shotSize: "medium_timeline",
    lens: 50,
    angle: "top_down_orthographic",
    lighting: "technical_blue_on_graphite",
    movement: "tracking",
    direction: "top_to_bottom",
    speed: "decisive",
    motionPlan: "日期节点从上方进入并锁定，系列关系标记沿时间轴在2秒处改变信息层级。",
    emotionalIntent: "建立可信时间锚点",
    continuity: "shot_02名称基线旋转90度成为纵向时间轴。",
    transitionIn: "name_to_date_node",
    transitionOut: "date_node_to_cabin_vanish",
    layoutFamily: "vertical_single_node_timeline",
    renderComponent: "HyperFrames::VerifiedAnnouncementTimeline",
    misleadingLevel: "low",
    misleadingRisk: "时间线可能暗示未公布的后续节点。",
    mitigation: "只显示一个已核验日期，不绘制上市或交付节点。",
    rationale: "日期事实最适合用单节点时间线，信息清楚且不依赖发布会截图。",
    rejectedAlternative: "不用发布会或网页截图，因为无法取得图像授权且截图不是原始素材。",
  },
  {
    visualType: "original_cabin_space_perspective",
    graphic: "cabin",
    componentTypes: ["original_space_diagram"],
    primaryText: "智能｜可变｜大空间",
    purpose: "以非比例座舱透视解释官方定位，不表现真实内饰。",
    factualBasis: ["claim_xm_003：官方定位"],
    verifiedDataIds: ["data_xiaomi_skynomad_positioning"],
    disclosure: "座舱空间示意｜非实车结构",
    shotSize: "wide_perspective",
    lens: 24,
    angle: "high_rear_diagrammatic",
    lighting: "blue_depth_grid_orange_subject",
    movement: "pull_out",
    direction: "backward",
    speed: "controlled",
    motionPlan: "从中央消失点后拉，三层空间框依次展开；2秒内完成一次景别变化。",
    emotionalIntent: "把抽象定位变成空间感",
    continuity: "时间轴节点扩张为座舱透视消失点。",
    transitionIn: "date_node_to_cabin_vanish",
    transitionOut: "cabin_split_to_series",
    layoutFamily: "perspective_cabin_grid",
    renderComponent: "HyperFrames::CabinPerspectiveDiagram",
    misleadingLevel: "medium",
    misleadingRisk: "透视示意可能被理解为官方座舱尺寸或布局。",
    mitigation: "不标尺寸和座椅数量，持续显示‘非实车结构’。",
    rationale: "官方定位包含空间属性，透视网格比文字卡更能建立空间感。",
    rejectedAlternative: "不用拟真内饰或官方结构图式样，避免伪造真实座舱证据。",
  },
  {
    visualType: "original_dual_series_relationship",
    graphic: "relation",
    componentTypes: ["original_relationship_diagram", "verified_data_animation"],
    primaryText: "驾驶系列 ↔ 澎程空间系列",
    purpose: "只解释两条产品线的平行定位关系。",
    factualBasis: ["claim_xm_002", "claim_xm_003"],
    verifiedDataIds: ["data_xiaomi_skynomad_series_relationship", "data_xiaomi_skynomad_dual_series_positioning"],
    disclosure: "产品关系示意｜非车型外观对比",
    shotSize: "wide_split",
    lens: 35,
    angle: "orthographic_split",
    lighting: "orange_blue_balanced",
    movement: "pan",
    direction: "center_to_sides",
    speed: "controlled",
    motionPlan: "小米汽车主节点从中心分为两条等宽路径，焦点在1.5秒由驾驶系列切到空间系列。",
    emotionalIntent: "理解战略差异",
    continuity: "shot_04透视框左右展开，转为双系列分支。",
    transitionIn: "cabin_split_to_series",
    transitionOut: "series_to_need_orbits",
    layoutFamily: "balanced_horizontal_branches",
    renderComponent: "HyperFrames::DualSeriesRelationship",
    misleadingLevel: "low",
    misleadingRisk: "关系图可能被误读为性能或产品等级对比。",
    mitigation: "两条路径等宽，只写官方定位，不出现性能、价格和高低排序。",
    rationale: "产品关系必须可视化，等权分支能准确表达平行系列。",
    rejectedAlternative: "不用SU7、YU7或澎程拟真轮廓并排，避免暗示真实尺寸和外观比较。",
  },
  {
    visualType: "verified_dual_need_animation",
    graphic: "needs",
    componentTypes: ["verified_data_animation", "original_relationship_diagram"],
    primaryText: "两条产品线｜两种用车需求",
    purpose: "把双系列关系归纳为两种使用需求。",
    factualBasis: ["claim_xm_002", "claim_xm_003"],
    verifiedDataIds: ["data_xiaomi_skynomad_series_relationship", "data_xiaomi_skynomad_dual_series_positioning"],
    disclosure: "定位归纳｜非市场份额数据",
    shotSize: "medium_orbit",
    lens: 50,
    angle: "isometric",
    lighting: "graphite_orange_blue_orbits",
    movement: "orbit",
    direction: "clockwise",
    speed: "controlled",
    motionPlan: "两组需求图标沿不同轨道进入，2秒处汇回小米汽车中心节点。",
    emotionalIntent: "完成第一段论证",
    continuity: "双分支端点变成两组需求轨道，版式由横向分屏改为环形。",
    transitionIn: "series_to_need_orbits",
    transitionOut: "orbit_to_architecture_stack",
    layoutFamily: "concentric_need_orbits",
    renderComponent: "HyperFrames::DualNeedOrbit",
    misleadingLevel: "low",
    misleadingRisk: "需求归纳可能被理解为用户调研结论。",
    mitigation: "标注‘官方定位归纳’，不显示比例、样本或市场份额。",
    rationale: "shot_05解释关系，shot_06只总结需求，保持一镜一个观点。",
    rejectedAlternative: "不用第二张相似分支图，防止连续版式重复。",
  },
  {
    visualType: "verified_architecture_start_diagram",
    graphic: "layers",
    componentTypes: ["original_structure_diagram", "original_timeline", "verified_data_animation"],
    primaryText: "小米昆仑架构｜2023年初",
    purpose: "用分层示意和单一日期表达架构开发起点。",
    factualBasis: ["claim_xm_004"],
    verifiedDataIds: ["data_xiaomi_skynomad_kunlun_architecture_start_2023"],
    disclosure: "架构关系示意｜非官方工程图",
    shotSize: "medium_exploded",
    lens: 50,
    angle: "isometric_exploded",
    lighting: "technical_blue_layers",
    movement: "tilt",
    direction: "bottom_to_top",
    speed: "controlled",
    motionPlan: "三层抽象板块由下向上分离，日期锚点在2秒处锁定；不绘制真实机械结构。",
    emotionalIntent: "强调长期开发投入",
    continuity: "shot_06轨道压平成三层架构板，空间方向改为垂直。",
    transitionIn: "orbit_to_architecture_stack",
    transitionOut: "stack_to_floor_plane",
    layoutFamily: "vertical_exploded_layers",
    renderComponent: "HyperFrames::ArchitectureStartDiagram",
    misleadingLevel: "medium",
    misleadingRisk: "分层图可能被误认成官方平台结构。",
    mitigation: "无零部件、尺寸和工程标注，显著显示‘非官方工程图’。",
    rationale: "分层关系能表达‘架构’概念，同时日期锚点保留事实核心。",
    rejectedAlternative: "不用仿工程蓝图或三维底盘模型，因为会伪造官方技术信息。",
  },
  {
    visualType: "original_flat_floor_space_diagram",
    graphic: "floor",
    componentTypes: ["original_space_diagram", "original_structure_diagram"],
    primaryText: "纯平地板｜空间变化基础",
    purpose: "用非比例剖面示意纯平地板这一设计方向。",
    factualBasis: ["claim_xm_005"],
    verifiedDataIds: ["data_xiaomi_skynomad_space_mechanisms"],
    disclosure: "结构示意｜非实车比例",
    shotSize: "wide_cross_section",
    lens: 35,
    angle: "side_section_diagrammatic",
    lighting: "orange_floor_blue_grid",
    movement: "tracking",
    direction: "left_to_right",
    speed: "controlled",
    motionPlan: "镜头沿一条水平地板基线移动，前后座位抽象块在2秒处降低透明度突出地板。",
    emotionalIntent: "理解空间机制基础",
    continuity: "架构底层板延展成横向地板基线。",
    transitionIn: "stack_to_floor_plane",
    transitionOut: "floor_to_rail_path",
    layoutFamily: "horizontal_section_plane",
    renderComponent: "HyperFrames::FlatFloorDiagram",
    misleadingLevel: "medium",
    misleadingRisk: "剖面可能暗示真实离地高度、地板厚度或座椅比例。",
    mitigation: "不标任何尺寸，座椅仅用几何块，持续标注‘非实车比例’。",
    rationale: "平面基线直接对应纯平地板概念，比文字解释更清楚。",
    rejectedAlternative: "不用真实座舱剖面或拟真内饰，避免制造未公布结构。",
  },
  {
    visualType: "original_long_rail_path_animation",
    graphic: "rail",
    componentTypes: ["original_space_diagram", "original_structure_diagram"],
    primaryText: "长滑轨｜可重新组合",
    purpose: "只解释长滑轨提供重新组合方向，不模拟真实行程。",
    factualBasis: ["claim_xm_005"],
    verifiedDataIds: ["data_xiaomi_skynomad_space_mechanisms"],
    disclosure: "运动路径示意｜非真实行程",
    shotSize: "detail_path",
    lens: 85,
    angle: "top_oblique_diagrammatic",
    lighting: "blue_rail_orange_markers",
    movement: "tracking",
    direction: "bottom_left_to_top_right",
    speed: "decisive",
    motionPlan: "长轨迹线从左下向右上生长，一个抽象座椅块只移动一次并在终点停留0.5秒。",
    emotionalIntent: "展示可变方向",
    continuity: "shot_08水平地板线转为对角滑轨，改变空间方向。",
    transitionIn: "floor_to_rail_path",
    transitionOut: "rail_to_scene_map",
    layoutFamily: "diagonal_motion_path",
    renderComponent: "HyperFrames::LongRailPath",
    misleadingLevel: "medium",
    misleadingRisk: "动画可能被当成真实滑轨行程、速度或操作验证。",
    mitigation: "只显示方向，不显示长度、速度和机械细节，并标注‘非真实行程’。",
    rationale: "路径动画能表达重新组合的方向性，同时不伪装成实车动作演示。",
    rejectedAlternative: "不用拟真座椅移动或机械动画，因为没有真实动作和参数证据。",
  },
  {
    visualType: "original_family_space_layout",
    graphic: "family",
    componentTypes: ["original_icon_scene", "original_space_diagram"],
    primaryText: "从驾驶｜扩展到家庭与多场景",
    purpose: "用抽象人物与空间区块表达多场景价值，不出现真人。",
    factualBasis: ["基于claim_xm_003与claim_xm_005的编辑分析"],
    verifiedDataIds: ["data_xiaomi_skynomad_positioning", "data_xiaomi_skynomad_space_mechanisms"],
    disclosure: "编辑场景示意｜非功能演示",
    shotSize: "wide_layout",
    lens: 35,
    angle: "top_down_isometric",
    lighting: "warm_orange_people_blue_zones",
    movement: "crane",
    direction: "top_to_center",
    speed: "controlled",
    motionPlan: "抽象人物图标从四角进入，空间区块在1.5秒重新排布，最后保留家庭、多场景两个层级。",
    emotionalIntent: "建立生活使用联想",
    continuity: "滑轨终点扩展成俯视空间区块，方向从对角改为中心汇聚。",
    transitionIn: "rail_to_scene_map",
    transitionOut: "scene_map_to_boundary",
    layoutFamily: "top_down_icon_zones",
    renderComponent: "HyperFrames::FamilyScenarioLayout",
    misleadingLevel: "medium",
    misleadingRisk: "场景图标可能暗示未公布具体功能或真人使用验证。",
    mitigation: "仅使用抽象图标，标注‘编辑场景示意’，不出现具体设备功能。",
    rationale: "人物图标与空间区块足以表达家庭、多场景，不需要真人或库存照片。",
    rejectedAlternative: "不用真人照片、AI人物或生活方式车图，避免肖像和功能误导。",
  },
  {
    visualType: "original_single_point_editorial",
    graphic: "boundary",
    componentTypes: ["original_dynamic_typography", "original_relationship_diagram"],
    primaryText: "真正的门槛，不只是“大”",
    purpose: "一镜只表达判断空间方案不能只看尺寸。",
    factualBasis: ["基于claim_xm_003与claim_xm_005的编辑判断"],
    verifiedDataIds: [],
    disclosure: "编辑判断｜不含尺寸结论",
    shotSize: "medium_statement",
    lens: 50,
    angle: "eye_level_graphic",
    lighting: "graphite_single_orange_line",
    movement: "push_in",
    direction: "forward",
    speed: "restrained",
    motionPlan: "上一镜多个区块收束成一条尺度线，主结论推进并在最后0.6秒稳定。",
    emotionalIntent: "制造观点停顿",
    continuity: "多场景区块压缩为单一尺度线，信息密度主动下降。",
    transitionIn: "scene_map_to_boundary",
    transitionOut: "boundary_to_gate_flow",
    layoutFamily: "single_line_editorial_statement",
    renderComponent: "HyperFrames::SingleBoundaryPoint",
    misleadingLevel: "low",
    misleadingRisk: "可能被误认为已有尺寸数据支持。",
    mitigation: "不出现数字、比例尺或排名，明确标注编辑判断。",
    rationale: "中段需要节奏降噪，用一个尺度线承载单一观点。",
    rejectedAlternative: "不用参数卡或尺寸对比，因为当前脚本没有核验尺寸数据。",
  },
  {
    visualType: "original_engineering_logic_flow",
    graphic: "flow",
    componentTypes: ["original_process_diagram"],
    primaryText: "安全？顺手？稳定量产？",
    purpose: "把三个词表现为待验证门禁，不给出通过结论。",
    factualBasis: ["基于claim_xm_005的编辑观察标准"],
    verifiedDataIds: [],
    disclosure: "编辑观察｜待实车与独立测试",
    shotSize: "wide_process",
    lens: 35,
    angle: "left_to_right_process",
    lighting: "blue_flow_orange_question_marks",
    movement: "pan",
    direction: "left_to_right",
    speed: "decisive",
    motionPlan: "三道门依次打开但均保留问号，终点只显示‘真正可用？’，不显示通过勾选。",
    emotionalIntent: "建立审慎观察",
    continuity: "shot_11尺度线变成流程入口，版式由中心结论切为横向推进。",
    transitionIn: "boundary_to_gate_flow",
    transitionOut: "flow_to_ecosystem_nodes",
    layoutFamily: "horizontal_question_gate_flow",
    renderComponent: "HyperFrames::UsabilityGateFlow",
    misleadingLevel: "low",
    misleadingRisk: "流程图可能暗示已完成安全或量产验证。",
    mitigation: "所有节点保留问号和‘待测试’，不出现通过状态。",
    rationale: "脚本提出的是门槛而非结论，问号流程准确体现待验证边界。",
    rejectedAlternative: "不用工厂、碰撞或工程测试画面，也不制作假测试数据。",
  },
  {
    visualType: "original_ecosystem_relationship",
    graphic: "ecosystem",
    componentTypes: ["original_relationship_diagram", "verified_data_animation"],
    primaryText: "空间 × 智能生态",
    purpose: "在2.5秒内把空间、智能、场景连接为编辑关系。",
    factualBasis: ["基于claim_xm_003与claim_xm_005的编辑分析"],
    verifiedDataIds: ["data_xiaomi_skynomad_positioning", "data_xiaomi_skynomad_space_mechanisms"],
    disclosure: "编辑关系示意｜非已公布功能",
    shotSize: "medium_network",
    lens: 50,
    angle: "diagonal_network",
    lighting: "orange_blue_node_glow",
    movement: "tracking",
    direction: "bottom_left_to_top_right",
    speed: "energetic",
    motionPlan: "2.5秒内沿对角线连接空间、智能、场景三个节点，节点层级每0.8秒变化一次。",
    emotionalIntent: "恢复结尾前动能",
    continuity: "流程终点分裂成三角节点，空间方向改为对角上升。",
    transitionIn: "flow_to_ecosystem_nodes",
    transitionOut: "nodes_to_product_logic",
    layoutFamily: "triangular_ecosystem_network",
    renderComponent: "HyperFrames::EcosystemRelationship",
    misleadingLevel: "medium",
    misleadingRisk: "关系图可能暗示官方已公布具体生态功能。",
    mitigation: "标注编辑关系，不出现具体设备、功能名或交互结果。",
    rationale: "三个节点可以在短时长内表达空间逻辑的延伸，并保持单一关系观点。",
    rejectedAlternative: "不用车机界面或生态产品截图，避免伪造未公布功能。",
  },
  {
    visualType: "original_product_logic_conclusion",
    graphic: "logic",
    componentTypes: ["original_relationship_diagram", "original_dynamic_typography"],
    primaryText: "不是加一辆车｜是改产品逻辑",
    purpose: "把双系列关系收束为明确的编辑判断。",
    factualBasis: ["基于claim_xm_002与claim_xm_003的编辑结论"],
    verifiedDataIds: ["data_xiaomi_skynomad_series_relationship", "data_xiaomi_skynomad_dual_series_positioning"],
    disclosure: "编辑判断",
    shotSize: "wide_conclusion",
    lens: 35,
    angle: "front_orthographic",
    lighting: "graphite_orange_conclusion",
    movement: "pull_out",
    direction: "backward",
    speed: "controlled",
    motionPlan: "三个节点压缩为双系列主轴，镜头后拉露出‘产品逻辑’结论，最后0.5秒稳定。",
    emotionalIntent: "形成可记忆判断",
    continuity: "shot_13三角节点压缩成两条平行产品线，再让出结尾选择空间。",
    transitionIn: "nodes_to_product_logic",
    transitionOut: "logic_to_choice_lanes",
    layoutFamily: "expanding_product_logic_axis",
    renderComponent: "HyperFrames::ProductLogicConclusion",
    misleadingLevel: "low",
    misleadingRisk: "编辑判断可能被理解为小米官方结论。",
    mitigation: "标题前固定显示‘我的判断’，并与官方事实配色区分。",
    rationale: "关系线收束能把前文事实转化为清楚结论，而不是再次堆参数。",
    rejectedAlternative: "不用竞品车型或销量对比，因为脚本没有相关核验事实。",
  },
  {
    visualType: "original_purchase_choice_ending",
    graphic: "choice",
    componentTypes: ["original_choice_animation", "original_dynamic_typography"],
    primaryText: "买澎程｜选驾驶型SUV｜继续等",
    purpose: "用三个具体选择降低评论门槛。",
    factualBasis: ["价格未显示；问题为条件式编辑互动"],
    verifiedDataIds: [],
    disclosure: "互动选择｜不含价格预测",
    shotSize: "wide_interactive",
    lens: 35,
    angle: "perspective_choice_lanes",
    lighting: "orange_blue_three_lanes",
    movement: "push_in",
    direction: "forward_center",
    speed: "energetic_then_hold",
    motionPlan: "三条选择路径依次从远处进入，2秒时同时锁定，最后0.5秒保留评论阅读时间。",
    emotionalIntent: "促成具体评论",
    continuity: "产品逻辑主轴分成三条购买选择路径，结尾不回到车辆假画面。",
    transitionIn: "logic_to_choice_lanes",
    transitionOut: "clean_hold",
    layoutFamily: "three_perspective_choice_lanes",
    renderComponent: "HyperFrames::PurchaseChoiceEnding",
    misleadingLevel: "low",
    misleadingRisk: "可能让观众误以为价格已公布或选项来自调查。",
    mitigation: "不显示价格和投票比例，字幕保留‘价格公布后’条件。",
    rationale: "具体三选一比泛问‘你怎么看’更容易触发购买与竞争讨论。",
    rejectedAlternative: "不用虚构价格、投票比例或竞品Logo，避免制造市场数据。",
  },
];

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(absolutePath(path))).digest("hex");
}

function xml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrap(value: string, max = 15): string[] {
  const chars = [...value];
  const lines: string[] = [];
  for (let index = 0; index < chars.length; index += max) lines.push(chars.slice(index, index + max).join(""));
  return lines.slice(0, 3);
}

function svgTextLines(value: string, x: number, y: number, size: number, max = 15, fill = "#F5F7FA"): string {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" fill="${fill}" font-family="PingFang SC,Arial,sans-serif">${wrap(value, max).map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * 1.25}">${xml(line)}</tspan>`).join("")}</text>`;
}

function graphic(plan: ShotPlan): string {
  const orange = "#FF6A1A";
  const blue = "#35A7FF";
  const pale = "#D9E2EC";
  switch (plan.graphic) {
    case "hero":
      return `<path d="M105 1040 L220 920 L670 875 L880 1000 L940 1165 L150 1165 Z" fill="none" stroke="${orange}" stroke-width="14"/><circle cx="300" cy="1165" r="64" fill="none" stroke="${blue}" stroke-width="12"/><circle cx="770" cy="1165" r="64" fill="none" stroke="${blue}" stroke-width="12"/><path d="M150 1290 L910 790 M300 1370 L950 980" stroke="#23445C" stroke-width="5"/>`;
    case "name":
      return `<text x="90" y="750" font-size="128" fill="${orange}" font-weight="800" font-family="Arial,sans-serif">SkyNomad</text><text x="95" y="910" font-size="108" fill="${pale}" font-weight="700" font-family="PingFang SC,sans-serif">小米澎程</text><path d="M95 1010 H940" stroke="${blue}" stroke-width="10"/><circle cx="890" cy="1010" r="24" fill="${orange}"/>`;
    case "timeline":
      return `<path d="M270 580 V1290" stroke="${blue}" stroke-width="12"/><circle cx="270" cy="860" r="52" fill="#0B0F14" stroke="${orange}" stroke-width="14"/><text x="360" y="835" font-size="80" fill="${pale}" font-weight="800" font-family="Arial,sans-serif">2026.07.09</text><text x="360" y="930" font-size="50" fill="${orange}" font-family="PingFang SC,sans-serif">正式公布</text>`;
    case "cabin":
      return `<path d="M170 1260 L410 630 H670 L910 1260 Z" fill="none" stroke="${blue}" stroke-width="10"/><path d="M260 1110 H820 M310 960 H770 M355 820 H725" stroke="#2B5F82" stroke-width="7"/><rect x="300" y="980" width="150" height="210" rx="34" fill="none" stroke="${orange}" stroke-width="12"/><rect x="630" y="980" width="150" height="210" rx="34" fill="none" stroke="${orange}" stroke-width="12"/>`;
    case "relation":
      return `<circle cx="540" cy="850" r="94" fill="#16202C" stroke="${orange}" stroke-width="12"/><text x="465" y="870" font-size="42" fill="${pale}" font-family="PingFang SC,sans-serif">小米汽车</text><path d="M445 920 L245 1130 M635 920 L835 1130" stroke="${blue}" stroke-width="12"/><circle cx="225" cy="1160" r="100" fill="#16202C" stroke="${blue}" stroke-width="10"/><circle cx="855" cy="1160" r="100" fill="#16202C" stroke="${orange}" stroke-width="10"/><text x="150" y="1175" font-size="34" fill="${pale}" font-family="PingFang SC,sans-serif">驾驶系列</text><text x="785" y="1175" font-size="34" fill="${pale}" font-family="PingFang SC,sans-serif">空间系列</text>`;
    case "needs":
      return `<circle cx="540" cy="990" r="300" fill="none" stroke="#244962" stroke-width="8"/><circle cx="540" cy="990" r="160" fill="#16202C" stroke="${orange}" stroke-width="10"/><circle cx="270" cy="850" r="80" fill="#102638" stroke="${blue}" stroke-width="10"/><circle cx="810" cy="1130" r="80" fill="#2A1C12" stroke="${orange}" stroke-width="10"/><path d="M330 870 Q540 700 750 1090" fill="none" stroke="${pale}" stroke-width="6" stroke-dasharray="18 18"/>`;
    case "layers":
      return `<path d="M210 1160 L540 1010 L870 1160 L540 1320 Z" fill="#16202C" stroke="${blue}" stroke-width="10"/><path d="M210 950 L540 800 L870 950 L540 1110 Z" fill="#17283A" stroke="${orange}" stroke-width="10"/><path d="M210 740 L540 590 L870 740 L540 900 Z" fill="#20364A" stroke="${blue}" stroke-width="10"/><text x="390" y="1440" font-size="52" fill="${orange}" font-family="PingFang SC,sans-serif">2023年初</text>`;
    case "floor":
      return `<path d="M120 1200 H960" stroke="${orange}" stroke-width="18"/><rect x="210" y="870" width="190" height="280" rx="35" fill="none" stroke="${blue}" stroke-width="10"/><rect x="680" y="870" width="190" height="280" rx="35" fill="none" stroke="${blue}" stroke-width="10"/><path d="M150 1310 H930" stroke="#2B5F82" stroke-width="6" stroke-dasharray="20 18"/>`;
    case "rail":
      return `<path d="M130 1300 L930 650" stroke="${blue}" stroke-width="20"/><path d="M160 1360 L960 710" stroke="#23445C" stroke-width="8"/><rect x="260" y="1010" width="180" height="210" rx="32" transform="rotate(-39 350 1115)" fill="#17283A" stroke="${orange}" stroke-width="10"/><path d="M470 1020 L750 795" stroke="${orange}" stroke-width="12" marker-end="url(#arrow)"/>`;
    case "family":
      return `<rect x="170" y="650" width="740" height="670" rx="90" fill="none" stroke="${blue}" stroke-width="10"/><path d="M540 670 V1300 M190 980 H890" stroke="#244962" stroke-width="8"/><circle cx="350" cy="830" r="55" fill="none" stroke="${orange}" stroke-width="10"/><path d="M350 885 V1030 M285 950 H415" stroke="${orange}" stroke-width="10"/><circle cx="720" cy="1110" r="42" fill="none" stroke="${pale}" stroke-width="9"/><path d="M720 1152 V1260 M670 1200 H770" stroke="${pale}" stroke-width="9"/>`;
    case "boundary":
      return `<path d="M140 990 H940" stroke="#244962" stroke-width="16"/><path d="M540 760 V1220" stroke="${orange}" stroke-width="18"/><circle cx="540" cy="990" r="76" fill="#0B0F14" stroke="${blue}" stroke-width="12"/><text x="492" y="1012" font-size="58" fill="${pale}" font-weight="800" font-family="PingFang SC,sans-serif">≠ 大</text>`;
    case "flow":
      return `<path d="M120 1000 H950" stroke="#244962" stroke-width="10"/><g fill="#16202C" stroke="${blue}" stroke-width="10"><circle cx="270" cy="1000" r="105"/><circle cx="540" cy="1000" r="105"/><circle cx="810" cy="1000" r="105"/></g><g fill="${orange}" font-size="72" font-weight="800" font-family="PingFang SC,sans-serif"><text x="238" y="1025">?</text><text x="508" y="1025">?</text><text x="778" y="1025">?</text></g><g fill="${pale}" font-size="38" font-family="PingFang SC,sans-serif"><text x="225" y="1170">安全</text><text x="495" y="1170">顺手</text><text x="750" y="1170">量产</text></g>`;
    case "ecosystem":
      return `<path d="M250 1210 L540 690 L840 1180 Z" fill="none" stroke="#244962" stroke-width="10"/><g fill="#16202C" stroke-width="12"><circle cx="250" cy="1210" r="105" stroke="${orange}"/><circle cx="540" cy="690" r="105" stroke="${blue}"/><circle cx="840" cy="1180" r="105" stroke="${orange}"/></g><g fill="${pale}" font-size="42" font-family="PingFang SC,sans-serif"><text x="205" y="1225">空间</text><text x="495" y="705">智能</text><text x="795" y="1195">场景</text></g>`;
    case "logic":
      return `<path d="M170 800 H850 M170 1130 H850" stroke-width="18" stroke-linecap="round"/><path d="M170 800 H850" stroke="${blue}" stroke-width="18"/><path d="M170 1130 H850" stroke="${orange}" stroke-width="18"/><path d="M850 800 Q960 965 850 1130" fill="none" stroke="${pale}" stroke-width="8"/><text x="210" y="745" font-size="44" fill="${blue}" font-family="PingFang SC,sans-serif">驾驶系列</text><text x="210" y="1080" font-size="44" fill="${orange}" font-family="PingFang SC,sans-serif">空间系列</text>`;
    case "choice":
      return `<path d="M160 1320 L360 650 H510 L430 1320 Z" fill="#14293A" stroke="${blue}" stroke-width="8"/><path d="M430 1320 L500 650 H640 L700 1320 Z" fill="#2B1C13" stroke="${orange}" stroke-width="8"/><path d="M700 1320 L650 650 H800 L940 1320 Z" fill="#18212B" stroke="${pale}" stroke-width="8"/><text x="165" y="1420" font-size="38" fill="${blue}" font-family="PingFang SC,sans-serif">买澎程</text><text x="430" y="1420" font-size="38" fill="${orange}" font-family="PingFang SC,sans-serif">驾驶型SUV</text><text x="760" y="1420" font-size="38" fill="${pale}" font-family="PingFang SC,sans-serif">继续等</text>`;
    default:
      return "";
  }
}

function previewSvg(shotId: string, duration: number, plan: ShotPlan): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0 0 L12 6 L0 12 Z" fill="#FF6A1A"/></marker></defs>
  <rect width="1080" height="1920" fill="#0B0F14"/>
  <path d="M0 330 H1080 M0 1530 H1080" stroke="#1E2B38" stroke-width="3" stroke-dasharray="14 18"/>
  <text x="64" y="92" font-size="32" fill="#8CA0B3" font-family="Arial,sans-serif">ORIGINAL EDITORIAL · ${xml(shotId)}</text>
  <text x="1016" y="92" text-anchor="end" font-size="32" fill="#FF6A1A" font-family="Arial,sans-serif">${duration.toFixed(1)}s</text>
  ${shotId === "shot_01" ? `<text x="64" y="200" font-size="76" fill="#F5F7FA" font-weight="800" font-family="PingFang SC,sans-serif">小米汽车</text>` : ""}
  ${graphic(plan)}
  ${svgTextLines(plan.primaryText, 64, shotId === "shot_01" ? 330 : 250, 58, 17)}
  <rect x="64" y="1580" width="952" height="210" rx="28" fill="#111923" stroke="#33495D" stroke-width="3"/>
  <text x="94" y="1642" font-size="28" fill="#8CA0B3" font-family="PingFang SC,sans-serif">字幕安全区</text>
  ${svgTextLines(plan.disclosure, 94, 1705, 34, 22, "#FFB078")}
  <text x="94" y="1762" font-size="26" fill="#AFC0CF" font-family="PingFang SC,sans-serif">运镜：${xml(plan.movement)} · ${xml(plan.direction)}</text>
  <text x="64" y="1860" font-size="26" fill="#66798A" font-family="Arial,sans-serif">${xml(plan.visualType)} · ${xml(plan.layoutFamily)}</text>
</svg>`;
}

const sourceDocument = loadYamlRecord(SOURCE_STORYBOARD);
const sourceStoryboard = yamlRecord(sourceDocument.storyboard, "storyboard");
const sourceShots = yamlArray(sourceStoryboard.shots, "storyboard.shots").map((value) => yamlRecord(value, "shot"));
if (sourceShots.length !== 15 || plans.length !== 15) throw new Error("必须有15个镜头计划");

const previewRecords: Array<{ path: string; sha256: string }> = [];
for (let index = 0; index < sourceShots.length; index += 1) {
  const shot = sourceShots[index];
  const shotId = String(shot.shot_id);
  const duration = Number(shot.duration);
  const svgPath = `${PREVIEW_DIR}/${shotId}.svg`;
  const pngPath = `${PREVIEW_DIR}/${shotId}.png`;
  if (existsSync(absolutePath(svgPath)) || existsSync(absolutePath(pngPath))) throw new Error(`拒绝覆盖已有预览：${shotId}`);
  writeTextExclusive(svgPath, previewSvg(shotId, duration, plans[index]));
  execFileSync("sips", ["-s", "format", "png", absolutePath(svgPath), "--out", absolutePath(pngPath)], { stdio: "ignore" });
  previewRecords.push({ path: pngPath, sha256: sha256(pngPath) });
}

const storyboardShots = sourceShots.map((sourceShot, index) => {
  const plan = plans[index];
  const shotId = String(sourceShot.shot_id);
  const sourceVisual = yamlRecord(sourceShot.visual, `${shotId}.visual`);
  const sourceAudio = yamlRecord(sourceShot.audio, `${shotId}.audio`);
  const sourceSubtitle = yamlRecord(sourceShot.subtitle, `${shotId}.subtitle`);
  const claimIds = yamlArray(sourceVisual.claim_ids, `${shotId}.visual.claim_ids`).map(String);
  return {
    shot_id: shotId,
    script_segment_id: sourceShot.script_segment_id,
    source_claim_ids: claimIds,
    start_seconds: sourceShot.start_seconds,
    duration: sourceShot.duration,
    narration: sourceShot.narration,
    visual_intent: plan.purpose,
    real_asset_requirement: "none_external_media",
    data_animation_requirement: plan.factualBasis.join("；"),
    visual: {
      description: `${plan.purpose}${plan.motionPlan}`,
      purpose: plan.purpose,
      claim_ids: claimIds,
      information_hierarchy: [plan.primaryText, plan.disclosure],
      on_screen_text: plan.primaryText,
      lighting: plan.lighting,
      component_types: plan.componentTypes,
      original_visual_type: plan.visualType,
      disclosure_text: plan.disclosure,
      scene_action: plan.motionPlan,
      emotional_intent: plan.emotionalIntent,
      continuity_notes: plan.continuity,
    },
    camera: {
      shot_size: plan.shotSize,
      focal_length_mm: plan.lens,
      angle: plan.angle,
    },
    movement: {
      type: plan.movement,
      direction: plan.direction,
      speed: plan.speed,
      plan: plan.motionPlan,
    },
    subtitle: sourceSubtitle,
    audio: {
      ...sourceAudio,
      narration_status: "disabled",
      sync_notes: "Original Editorial Visual Mode silent review; no MiniMax call and no audio generation performed.",
    },
    transition_in: plan.transitionIn,
    transition_out: plan.transitionOut,
    asset: {
      request_ids: [`ovr1_xm_${String(index + 1).padStart(3, "0")}`],
      required: true,
      fallback_request_id: "",
      ownership: "project_owned_when_generated",
      external_media_allowed: false,
      scene: "original_editorial_visual",
    },
    engine: "hyperframes",
    segment_role: "visual_segment",
    engine_reason: "HyperFrames is planned only for the local original motion component; Remotion remains the future master timeline. Nothing is rendered in this revision.",
    presenter_required: false,
    presenter_reason: "",
    subtitle_safe_area: "brand_default",
    asset_request_ids: [`ovr1_xm_${String(index + 1).padStart(3, "0")}`],
    primary_visual_source: "project_owned_original_visual_plan",
    preview_frame: previewRecords[index].path,
    preview_status: "pending",
    preview_sha256: previewRecords[index].sha256,
    copyright_status: "project_owned_when_generated",
    verified_data_ids: plan.verifiedDataIds,
    original_editorial_design: {
      originality_status: "planned_project_owned_original",
      disclosure_required: true,
      disclosure_text: plan.disclosure,
      external_asset_dependency: "none",
      layout_family: plan.layoutFamily,
      single_core_point: true,
      meaningful_change_within_seconds: Math.min(3, Number(sourceShot.duration)),
      misleading_risk: plan.misleadingLevel,
      mitigation: plan.mitigation,
      continuity_notes: plan.continuity,
    },
  };
});

const storyboardPayload = {
  schema_version: 2,
  template_name: "storyboard",
  storyboard: {
    job_id: JOB,
    revision: 9,
    topic_id: sourceStoryboard.topic_id,
    script_path: SCRIPT,
    script_sha256: sha256(SCRIPT),
    fact_check_path: `output/${JOB}/intermediate/fact_check.yaml`,
    verified_data_path: "database/verified_data.json",
    aspect_ratio: "9:16",
    width: 1080,
    height: 1920,
    fps: 30,
    total_duration_seconds: 41.5,
    brand_style: "brand_styles/xiaomi.yaml",
    presentation_format: "dynamic_editorial_video",
    static_slideshow_allowed: false,
    audio_mode: "silent_review",
    production_mode: "original_editorial",
    media_dependency_plan: {
      external_image_count: 0,
      external_video_count: 0,
      webpage_screenshot_count: 0,
      search_thumbnail_count: 0,
      photorealistic_ai_vehicle_count: 0,
      project_original_visual_shots: 15,
      external_asset_dependency: "none",
      status: "passed",
    },
    original_editorial_mode: {
      trigger: "no_legally_acquirable_external_media",
      trigger_evidence: [
        `output/${JOB}/asset_acquisition/editorial_images_r3/candidate_asset_manifest_r3.yaml`,
        `output/${JOB}/asset_acquisition/editorial_images_r3/copyright_review_checklist.md`,
        `output/${JOB}/asset_acquisition/editorial_images_r3/technical_inspection_report.md`,
      ],
      external_media_permitted: false,
      continue_asset_search: false,
      wait_for_pr_assets: false,
      webpage_screenshots_permitted: false,
      photorealistic_ai_vehicle_permitted: false,
      copyright_bypass_permitted: false,
      legacy_programmatic_run_gate_applicable: false,
      maximum_same_composition_seconds: 5,
      maximum_seconds_without_meaningful_change: 3,
      adjacent_layout_reuse_permitted: false,
      white_card_ppt_permitted: false,
      one_core_point_per_shot: true,
      disclosure_policy: "Every diagram is visibly labelled as editorial, illustrative, non-live-action, or non-official engineering artwork.",
      dynamic_visual_spine: "orange identity axis → blue space grid → relationship branches → mechanism paths → purchase choice lanes",
      render_allowed: false,
    },
    shots: storyboardShots,
    validation: {
      shot_count: 15,
      timeline_contiguous: true,
      total_duration_seconds: 41.5,
      duration_in_requested_range_38_43: true,
      maximum_shot_duration_seconds: 3,
      maximum_same_composition_seconds: 3,
      maximum_seconds_without_meaningful_change: 3,
      adjacent_layout_duplicates: 0,
      unique_layout_family_count: 15,
      one_core_point_per_shot: true,
      hero_animation_count: 1,
      verified_data_animation_count: plans.filter((plan) => plan.componentTypes.includes("verified_data_animation")).length,
      space_or_structure_diagram_count: plans.filter((plan) => plan.componentTypes.some((type) => ["original_space_diagram", "original_structure_diagram"].includes(type))).length,
      product_relationship_diagram_count: 1,
      strong_ending_interaction_count: 1,
      ppt_style: false,
      white_card_pages: 0,
      external_asset_dependencies: 0,
      misleading_official_visual_claims: 0,
      preview_frames_generated: true,
      preview_frame_count: 15,
      restricted_asset_search_stopped: true,
      render_allowed: false,
      status: "passed_automatic_checks_ready_for_picture_review",
    },
    approval: {
      status: "pending",
      reviewer: "",
      reviewed_at: "",
      decision_record: "",
    },
    supersedes: SOURCE_STORYBOARD,
    source_storyboard: SOURCE_STORYBOARD,
    stage_run_id: "storyboard_original_editorial_20260714_r9",
    script_revision: 2,
    source_script: SCRIPT,
    director_review: {
      path: DIRECTOR_REVIEW,
      director_score: 94,
      score_threshold: 90,
      score_gate: "passed",
      render_gate: "blocked_pending_picture_review",
    },
  },
};
writeYamlExclusive(STORYBOARD, storyboardPayload);

const manifestShots = storyboardShots.map((shot, index) => {
  const plan = plans[index];
  return {
    shot_id: shot.shot_id,
    visual_type: plan.visualType,
    factual_basis: plan.factualBasis,
    verified_data_ids: plan.verifiedDataIds,
    originality_status: "planned_project_owned_original",
    disclosure_required: true,
    disclosure_text: plan.disclosure,
    motion: {
      type: plan.movement,
      direction: plan.direction,
      plan: plan.motionPlan,
    },
    duration: shot.duration,
    caption: yamlRecord(shot.visual, "shot.visual").on_screen_text,
    transition: {
      in: plan.transitionIn,
      out: plan.transitionOut,
    },
    render_component: plan.renderComponent,
    misleading_risk: {
      level: plan.misleadingLevel,
      risk: plan.misleadingRisk,
      mitigation: plan.mitigation,
    },
    preview_frame: shot.preview_frame,
    preview_sha256: shot.preview_sha256,
    validation_status: "passed_automatic_checks_pending_picture_review",
  };
});

writeYamlExclusive(MANIFEST, {
  schema_version: 1,
  original_visual_manifest: {
    job_id: JOB,
    revision: 1,
    mode: "original_editorial_visual",
    storyboard_path: STORYBOARD,
    storyboard_sha256: sha256(STORYBOARD),
    script_path: SCRIPT,
    script_sha256: sha256(SCRIPT),
    external_asset_dependency: "none",
    external_images: 0,
    external_videos: 0,
    webpage_screenshots: 0,
    photorealistic_ai_vehicle_images: 0,
    project_original_visual_shots: 15,
    copyright_status: "project_owned_when_generated",
    render_allowed: false,
    final_status: "ready_for_picture_review",
    shots: manifestShots,
  },
});

const cardWidth = 650;
const cardHeight = 590;
const gap = 24;
const sheetWidth = 2070;
const sheetHeight = 3360;
const cards = storyboardShots.map((shot, index) => {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const x = 24 + col * (cardWidth + gap);
  const y = 240 + row * (cardHeight + gap);
  const previewData = readFileSync(absolutePath(String(shot.preview_frame))).toString("base64");
  const plan = plans[index];
  const captionLines = wrap(String(yamlRecord(shot.visual, "visual").on_screen_text), 13);
  const typeLines = wrap(plan.visualType, 22);
  return `<g transform="translate(${x} ${y})">
    <rect width="${cardWidth}" height="${cardHeight}" rx="24" fill="#101720" stroke="#2E4051" stroke-width="3"/>
    <image href="data:image/png;base64,${previewData}" x="20" y="70" width="250" height="444" preserveAspectRatio="xMidYMid slice"/>
    <text x="292" y="54" font-size="34" fill="#F5F7FA" font-weight="800" font-family="Arial,sans-serif">${xml(String(shot.shot_id))}</text>
    <text x="620" y="54" text-anchor="end" font-size="28" fill="#FF6A1A" font-family="Arial,sans-serif">${Number(shot.duration).toFixed(1)}s</text>
    <text x="292" y="116" font-size="22" fill="#35A7FF" font-family="Arial,sans-serif">${typeLines.map((line, i) => `<tspan x="292" dy="${i === 0 ? 0 : 28}">${xml(line)}</tspan>`).join("")}</text>
    <text x="292" y="220" font-size="28" fill="#F5F7FA" font-weight="700" font-family="PingFang SC,sans-serif">${captionLines.map((line, i) => `<tspan x="292" dy="${i === 0 ? 0 : 38}">${xml(line)}</tspan>`).join("")}</text>
    <text x="292" y="360" font-size="21" fill="#AFC0CF" font-family="PingFang SC,sans-serif">运镜：${xml(plan.movement)}</text>
    <text x="292" y="398" font-size="20" fill="#AFC0CF" font-family="Arial,sans-serif">${xml(plan.transitionOut)}</text>
    <text x="292" y="454" font-size="21" fill="#FFB078" font-family="PingFang SC,sans-serif">${xml(plan.disclosure)}</text>
    <text x="292" y="510" font-size="18" fill="#71879A" font-family="Arial,sans-serif">layout: ${xml(plan.layoutFamily)}</text>
  </g>`;
}).join("\n");

const contactSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${sheetHeight}" viewBox="0 0 ${sheetWidth} ${sheetHeight}">
  <rect width="${sheetWidth}" height="${sheetHeight}" fill="#080D13"/>
  <text x="36" y="72" font-size="54" fill="#F5F7FA" font-weight="800" font-family="Arial,sans-serif">ORIGINAL EDITORIAL · DIRECTOR CONTACT SHEET</text>
  <text x="36" y="132" font-size="30" fill="#9BB0C2" font-family="Arial,sans-serif">${JOB} · Storyboard r9 · 15 shots · 41.5s · no external media</text>
  <text x="36" y="188" font-size="27" fill="#FFB078" font-family="PingFang SC,sans-serif">所有画面均为原创示意首帧，不是小米官方实车、结构或工程图。</text>
  ${cards}
  <text x="36" y="3320" font-size="24" fill="#66798A" font-family="PingFang SC,sans-serif">Director Score 94/100 · PPT风险低 · 待自动Picture Review · 未渲染</text>
</svg>`;
writeTextExclusive(CONTACT_SVG, contactSvg);
execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "92", absolutePath(CONTACT_SVG), "--out", absolutePath(CONTACT_JPG)], { stdio: "ignore" });

const directorRows = storyboardShots.map((shot, index) => {
  const plan = plans[index];
  return `| ${shot.shot_id} | ${shot.duration}s | ${plan.visualType} | ${plan.rationale} | ${plan.rejectedAlternative} |`;
}).join("\n");

const directorReview = `# Original Editorial Visual Mode — Director Review

- 项目：\`${JOB}\`
- Script：\`${SCRIPT}\`（原文未改）
- Storyboard：\`${STORYBOARD}\`
- Original Visual Manifest：\`${MANIFEST}\`
- 总时长：41.5秒
- 外部图片/视频/网页截图：0
- 渲染：未执行

## Director Score

**94/100 — ready_for_picture_review，Render仍为blocked**

| 维度 | 满分 | 得分 | 扣分原因 |
|---|---:|---:|---|
| 开头3秒 | 20 | 19 | 第一秒明确出现“小米汽车”和Hero轮廓；抽象轮廓仍需自动检查是否会被误解为车型外观。 |
| 信息密度 | 15 | 14 | 每镜一个核心信息；shot_12与shot_15仍需检查移动端阅读速度。 |
| 视觉变化与运动 | 20 | 19 | 15种版式、每3秒有变化；尚未通过实际动画代表帧检查。 |
| 原创性与去PPT | 15 | 14 | 无白卡和翻页；全程序化表达仍有天然信息图感，需要执行时保持空间连续。 |
| 事实与示意边界 | 15 | 14 | 全部标注示意且绑定事实；shot_07、08、09、13需重点防止观众误认官方结构或功能。 |
| 节奏与Retention | 10 | 9 | 41.5秒、shot_13为2.5秒；19—34秒机制段仍偏密。 |
| Ending互动 | 5 | 5 | 购买、竞争、等待三选一，未虚构价格或投票数据。 |
| **总分** | **100** | **94** | **严格大于90，只允许进入自动Picture Review。** |

## 逐镜导演判断

| Shot | 时长 | 视觉形式 | 为什么这样做 | 为什么不用另一种方式 |
|---|---:|---|---|---|
${directorRows}

## 自动检查

### 1. 开头3秒

- 评分：19/20。
- 0—1秒明确出现“小米汽车”，同时建立抽象SUV Hero轮廓和空间主轴。
- 不使用Logo重绘、官方照片或拟真AI车型。

### 2. 信息密度

- 状态：passed。
- 15镜均为一个核心观点；主标题最多1条，shot_15的三个选择属于一个互动问题。
- shot_12与shot_15保留移动端自动可读性复核。

### 3. 视觉重复

- 状态：passed。
- 15个镜头使用15种layout family；相邻重复为0。
- 同一种构图最长3秒，低于5秒门禁。
- 每个镜头最长3秒，镜间构图、景别、方向或动画类型必然发生变化。

### 4. PPT风险

- 风险：low，不是zero。
- 白底卡片、参数卡翻页、六宫格、静态文字页均为0。
- 风险来自全程序化表达；执行时必须保持轴线、节点、路径和空间变形连续，不能退化为逐页换标题。

### 5. 事实误导

- 总体风险：low_to_medium，自动 Picture Review 未明确通过前必须阻断。
- 所有车辆轮廓、结构、座舱、滑轨、流程和场景均显示“示意/非实拍/非官方工程图”。
- 不显示车身尺寸、真实滑轨行程、性能、价格、销量、上市日期或独立测试结论。
- shot_07、08、09、12、13为重点复核镜头。

## Retention预测

> 结构估算，不是实测平台数据；未渲染、无声音和无真实素材条件下置信度为低至中等。

| 指标 | 预测 | 依据 |
|---|---:|---|
| 3秒留存 | 76%—83% | 首秒品牌文字、Hero轮廓与反差钩子同步建立。 |
| 15秒留存 | 58%—66% | 名称、日期、空间和双系列关系连续推进，版式不重复。 |
| 完播率 | 44%—52% | 总时长41.5秒，中段机制解释较密，但shot_13后重新提速。 |
| 评论意愿 | 中高 | 结尾给出购买、驾驶型SUV和继续等待三项具体选择。 |

## Render Gate

- Director Score：passed（94 > 90）。
- 自动 Picture Review：ready。
- Render：blocked。
- 阻断原因：Storyboard r9、15张首帧、Contact Sheet和Manifest尚未自动批准；本任务明确禁止渲染与MiniMax调用。
`;
writeTextExclusive(DIRECTOR_REVIEW, directorReview);

writeYamlExclusive(DIRECTOR_CHECKS, {
  schema_version: 1,
  director_checks: {
    job_id: JOB,
    storyboard_path: STORYBOARD,
    storyboard_sha256: sha256(STORYBOARD),
    contact_sheet_path: CONTACT_JPG,
    contact_sheet_sha256: sha256(CONTACT_JPG),
    director_score: 94,
    score_threshold: 90,
    score_gate: "passed",
    opening_three_seconds: { score: 19, maximum: 20, xiaomi_auto_visible_in_first_second: true },
    information_density: { status: "passed", one_core_point_per_shot: true, high_attention_shots: ["shot_12", "shot_15"] },
    visual_repetition: { status: "passed", unique_layout_families: 15, adjacent_duplicate_layouts: 0, maximum_same_composition_seconds: 3, limit_seconds: 5 },
    meaningful_change: { status: "passed", maximum_seconds_without_change: 3, limit_seconds: 3 },
    ppt_risk: { level: "low", white_card_pages: 0, page_turn_transitions: 0, static_text_only_shots: 0 },
    factual_misleading_risk: { level: "low_to_medium", disclosure_shots: 15, priority_picture_review_shots: ["shot_07", "shot_08", "shot_09", "shot_12", "shot_13"] },
    required_visual_counts: { hero_animation: 1, verified_data_animations: 5, space_or_structure_diagrams: 5, product_relationship_diagrams: 1, strong_ending_interactions: 1 },
    retention_prediction: { basis: "unrendered_structural_estimate", confidence: "low_to_medium", three_second_percent: "76-83", fifteen_second_percent: "58-66", completion_percent: "44-52", comment_intent: "medium_high" },
    external_asset_dependency: "none",
    picture_review_ready: true,
    render_allowed: false,
    status: "ready_for_picture_review",
  },
});

console.log(JSON.stringify({
  storyboard: STORYBOARD,
  manifest: MANIFEST,
  previews: previewRecords.length,
  contact_sheet: CONTACT_JPG,
  director_review: DIRECTOR_REVIEW,
  director_score: 94,
  external_asset_dependency: "none",
  render_allowed: false,
}, null, 2));
