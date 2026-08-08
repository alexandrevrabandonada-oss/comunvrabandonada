import { NextRequest, NextResponse } from "next/server";
import {
  COMUN_RELATA_RECEIPT_COOKIE,
  createComunRelataPersistenceClient,
  encodeComunRelataReceiptCookie,
  normalizeComunRelataReceipt,
} from "@/lib/comun-relata-persistence";
import {
  createWallet,
  readWalletToken,
  setWalletCookie,
  walletSecretHash,
} from "@/lib/comun-participation-wallet-runtime";
import { isComunParticipationWalletEnabled } from "@/lib/comun-participation-wallet-feature";
import { isComunSidewalkRelataEnabled } from "@/lib/comun-sidewalk-p4-feature";
import {
  buildCanonicalSidewalkRelataText,
  isUniqueAllowlisted,
  SIDEWALK_AFFECTED_GROUPS,
  SIDEWALK_CONDITIONS,
  SIDEWALK_PROBLEMS,
  type SidewalkAffectedGroup,
  type SidewalkCondition,
  type SidewalkProblem,
} from "@/lib/comun-sidewalk-p4-contract";

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
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ code: "invalid_request" }, { status: 400, headers });
  }

  const condition = String(body.condition ?? "") as SidewalkCondition;
  const problems = body.problems as SidewalkProblem[];
  const affectedGroups = body.affectedGroups as SidewalkAffectedGroup[];
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const idempotencyKey = String(body.idempotencyKey ?? "");
  const receiptSecret = String(body.receiptSecret ?? "");
  if (
    !SIDEWALK_CONDITIONS.includes(condition) ||
    !isUniqueAllowlisted(problems, SIDEWALK_PROBLEMS, 6) ||
    !isUniqueAllowlisted(affectedGroups, SIDEWALK_AFFECTED_GROUPS, 7) ||
    description.length > 300 ||
    !/^[A-Za-z0-9_-]{32,160}$/.test(idempotencyKey) ||
    !/^[A-Za-z0-9_-]{32,160}$/.test(receiptSecret)
  ) {
    return NextResponse.json({ code: "invalid_request" }, { status: 400, headers });
  }

  const db = createComunRelataPersistenceClient();
  const originalText = buildCanonicalSidewalkRelataText({ condition, problems, description });
  const created = await db.rpc("comun_relata_create", {
    p_idempotency_key: idempotencyKey,
    p_receipt_secret: receiptSecret,
    p_original_text: originalText,
    p_answers: {},
    p_category: "sidewalk_accessibility",
    p_urgency: condition === "terrible" ? "attention" : "routine",
    p_rule_version: "relata-routing-v1",
    p_decision: {
      category: "sidewalk_accessibility",
      source: "sidewalk_structured_server_route",
      captureMode: "sidewalk_p4",
    },
    p_privacy_class: "public_after_sanitization",
    p_consent_version: "relata-consent-v1",
  });
  if (created.error || !Array.isArray(created.data) || !created.data[0]) {
    const conflict = created.error?.message?.includes("IDEMPOTENCY_CONFLICT");
    return NextResponse.json(
      { code: conflict ? "idempotency_conflict" : "persistence_unavailable" },
      { status: conflict ? 409 : 503, headers },
    );
  }

  const firstReceipt = normalizeComunRelataReceipt(created.data[0]);
  const receiptResult = await db.rpc("comun_relata_get_receipt", {
    p_protocol: firstReceipt.protocol,
    p_receipt_secret: receiptSecret,
  });
  if (receiptResult.error || !Array.isArray(receiptResult.data) || !receiptResult.data[0]) {
    return NextResponse.json({ code: "receipt_unavailable" }, { status: 503, headers });
  }
  const receipt = normalizeComunRelataReceipt(receiptResult.data[0]);
  const intake = await db.rpc("comun_sidewalk_intake_create", {
    p_protocol: receipt.protocol,
    p_receipt_secret: receiptSecret,
    p_condition: condition,
    p_problems: problems,
    p_affected_groups: affectedGroups,
  });
  const intakeReady = !intake.error && Array.isArray(intake.data) && Boolean(intake.data[0]);

  let walletRecoveryCode: string | undefined;
  let walletToken: string | null = null;
  if (isComunParticipationWalletEnabled()) {
    try {
      walletToken = readWalletToken(request);
      if (!walletToken) {
        const createdWallet = await createWallet(db);
        walletToken = createdWallet.token;
        walletRecoveryCode = createdWallet.recoveryCode;
      }
      await db.rpc("comun_participation_wallet_attach_relata", {
        p_token_hash_hex: walletSecretHash(walletToken),
        p_protocol: receipt.protocol,
        p_receipt_secret: receiptSecret,
      });
    } catch {
      // Wallet association is compensable; the Relata remains authoritative.
    }
  }

  const response = NextResponse.json(
    {
      receipt,
      intakeReady,
      noOfficialSend: true,
      nothingPublished: true,
      ...(walletRecoveryCode ? { walletRecoveryCode } : {}),
    },
    { status: 201, headers },
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
  if (walletToken) setWalletCookie(response, walletToken);
  return response;
}
