import {
  XIAOMI_ORIGINAL_EDITORIAL_SHOTS,
  type XiaomiOriginalEditorialShot,
} from "./xiaomiOriginalEditorialData";

export type XiaomiOriginalEditorialAudioTimingShot = XiaomiOriginalEditorialShot & {
  captionEndFrameExclusive: number;
};

const AUDIO_TIMING_R2 = [
  {from: 0, durationInFrames: 90, caption: "小米澎程：第二条产品线，主打空间。", captionEndFrameExclusive: 82},
  {from: 90, durationInFrames: 67, caption: "它叫 SkyNomad，小米澎程。", captionEndFrameExclusive: 61},
  {from: 157, durationInFrames: 67, caption: "7月9日，官方正式公布新系列。", captionEndFrameExclusive: 61},
  {from: 224, durationInFrames: 60, caption: "定位：可变大空间。", captionEndFrameExclusive: 47},
  {from: 284, durationInFrames: 90, caption: "SU7重驾驶，澎程重空间。", captionEndFrameExclusive: 78},
  {from: 374, durationInFrames: 82, caption: "两条产品线对应两种用车需求。", captionEndFrameExclusive: 74},
  {from: 456, durationInFrames: 84, caption: "新昆仑架构从2023年初开始开发。", captionEndFrameExclusive: 79},
  {from: 540, durationInFrames: 90, caption: "纯平地板，是空间变化的基础。", captionEndFrameExclusive: 86},
  {from: 630, durationInFrames: 90, caption: "长滑轨，让座椅随场景变化。", captionEndFrameExclusive: 72},
  {from: 720, durationInFrames: 90, caption: "澎程更适合家庭多场景。", captionEndFrameExclusive: 59},
  {from: 810, durationInFrames: 90, caption: "真正的门槛，不是尺寸做得多大。", captionEndFrameExclusive: 85},
  {from: 900, durationInFrames: 90, caption: "安全、顺手、量产，待验证。", captionEndFrameExclusive: 72},
  {from: 990, durationInFrames: 75, caption: "空间，或是智能生态落点。", captionEndFrameExclusive: 69},
  {from: 1065, durationInFrames: 75, caption: "我的判断：澎程改产品逻辑。", captionEndFrameExclusive: 71},
  {from: 1140, durationInFrames: 105, caption: "买澎程、选驾驶型SUV，还是继续等？", captionEndFrameExclusive: 98},
] as const;

if (AUDIO_TIMING_R2.length !== XIAOMI_ORIGINAL_EDITORIAL_SHOTS.length) {
  throw new Error("Audio timing revision does not cover all approved shots.");
}

export const XIAOMI_ORIGINAL_EDITORIAL_AUDIO_TIMING_SHOTS: readonly XiaomiOriginalEditorialAudioTimingShot[] =
  XIAOMI_ORIGINAL_EDITORIAL_SHOTS.map((shot, index) => {
    const timing = AUDIO_TIMING_R2[index];
    if (!timing) throw new Error(`Missing audio timing for ${shot.shotId}`);
    return {...shot, ...timing};
  });

export const XIAOMI_ORIGINAL_EDITORIAL_AUDIO_TIMING_DURATION_IN_FRAMES = 1245;
