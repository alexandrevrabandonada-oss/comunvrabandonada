import { NextRequest, NextResponse } from "next/server";
import {
  COMUN_RELATA_RECEIPT_COOKIE,
  createComunRelataPersistenceClient,
  decodeComunRelataReceiptCookie,
} from "@/lib/comun-relata-persistence";
import { isComunSidewalkRelataEnabled } from "@/lib/comun-sidewalk-p4-feature";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store, max-age=0" };
const dormant = () => NextResponse.json({ code: "not_found" }, { status: 404, headers });
export const GET = dormant;
export const PUT = dormant;
export const PATCH = dormant;
export const DELETE = dormant;
export const HEAD = dormant;
export const OPTIONS = dormant;

export async function POST(request: NextRequest) {
  if (!isComunSidewalkRelataEnabled()) return dormant();
  const proof = decodeComunRelataReceiptCookie(
    request.cookies.get(COMUN_RELATA_RECEIPT_COOKIE)?.value,
  );
  if (!proof) return dormant();
  const db = createComunRelataPersistenceClient();
  const { data, error } = await db.rpc("comun_sidewalk_intake_finalize", {
    p_protocol: proof.protocol,
    p_receipt_secret: proof.receiptSecret,
  });
  if (error || !Array.isArray(data) || !data[0]) {
    return NextResponse.json({ code: "location_required" }, { status: 409, headers });
  }
  return NextResponse.json(
    {
      intake: { state: data[0].review_state },
      noOfficialSend: true,
      nothingPublished: true,
    },
    { headers },
  );
}
