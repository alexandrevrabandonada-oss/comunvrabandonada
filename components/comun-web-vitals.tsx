"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import {
  classifyComunRoute,
  COMUN_WEB_VITAL_NAMES,
  type ComunDeviceClass,
  type ComunWebVitalName,
} from "@/lib/quality-performance";

const configuredRate = Number(
  process.env.NEXT_PUBLIC_COMUN_WEB_VITALS_SAMPLE_RATE ?? "0.2",
);
const sampleRate = Number.isFinite(configuredRate)
  ? Math.min(1, Math.max(0, configuredRate))
  : 0.2;
const sampled = Math.random() < sampleRate;
export function ComunWebVitals({ appVersion }: { appVersion: string }) {
  const pathname = usePathname();

  useReportWebVitals((metric) => {
    if (!sampled || !pathname.startsWith("/comun")) return;
    if (!COMUN_WEB_VITAL_NAMES.includes(metric.name as ComunWebVitalName))
      return;
    const payload = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      routeClass: classifyComunRoute(pathname),
      deviceClass: (window.innerWidth < 768
        ? "mobile"
        : "desktop") as ComunDeviceClass,
      appVersion: appVersion.slice(0, 40),
    };
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/comun/quality-metrics",
        new Blob([body], { type: "application/json" }),
      );
      return;
    }
    void fetch("/api/comun/quality-metrics", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      keepalive: true,
    });
  });

  return null;
}
