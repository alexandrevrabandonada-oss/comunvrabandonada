import { NextResponse } from "next/server";
import { z } from "zod";
import { recordQualityMetric } from "@/lib/quality-observability";
import {
  COMUN_ROUTE_CLASSES,
  COMUN_WEB_VITAL_NAMES,
} from "@/lib/quality-performance";

export const dynamic = "force-dynamic";

const payloadSchema = z
  .object({
    name: z.enum(COMUN_WEB_VITAL_NAMES),
    value: z.number().finite().min(0).max(120_000),
    rating: z.enum(["good", "needs-improvement", "poor"]),
    routeClass: z.enum(COMUN_ROUTE_CLASSES),
    deviceClass: z.enum(["mobile", "desktop"]),
    appVersion: z.string().regex(/^[A-Za-z0-9._-]{1,40}$/),
  })
  .strict();

const qualityWindow = globalThis as typeof globalThis & {
  __comunQualityWindow?: { startedAt: number; accepted: number };
};

function capacityAvailable() {
  const now = Date.now();
  const current = qualityWindow.__comunQualityWindow;
  if (!current || now - current.startedAt >= 60_000) {
    qualityWindow.__comunQualityWindow = { startedAt: now, accepted: 1 };
    return true;
  }
  if (current.accepted >= 300) return false;
  current.accepted += 1;
  return true;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json({ code: "origin_rejected" }, { status: 403 });
  if (!capacityAvailable())
    return NextResponse.json({ code: "temporarily_limited" }, { status: 429 });

  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ code: "invalid_metric" }, { status: 400 });

  await recordQualityMetric(parsed.data);
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "private, no-store" },
  });
}
