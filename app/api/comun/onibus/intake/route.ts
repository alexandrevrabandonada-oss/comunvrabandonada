import { NextRequest, NextResponse } from "next/server";
import {
  COMUN_RELATA_RECEIPT_COOKIE,
  createComunRelataPersistenceClient,
  decodeComunRelataReceiptCookie,
  encodeComunRelataReceiptCookie,
  normalizeComunRelataReceipt,
} from "@/lib/comun-relata-persistence";
import { isComunBusRelataEnabled } from "@/lib/comun-bus-feature";
import {
  buildCanonicalBusRelataText,
  isComunBusIssueType,
} from "@/lib/comun-bus-p5-contract";
import {
  createWallet,
  readWalletToken,
  setWalletCookie,
  walletSecretHash,
} from "@/lib/comun-participation-wallet-runtime";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store, max-age=0" };
const dormant = () => NextResponse.json({ code: "not_found" }, { status: 404, headers });
export const GET = dormant;
export const PUT = dormant;
export const PATCH = dormant;
export const HEAD = dormant;
export const OPTIONS = dormant;

function optionalText(value: unknown, maximum = 80) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result ? result.slice(0, maximum) : null;
}

export async function POST(request: NextRequest) {
  if (!isComunBusRelataEnabled()) return dormant();
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ code: "invalid_request" }, { status: 400, headers }); }

  const issueType = body.issueType;
  const idempotencyKey = String(body.idempotencyKey ?? "");
  const receiptSecret = String(body.receiptSecret ?? "");
  const lineLabel = optionalText(body.lineLabel);
  const direction = optionalText(body.direction);
  const vehicleOrder = optionalText(body.vehicleOrder);
  const description = optionalText(body.description, 300);
  const observedAt = new Date(String(body.observedAt ?? ""));
  const waitMinutes = body.waitMinutes === null || body.waitMinutes === "" || body.waitMinutes === undefined
    ? null : Number(body.waitMinutes);
  if (
    !isComunBusIssueType(issueType) ||
    !/^[A-Za-z0-9_-]{32,160}$/.test(idempotencyKey) ||
    !/^[A-Za-z0-9_-]{32,160}$/.test(receiptSecret) ||
    Number.isNaN(observedAt.getTime()) || observedAt.getTime() > Date.now() + 5 * 60_000 ||
    (waitMinutes !== null && (!Number.isInteger(waitMinutes) || waitMinutes < 0 || waitMinutes > 720))
  ) return NextResponse.json({ code: "invalid_request" }, { status: 400, headers });

  const db = createComunRelataPersistenceClient();
  const originalText = buildCanonicalBusRelataText({ issueType, lineLabel: lineLabel ?? undefined, direction: direction ?? undefined, vehicleOrder: vehicleOrder ?? undefined, description: description ?? undefined });
  const created = await db.rpc("comun_relata_create", {
    p_idempotency_key: idempotencyKey,
    p_receipt_secret: receiptSecret,
    p_original_text: originalText,
    p_answers: {},
    p_category: "public_transport",
    p_urgency: issueType === "accessibility" ? "attention" : "routine",
    p_rule_version: "relata-routing-v1",
    p_decision: { category: "public_transport", source: "bus_structured_server_route", captureMode: "bus_p5" },
    p_privacy_class: "private",
    p_consent_version: "relata-consent-v1",
  });
  if (created.error || !Array.isArray(created.data) || !created.data[0]) {
    const conflict = created.error?.message?.includes("IDEMPOTENCY_CONFLICT");
    return NextResponse.json({ code: conflict ? "idempotency_conflict" : "persistence_unavailable" }, { status: conflict ? 409 : 503, headers });
  }
  const firstReceipt = normalizeComunRelataReceipt(created.data[0]);
  const receiptResult = await db.rpc("comun_relata_get_receipt", { p_protocol: firstReceipt.protocol, p_receipt_secret: receiptSecret });
  if (receiptResult.error || !Array.isArray(receiptResult.data) || !receiptResult.data[0])
    return NextResponse.json({ code: "receipt_unavailable" }, { status: 503, headers });
  const receipt = normalizeComunRelataReceipt(receiptResult.data[0]);

  const adapterInput = {
    p_protocol: receipt.protocol,
    p_receipt_secret: receiptSecret,
    p_issue_type: issueType,
    p_line_label: lineLabel,
    p_direction: direction,
    p_vehicle_order: vehicleOrder,
    p_observed_at: observedAt.toISOString(),
    p_wait_minutes: waitMinutes,
  };
  let intake = await db.rpc("comun_bus_intake_create", adapterInput);
  let walletRecoveryCode: string | undefined;
  let walletToken = readWalletToken(request);
  try {
    if (!walletToken) {
      const wallet = await createWallet(db);
      walletToken = wallet.token;
      walletRecoveryCode = wallet.recoveryCode;
    }
    await db.rpc("comun_participation_wallet_attach_relata", {
      p_token_hash_hex: walletSecretHash(walletToken),
      p_protocol: receipt.protocol,
      p_receipt_secret: receiptSecret,
    });
    // Idempotent second call enriches the one canonical Relata wallet item.
    intake = await db.rpc("comun_bus_intake_create", adapterInput);
  } catch {
    // Wallet association is compensable; the Relata remains authoritative.
  }

  const response = NextResponse.json({
    receipt,
    intakeReady: !intake.error && Array.isArray(intake.data) && Boolean(intake.data[0]),
    noOfficialSend: true,
    nothingPublished: true,
    ...(walletRecoveryCode ? { walletRecoveryCode } : {}),
  }, { status: 201, headers });
  response.cookies.set(COMUN_RELATA_RECEIPT_COOKIE, encodeComunRelataReceiptCookie(receipt.protocol, receiptSecret), {
    httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "strict", path: "/api/comun",
  });
  if (walletToken) setWalletCookie(response, walletToken);
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!isComunBusRelataEnabled()) return dormant();
  const proof = decodeComunRelataReceiptCookie(request.cookies.get(COMUN_RELATA_RECEIPT_COOKIE)?.value);
  if (!proof) return dormant();
  const db = createComunRelataPersistenceClient();
  const bus = await db.rpc("comun_bus_intake_withdraw", { p_protocol: proof.protocol, p_receipt_secret: proof.receiptSecret });
  const report = await db.rpc("comun_relata_withdraw", { p_protocol: proof.protocol, p_receipt_secret: proof.receiptSecret });
  if (bus.error || report.error) return dormant();
  return NextResponse.json({ withdrawn: true }, { headers });
}
