import { ImageResponse } from "next/og";
import { LOGO_BASE64 } from "@/lib/logoBase64";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_BASE64} width={700} height={175} alt="" />
      </div>
    ),
    size,
  );
}
