import { ImageResponse } from "next/og";
import { RUPEE_PATH } from "@/lib/mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#000000" }}>
        <svg width="180" height="180" viewBox="0 0 100 100">
          <rect width="100" height="100" rx="22" fill="#3ECF8E" />
          <path d={RUPEE_PATH} fill="#000000" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
