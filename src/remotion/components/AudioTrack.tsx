import {Audio} from "@remotion/media";
import {Sequence} from "remotion";

export type AudioTrackType = "voice" | "music" | "sfx";

export type AudioTrackProps = {
  durationInFrames?: number;
  from?: number;
  name?: string;
  src?: string;
  track?: AudioTrackType;
  volume?: number;
};

const DEFAULT_VOLUME: Record<AudioTrackType, number> = {
  voice: 1,
  music: 0.18,
  sfx: 0.7,
};

export const AudioTrack = ({
  durationInFrames,
  from = 0,
  name,
  src,
  track = "voice",
  volume,
}: AudioTrackProps) => {
  if (!src) {
    return null;
  }

  const resolvedVolume = volume ?? DEFAULT_VOLUME[track];

  if (resolvedVolume < 0 || resolvedVolume > 1) {
    throw new Error("AudioTrack volume must be between 0 and 1.");
  }

  const audio = <Audio src={src} volume={resolvedVolume} />;
  const sequenceName = name ?? `${track} audio`;

  if (durationInFrames === undefined) {
    return (
      <Sequence from={from} layout="none" name={sequenceName}>
        {audio}
      </Sequence>
    );
  }

  return (
    <Sequence
      from={from}
      durationInFrames={durationInFrames}
      layout="none"
      name={sequenceName}
    >
      {audio}
    </Sequence>
  );
};
