import type {CSSProperties, ReactNode} from "react";
import {AbsoluteFill} from "remotion";

export type SceneProps = {
  children: ReactNode;
  name: string;
  style?: CSSProperties;
};

export const Scene = ({children, name, style}: SceneProps) => {
  return (
    <AbsoluteFill data-scene-name={name} style={style}>
      {children}
    </AbsoluteFill>
  );
};
