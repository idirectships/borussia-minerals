import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          borderRadius: 4,
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontFamily: "Georgia, serif",
            fontWeight: 600,
            color: "#b8c0d0",
            letterSpacing: -0.5,
          }}
        >
          BM
        </span>
      </div>
    ),
    { ...size },
  );
}
