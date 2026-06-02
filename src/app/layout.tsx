import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Numbers, addresses, SVI params — tabular mono is the "machine data" signal.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepskew.xyz"),
  title: {
    default: "DEEPSKEW — On-chain BTC vol surface & PLP risk terminal",
    template: "%s · DEEPSKEW",
  },
  description:
    "DEEPSKEW is a Dense Quant Terminal for DeepBook Predict on Sui: a live on-chain BTC implied-volatility surface, an arbitrage-free checker, a ±5σ PLP vault risk simulator, and a one-click settlement desk. Make Predict legible.",
  applicationName: "DEEPSKEW",
  keywords: [
    "DeepBook Predict",
    "Sui",
    "implied volatility",
    "SVI",
    "vol surface",
    "PLP vault",
    "prediction market",
    "options",
  ],
  openGraph: {
    title: "DEEPSKEW — On-chain BTC vol surface & PLP risk terminal",
    description:
      "Live on-chain BTC implied-volatility surface, arb-free checker, ±5σ PLP risk simulator, and settlement desk for DeepBook Predict on Sui.",
    url: "https://deepskew.xyz",
    siteName: "DEEPSKEW",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
