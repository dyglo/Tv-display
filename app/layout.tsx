import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "LivingScreen — Make room for stillness",
  description:
    "Three living worlds for your screen. Cinematic, time-aware ambient environments, designed for television.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
