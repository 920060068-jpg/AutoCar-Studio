export type CaptionProps = {
  text: string;
};

export const Caption = ({text}: CaptionProps) => {
  return (
    <div
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        borderRadius: 12,
        bottom: 170,
        boxSizing: "border-box",
        color: "#FFFFFF",
        fontFamily: "sans-serif",
        fontSize: 44,
        fontWeight: 700,
        left: 96,
        lineHeight: 1.35,
        maxHeight: 130,
        overflow: "hidden",
        padding: "14px 22px",
        position: "absolute",
        right: 96,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
};
