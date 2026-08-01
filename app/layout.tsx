import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./comun-app-v2.css";
import { ComunWebVitals } from "@/components/comun-web-vitals";

export const metadata: Metadata = {
  title: "COMUN VR Abandonada",
  description: "Relatos, debates e memoria coletiva da cidade.",
  manifest: "/manifest.webmanifest",
  applicationName: "COMUN",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "COMUN",
  },
  icons: { icon: "/icons/comun-192.png", apple: "/icons/comun-192.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        {children}
        <ComunWebVitals
          appVersion={process.env.VERCEL_GIT_COMMIT_SHA ?? "local"}
        />
      </body>
    </html>
  );
}
