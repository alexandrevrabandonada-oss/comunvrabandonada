import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runRuntimeStorageRestoreRehearsal } from "@/lib/security/storage-restore-rehearsal";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET ?? "";
  const actual =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (
    !expected ||
    actual.length !== expected.length ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return NextResponse.json(
      {
        error: "unauthorized",
        marker: "COMUN_STORAGE_RUNTIME_CRON_AUTH_FAILED",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );

  const purpose = request.headers.get("x-comun-rehearsal-purpose");
  const requestedAt = Number(request.headers.get("x-comun-requested-at"));
  const body = await request.json().catch(() => ({}));
  if (
    purpose !== "tijolo-47-8" ||
    !Number.isFinite(requestedAt) ||
    Math.abs(Date.now() - requestedAt) > 5 * 60_000 ||
    typeof body.attemptId !== "string" ||
    !/^[a-z0-9-]{10,80}$/i.test(body.attemptId)
  )
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const signingKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const signature = request.headers.get("x-comun-rehearsal-signature") ?? "";
  const expectedSignature = createHmac("sha256", signingKey)
    .update(`${requestedAt}.${body.attemptId}.tijolo-47-8`)
    .digest("hex");
  if (
    !signingKey ||
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  )
    return NextResponse.json(
      {
        error: "unauthorized",
        marker: "COMUN_STORAGE_RUNTIME_SIGNATURE_AUTH_FAILED",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );

  try {
    const evidence = await runRuntimeStorageRestoreRehearsal(body.attemptId);
    return NextResponse.json(evidence, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const marker = /^COMUN_STORAGE_RUNTIME_[A-Z_]+$/.test(message)
      ? message
      : "COMUN_STORAGE_RUNTIME_INTERNAL_FAILURE";
    return NextResponse.json(
      { error: "storage_rehearsal_failed", marker },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
