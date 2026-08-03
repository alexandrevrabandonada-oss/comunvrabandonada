import { NextRequest, NextResponse } from "next/server";
import {
  COMUN_RELATA_RECEIPT_COOKIE,
  createComunRelataPersistenceClient,
  encodeComunRelataReceiptCookie,
  isComunRelataPersistenceEnabled,
  normalizeComunRelataReceipt,
} from "@/lib/comun-relata-persistence";
import { classifyRelataPrivacy } from "@/lib/comun-relata-privacy";
import { routeRelata } from "@/lib/comun-relata-routing";

export const runtime = "nodejs";

const noStoreHeaders = { "cache-control": "no-store, max-age=0" };

function dormant() {
  return NextResponse.json(
    { code: "not_found" },
    { status: 404, headers: noStoreHeaders },
  );
}

export async function POST(request: NextRequest) {
  if (!isComunRelataPersistenceEnabled()) return dormant();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { code: "invalid_request" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const answers =
    body.answers &&
    typeof body.answers === "object" &&
    !Array.isArray(body.answers)
      ? (body.answers as Record<string, string>)
      : {};
  const idempotencyKey =
    typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  const receiptSecret =
    typeof body.receiptSecret === "string" ? body.receiptSecret : "";

  if (
    text.length < 8 ||
    text.length > 600 ||
    !/^[A-Za-z0-9_-]{32,160}$/.test(idempotencyKey) ||
    !/^[A-Za-z0-9_-]{32,160}$/.test(receiptSecret) ||
    Object.keys(answers).some(
      (key) => key !== "homes_power" || !["sim", "nao"].includes(answers[key]),
    )
  ) {
    return NextResponse.json(
      { code: "invalid_request" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const input = { text, answers };
  const decision = routeRelata(input);
  if (decision.missingInformation.length > 0) {
    return NextResponse.json(
      { code: "triage_incomplete" },
      { status: 409, headers: noStoreHeaders },
    );
  }

  const db = createComunRelataPersistenceClient();
  const { data, error } = await db.rpc("comun_relata_create", {
    p_idempotency_key: idempotencyKey,
    p_receipt_secret: receiptSecret,
    p_original_text: text,
    p_answers: answers,
    p_category: decision.category,
    p_urgency: decision.urgency,
    p_rule_version: decision.ruleVersion,
    p_decision: decision,
    p_privacy_class: classifyRelataPrivacy(input),
    p_consent_version: "relata-consent-v1",
  });

  if (error || !Array.isArray(data) || !data[0]) {
    const conflict = error?.message?.includes("IDEMPOTENCY_CONFLICT");
    return NextResponse.json(
      { code: conflict ? "idempotency_conflict" : "persistence_unavailable" },
      { status: conflict ? 409 : 503, headers: noStoreHeaders },
    );
  }

  const created = normalizeComunRelataReceipt(data[0]);
  const receiptResult = await db.rpc("comun_relata_get_receipt", {
    p_protocol: created.protocol,
    p_receipt_secret: receiptSecret,
  });
  if (
    receiptResult.error ||
    !Array.isArray(receiptResult.data) ||
    !receiptResult.data[0]
  ) {
    return NextResponse.json(
      { code: "receipt_unavailable" },
      { status: 503, headers: noStoreHeaders },
    );
  }
  const receipt = normalizeComunRelataReceipt(receiptResult.data[0]);
  const response = NextResponse.json(
    { receipt, noOfficialSend: true },
    { status: 201, headers: noStoreHeaders },
  );
  response.cookies.set(
    COMUN_RELATA_RECEIPT_COOKIE,
    encodeComunRelataReceiptCookie(receipt.protocol, receiptSecret),
    {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "strict",
      path: "/api/comun/relata",
    },
  );
  return response;
}
