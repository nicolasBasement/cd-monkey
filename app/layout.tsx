import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Monkey Island — CD reveal",
  description: "A small ritual for a timeless classic. Open the case and rediscover Monkey Island in 3D.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
