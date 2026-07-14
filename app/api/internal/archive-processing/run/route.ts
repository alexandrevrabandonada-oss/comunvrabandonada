import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runArchiveProcessingBatch } from "@/lib/archive/photo-processing-worker";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET ?? "",
    actual =
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (
    !expected ||
    actual.length !== expected.length ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runArchiveProcessingBatch());
  } catch {
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
