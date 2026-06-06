import { ImageResponse } from "next/og";

// iOS applies its own rounded mask, so the field is a full black square with the
// cerulean mark inset to a safe margin.
export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="116" height="116" viewBox="0 0 24 24" fill="none"><path d="M2.5 6.5C6 17 9.5 16.5 12 13.5C15 10 18 9.5 21.5 11.5" stroke="#007eed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11.6" cy="14" r="1.5" fill="#007eed"/></svg>`,
).toString("base64")}`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
        }}
      >
        <img src={MARK} width={116} height={116} alt="" />
      </div>
    ),
    { ...size },
  );
}
