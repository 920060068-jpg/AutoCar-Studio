export const MILESTONE1_CAPTIONS = [
  [
    {durationInFrames: 60, from: 0, keyword: "做小了", text: "丰田把兰德酷路泽做小了，"},
    {durationInFrames: 60, from: 60, keyword: "城市 SUV", text: "但它不是一台只讲造型的城市 SUV。"},
  ],
  [
    {durationInFrames: 90, from: 0, keyword: "日本上市", text: "2026年5月14日，Land Cruiser FJ 在日本上市，"},
    {durationInFrames: 90, from: 90, keyword: "450万0100日元", text: "含税指导价450万0100日元。"},
  ],
  [
    {durationInFrames: 105, from: 0, keyword: "4575毫米", text: "它只有4575毫米长，比250系列短350毫米，"},
    {durationInFrames: 105, from: 105, keyword: "短270毫米", text: "轴距也短270毫米。"},
  ],
  [
    {durationInFrames: 90, from: 0, keyword: "5.5米", text: "最小转弯半径5.5米，"},
    {durationInFrames: 120, from: 90, keyword: "更灵活", text: "更短的尺寸直接换来更灵活的通过和掉头。"},
  ],
  [
    {durationInFrames: 90, from: 0, keyword: "梯形车架", text: "结构上依然是梯形车架，"},
    {durationInFrames: 75, from: 90, keyword: "163马力", text: "2.7升自然吸气汽油机，163马力，"},
    {durationInFrames: 75, from: 165, keyword: "分时四驱", text: "匹配6速自动变速箱和分时四驱。"},
  ],
  [
    {durationInFrames: 90, from: 0, keyword: "更短车身", text: "它真正的变化，是用更短车身保留传统机械结构；"},
    {durationInFrames: 75, from: 90, keyword: "8.7公里每升", text: "但WLTC油耗只有8.7公里每升。"},
    {durationInFrames: 75, from: 165, keyword: "更高效的动力", text: "你更在意灵活的尺寸，还是更高效的动力？"},
  ],
] as const;

export const MILESTONE1_SHOTS = [
  {durationInFrames: 120, from: 0, id: "shot_01"},
  {durationInFrames: 180, from: 120, id: "shot_02"},
  {durationInFrames: 210, from: 300, id: "shot_03"},
  {durationInFrames: 210, from: 510, id: "shot_04"},
  {durationInFrames: 240, from: 720, id: "shot_05"},
  {durationInFrames: 240, from: 960, id: "shot_06"},
] as const;

export const DIRECTOR_V2_SHOTS = [
  {captionPosition: "bottom", durationInFrames: 72, from: 0, id: "dv2_01", kind: "hero_impact", motion: "dolly_in", role: "hero", section: "HERO / IMPACT"},
  {captionPosition: "upper_third", durationInFrames: 72, from: 72, id: "dv2_02", kind: "hero_identity", motion: "truck_right", role: "hero", section: "HERO / IDENTITY"},
  {captionPosition: "bottom", durationInFrames: 78, from: 144, id: "dv2_03", kind: "launch", motion: "pan_left", role: "editorial", section: "LAUNCH"},
  {captionPosition: "top", durationInFrames: 90, from: 222, id: "dv2_04", kind: "price", motion: "dolly_in", role: "data_animation", section: "PRICE"},
  {captionPosition: "bottom", durationInFrames: 90, from: 312, id: "dv2_05", kind: "length", motion: "truck_left", role: "detail", section: "PACKAGE"},
  {captionPosition: "upper_third", durationInFrames: 90, from: 402, id: "dv2_06", kind: "size_comparison", motion: "dolly_out", role: "data_animation", section: "COMPARISON"},
  {captionPosition: "bottom", durationInFrames: 90, from: 492, id: "dv2_07", kind: "turning_radius", motion: "orbit", role: "detail", section: "TURNING"},
  {captionPosition: "top", durationInFrames: 84, from: 582, id: "dv2_08", kind: "agility", motion: "pan_right", role: "editorial", section: "AGILITY"},
  {captionPosition: "bottom", durationInFrames: 90, from: 666, id: "dv2_09", kind: "chassis", motion: "tilt_down", role: "detail", section: "CHASSIS"},
  {captionPosition: "upper_third", durationInFrames: 90, from: 756, id: "dv2_10", kind: "engine", motion: "dolly_in", role: "detail", section: "ENGINE"},
  {captionPosition: "bottom", durationInFrames: 90, from: 846, id: "dv2_11", kind: "powertrain", motion: "truck_right", role: "data_animation", section: "POWERTRAIN"},
  {captionPosition: "top", durationInFrames: 90, from: 936, id: "dv2_12", kind: "four_wheel_drive", motion: "orbit", role: "detail", section: "4WD"},
  {captionPosition: "upper_third", durationInFrames: 90, from: 1026, id: "dv2_13", kind: "efficiency", motion: "truck_left", role: "data_animation", section: "EFFICIENCY"},
  {captionPosition: "bottom", durationInFrames: 84, from: 1116, id: "dv2_14", kind: "ending", motion: "dolly_out", role: "ending", section: "VERDICT"},
] as const;

export const DIRECTOR_V2_CAPTIONS = [
  {durationInFrames: 62, from: 5, keyword: "做小了", text: "丰田把兰德酷路泽做小了，"},
  {durationInFrames: 62, from: 5, keyword: "城市 SUV", text: "但它不是一台只讲造型的城市 SUV。"},
  {durationInFrames: 68, from: 5, keyword: "日本上市", text: "2026年5月14日，Land Cruiser FJ 在日本上市，"},
  {durationInFrames: 80, from: 5, keyword: "450万0100日元", text: "含税指导价450万0100日元。"},
  {durationInFrames: 80, from: 5, keyword: "4575毫米", text: "它只有4575毫米长，"},
  {durationInFrames: 80, from: 5, keyword: "短350毫米", text: "比250系列短350毫米，轴距也短270毫米。"},
  {durationInFrames: 80, from: 5, keyword: "5.5米", text: "最小转弯半径5.5米，"},
  {durationInFrames: 74, from: 5, keyword: "更灵活", text: "更短的尺寸直接换来更灵活的通过和掉头。"},
  {durationInFrames: 80, from: 5, keyword: "梯形车架", text: "结构上依然是梯形车架，"},
  {durationInFrames: 80, from: 5, keyword: "2.7升", text: "2.7升自然吸气汽油机，"},
  {durationInFrames: 80, from: 5, keyword: "163马力", text: "163马力，匹配6速自动变速箱"},
  {durationInFrames: 80, from: 5, keyword: "传统机械结构", text: "和分时四驱。它真正的变化，是用更短车身保留传统机械结构；"},
  {durationInFrames: 80, from: 5, keyword: "8.7公里每升", text: "但WLTC油耗只有8.7公里每升。"},
  {durationInFrames: 74, from: 5, keyword: "更高效的动力", text: "你更在意灵活的尺寸，还是更高效的动力？"},
] as const;

export const DIRECTOR_V2_TRANSITIONS = [
  {durationInFrames: 14, from: 65, type: "speed_blur"},
  {durationInFrames: 12, from: 138, type: "light_flash"},
  {durationInFrames: 14, from: 215, type: "directional_wipe"},
  {durationInFrames: 12, from: 306, type: "speed_blur"},
  {durationInFrames: 14, from: 395, type: "light_flash"},
  {durationInFrames: 12, from: 486, type: "directional_wipe"},
  {durationInFrames: 14, from: 575, type: "speed_blur"},
  {durationInFrames: 12, from: 660, type: "light_flash"},
  {durationInFrames: 14, from: 749, type: "directional_wipe"},
  {durationInFrames: 12, from: 840, type: "speed_blur"},
  {durationInFrames: 14, from: 929, type: "light_flash"},
  {durationInFrames: 12, from: 1020, type: "directional_wipe"},
  {durationInFrames: 14, from: 1109, type: "speed_blur"},
] as const;
