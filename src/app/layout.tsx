import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";

// Instrument Serif for headings only; Geist for the interface, charts and every number.
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hallucinot: Find the Sentences Your AI Made Up",
  description:
    "Paste a chatbot answer and its sources. Hallucinot checks every sentence against every passage and shows what is supported, contradicted, or has no source.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d11" },
  ],
};

// Applies a saved theme choice before first paint, so there is no flash.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${instrument.variable} ${geist.variable} antialiased`}>
        <a
          href="#analyzer"
          className="sr-only rounded-md bg-ink px-4 py-2 font-medium text-page focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to Analyzer
        </a>
        {children}
      </body>
    </html>
  );
}
