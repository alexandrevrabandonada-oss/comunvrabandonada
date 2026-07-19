import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "COMUN VR Abandonada",
  description: "Relatos, debates e memoria coletiva da cidade.",
  manifest: "/manifest.webmanifest",
  applicationName: "COMUN",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "COMUN" },
  icons: { icon: "/icons/comun-192.svg", apple: "/icons/comun-192.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
