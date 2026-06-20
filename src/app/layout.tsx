import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

// Numbers, addresses, SVI params: tabular mono is the "machine data" signal.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://deepskew.xyz";
const TITLE = "deepskew · On-chain BTC vol surface and PLP risk terminal";
const DESCRIPTION =
  "deepskew is a dense quant terminal for DeepBook Predict on Sui: a live on-chain BTC implied-volatility surface, an arbitrage-free checker, a PLP vault risk simulator out to five sigma, and a live settlement tape. Make Predict legible.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · deepskew",
  },
  description: DESCRIPTION,
  applicationName: "deepskew",
  authors: [{ name: "deepskew" }],
  creator: "deepskew",
  publisher: "deepskew",
  category: "finance",
  keywords: [
    "DeepBook Predict",
    "DeepBook",
    "Sui",
    "Sui blockchain",
    "implied volatility",
    "volatility surface",
    "SVI",
    "vol surface",
    "PLP vault",
    "liquidity vault",
    "prediction market",
    "on-chain options",
    "BTC options",
    "risk-neutral density",
    "vol-risk-premium",
    "quant terminal",
    "DeFi options",
  ],
  alternates: {
    canonical: "/",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  appleWebApp: {
    capable: true,
    title: "deepskew",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // No title/description here: each route's own title + description flow into
  // og: and twitter: so every card and link preview is route-specific.
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "deepskew",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
