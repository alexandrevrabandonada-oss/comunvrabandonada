import { NextRequest, NextResponse } from "next/server";
import {
  COMUN_RELATA_RECEIPT_COOKIE,
  createComunRelataPersistenceClient,
  decodeComunRelataReceiptCookie,
  isComunRelataPersistenceEnabled,
  normalizeComunRelataReceipt,
} from "@/lib/comun-relata-persistence";

export const runtime = "nodejs";

const noStoreHeaders = { "cache-control": "no-store, max-age=0" };

function genericNotFound() {
  return NextResponse.json(
    { code: "receipt_unavailable" },
    { status: 404, headers: noStoreHeaders },
  );
}

async function readReceipt(request: NextRequest, withdraw: boolean) {
  if (!isComunRelataPersistenceEnabled()) return genericNotFound();
  const proof = decodeComunRelataReceiptCookie(
    request.cookies.get(COMUN_RELATA_RECEIPT_COOKIE)?.value,
  );
  if (!proof) return genericNotFound();

  const db = createComunRelataPersistenceClient();
  const { data, error } = await db.rpc(
    withdraw ? "comun_relata_withdraw" : "comun_relata_get_receipt",
    {
      p_protocol: proof.protocol,
      p_receipt_secret: proof.receiptSecret,
    },
  );
  if (error || !Array.isArray(data) || !data[0]) return genericNotFound();
  return NextResponse.json(
    { receipt: normalizeComunRelataReceipt(data[0]), noOfficialSend: true },
    { headers: noStoreHeaders },
  );
}

export async function GET(request: NextRequest) {
  return readReceipt(request, false);
}

export async function DELETE(request: NextRequest) {
  return readReceipt(request, true);
}
