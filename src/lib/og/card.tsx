/* eslint-disable @next/next/no-img-element -- Satori renders these to a static
   image; next/image does not apply inside next/og. */
/**
 * The one social-card renderer behind every route's opengraph-image and
 * twitter-image. An editorial, brand-led layout on the black canvas: the page
 * name leads large in the upper-left, the deepskew signature (skew-curve mark +
 * wordmark) sits beneath it, and a hairline status-bar baseline (the desk's own
 * footer) holds the bottom. The home card drops the page name and centers the
 * lockup big. No live data, no chart.
 *
 * Satori (next/og) constraints: flexbox only, inline styles only, fonts as
 * binary data, art inlined as base64 SVG <img>.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { OG_ROUTES, type OgRouteKey } from "./meta";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/jpeg";

// Tatem tokens (mirror of src/app/globals.css).
const CANVAS = "#000000";
const TEXT = "#ffffff";
const TEXT_FAINT = "#8a8a8a";
const HAIRLINE = "#2a2a2a";
const BRAND = "#007eed";
const SANS = "Geist";
const MONO = "Geist Mono";

const PAD = 72;

// ── Fonts (vendored TTFs) ────────────────────────────────────────────────────
const FONT_DIR = join(process.cwd(), "src/lib/og/fonts");
const fonts = Promise.all([
  readFile(join(FONT_DIR, "Geist-Regular.ttf")),
  readFile(join(FONT_DIR, "Geist-Medium.ttf")),
  readFile(join(FONT_DIR, "Geist-SemiBold.ttf")),
  readFile(join(FONT_DIR, "GeistMono-Medium.ttf")),
]);

/** The skew-curve mark (DeepSkewMark) at an arbitrary pixel size, cerulean. */
const markUri = (px: number) =>
  `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none"><path d="M2.5 6.5C6 17 9.5 16.5 12 13.5C15 10 18 9.5 21.5 11.5" stroke="${BRAND}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11.6" cy="14" r="1.5" fill="${BRAND}"/></svg>`,
  ).toString("base64")}`;

/** The desk's status-bar footer, echoed statically to hold the baseline. */
function Footer() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: `1px solid ${HAIRLINE}`,
        paddingTop: 22,
        fontFamily: MONO,
        fontSize: 22,
        color: TEXT_FAINT,
      }}
    >
      <div style={{ display: "flex" }}>deepskew.xyz</div>
      <div style={{ display: "flex" }}>DeepBook Predict · Sui Testnet</div>
    </div>
  );
}

function Card({ route }: { route: OgRouteKey }) {
  const home = route === "desk";
  const name = OG_ROUTES[route].nav;

  return (
    <div
      style={{
        width: ogSize.width,
        height: ogSize.height,
        display: "flex",
        flexDirection: "column",
        padding: PAD,
        background: CANVAS,
        fontFamily: SANS,
      }}
    >
      {home ? (
        // Home: the lockup is the whole statement, centered big.
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 30,
          }}
        >
          <img src={markUri(140)} width={140} height={140} alt="" />
          <div
            style={{
              display: "flex",
              fontWeight: 600,
              fontSize: 112,
              letterSpacing: -3.5,
              color: TEXT,
            }}
          >
            deepskew
          </div>
        </div>
      ) : (
        // Page: the name leads large, the signature sits beneath it.
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              fontWeight: 500,
              fontSize: 96,
              letterSpacing: -3,
              lineHeight: 1,
              color: TEXT,
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 15,
              marginTop: 34,
            }}
          >
            <img src={markUri(44)} width={44} height={44} alt="" />
            <div
              style={{
                display: "flex",
                fontWeight: 600,
                fontSize: 40,
                letterSpacing: -1.2,
                color: TEXT,
              }}
            >
              deepskew
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

/** Build the OG/Twitter image for a route. Used by every opengraph-image.tsx.
 *  Satori only emits PNG, so the bitmap is re-encoded to a compressed JPEG with
 *  sharp (mozjpeg, 4:4:4 chroma to keep the cerulean mark crisp). Runs only at
 *  build / hourly ISR regeneration. */
export async function renderRouteCard(route: OgRouteKey): Promise<Response> {
  const [regular, medium, semibold, mono] = await fonts;
  const png = await new ImageResponse(<Card route={route} />, {
    ...ogSize,
    fonts: [
      { name: SANS, data: regular, weight: 400, style: "normal" },
      { name: SANS, data: medium, weight: 500, style: "normal" },
      { name: SANS, data: semibold, weight: 600, style: "normal" },
      { name: MONO, data: mono, weight: 500, style: "normal" },
    ],
  }).arrayBuffer();

  const jpeg = await sharp(Buffer.from(png))
    .flatten({ background: "#000000" })
    .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: { "content-type": ogContentType },
  });
}
