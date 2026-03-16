import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0f0f0f, #0a0a0a)",
          borderRadius: 36,
        }}
      >
        <span
          style={{
            fontSize: 80,
            fontFamily: "Georgia, serif",
            fontWeight: 600,
            color: "#b8c0d0",
            letterSpacing: -2,
          }}
        >
          BM
        </span>
      </div>
    ),
    { ...size },
  );
}
