import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      version: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 40),
      serviceWorker: "comun-pwa-v3",
      telemetry: "aggregate_only",
      realDeviceEvidence: "required",
    },
    { headers: { "Cache-Control": "public, no-store" } },
  );
}
