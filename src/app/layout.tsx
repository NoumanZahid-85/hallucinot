import type { Metadata } from "next";
import { Literata, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

// Documents (answers and sources) are set in Literata; everything Alibi says is in Schibsted Grotesk.
const ui = Schibsted_Grotesk({
  variable: "--font-ui",
  subsets: ["latin"],
});

const doc = Literata({
  variable: "--font-doc",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alibi: find the sentences your AI made up",
  description:
    "Paste an AI answer and its sources. Alibi checks every sentence against every passage and marks what's backed, what's contradicted, and what has no source at all.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ui.variable} ${doc.variable} antialiased`}>{children}</body>
    </html>
  );
}
