import { NextRequest, NextResponse } from "next/server";
import {
  COMUN_RELATA_RECEIPT_COOKIE,
  createComunRelataPersistenceClient,
  decodeComunRelataReceiptCookie,
} from "@/lib/comun-relata-persistence";
import {
  isComunEssentialServicesEnabled,
  isEssentialServiceCategory,
} from "@/lib/comun-essential-services-feature";
import { routeRelata } from "@/lib/comun-relata-routing";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store, max-age=0" };
const dormant = () =>
  NextResponse.json({ code: "not_found" }, { status: 404, headers });

export async function POST(request: NextRequest) {
  if (!isComunEssentialServicesEnabled()) return dormant();
  const proof = decodeComunRelataReceiptCookie(
    request.cookies.get(COMUN_RELATA_RECEIPT_COOKIE)?.value,
  );
  if (!proof) return dormant();
  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return dormant();
  }
  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (text.length < 8 || text.length > 600) return dormant();
  const decision = routeRelata({ text, answers: {} });
  if (
    !isEssentialServiceCategory(decision.category) ||
    decision.missingInformation.length > 0 ||
    decision.urgency === "emergency"
  )
    return NextResponse.json(
      { code: "classification_requires_context" },
      { status: 409, headers },
    );
  const db = createComunRelataPersistenceClient();
  const result = await db.rpc("comun_relata_classification_transition", {
    p_protocol: proof.protocol,
    p_receipt_secret: proof.receiptSecret,
    p_original_text: text,
    p_category: decision.category,
    p_decision: decision,
  });
  if (result.error || !Array.isArray(result.data) || !result.data[0])
    return dormant();
  return NextResponse.json(
    { classification: result.data[0], noOfficialSend: true },
    { headers },
  );
}

export const GET = dormant;
export const PUT = dormant;
export const PATCH = dormant;
export const DELETE = dormant;
export const HEAD = dormant;
export const OPTIONS = dormant;
