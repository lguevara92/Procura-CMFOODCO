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
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #0f172a",
          color: "#0f172a",
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        CM
      </div>
    ),
    size,
  );
}
