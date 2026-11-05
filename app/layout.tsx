import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Monkey Island — CD reveal",
  description: "Un pequeño ritual para un gran clásico. Abrí la caja y redescubrí Monkey Island en 3D.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
