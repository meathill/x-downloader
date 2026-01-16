import type { ReactNode } from "react";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="zh-CN" className={spaceGrotesk.variable}>
      <body className="min-h-screen bg-pearl-100 text-ink-900">
        {children}
      </body>
    </html>
  );
}
