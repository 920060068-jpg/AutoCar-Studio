import type {ReactNode} from "react";
import {Sequence} from "remotion";

export type ShotProps = {
  children: ReactNode;
  durationInFrames: number;
  from: number;
  name: string;
};

export const Shot = ({children, durationInFrames, from, name}: ShotProps) => {
  return (
    <Sequence from={from} durationInFrames={durationInFrames} name={name}>
      {children}
    </Sequence>
  );
};
