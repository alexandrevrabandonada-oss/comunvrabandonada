import { NextRequest, NextResponse } from "next/server";
import {
  COMUN_RELATA_RECEIPT_COOKIE,
  createComunRelataPersistenceClient,
  decodeComunRelataReceiptCookie,
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
  createComunSidewalkProgressiveCaptureDecision,
  isComunSidewalkProgressiveCaptureEnabled,
} from "@/lib/comun-sidewalk-progressive-capture";
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
const dormant = () =>
  NextResponse.json({ code: "not_found" }, { status: 404, headers });
export const GET = dormant;
export const PUT = dormant;
export const DELETE = dormant;
export const HEAD = dormant;
export const OPTIONS = dormant;

type SidewalkDetails = {
  condition: SidewalkCondition;
  problems: SidewalkProblem[];
  affectedGroups: SidewalkAffectedGroup[];
  description: string;
};

async function readBody(request: NextRequest) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readDetails(body: Record<string, unknown>): SidewalkDetails | null {
  const condition = String(body.condition ?? "") as SidewalkCondition;
  const problems = body.problems as SidewalkProblem[];
  const affectedGroups = body.affectedGroups as SidewalkAffectedGroup[];
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (
    !SIDEWALK_CONDITIONS.includes(condition) ||
    !isUniqueAllowlisted(problems, SIDEWALK_PROBLEMS, 6) ||
    !isUniqueAllowlisted(affectedGroups, SIDEWALK_AFFECTED_GROUPS, 7) ||
    description.length > 300
  ) {
    return null;
  }
  return { condition, problems, affectedGroups, description };
}

async function attachWallet(
  request: NextRequest,
  db: ReturnType<typeof createComunRelataPersistenceClient>,
  protocol: string,
  receiptSecret: string,
) {
  let recoveryCode: string | undefined;
  let token: string | null = null;
  if (!isComunParticipationWalletEnabled()) return { recoveryCode, token };
  try {
    token = readWalletToken(request);
    if (!token) {
      const created = await createWallet(db);
      token = created.token;
      recoveryCode = created.recoveryCode;
    }
    await db.rpc("comun_participation_wallet_attach_relata", {
      p_token_hash_hex: walletSecretHash(token),
      p_protocol: protocol,
      p_receipt_secret: receiptSecret,
    });
  } catch {
    // Wallet association is compensable; the Relata remains authoritative.
  }
  return { recoveryCode, token };
}

async function createdResponse(input: {
  request: NextRequest;
  db: ReturnType<typeof createComunRelataPersistenceClient>;
  createdData: Parameters<typeof normalizeComunRelataReceipt>[0];
  receiptSecret: string;
  intakeReady: boolean;
  progressiveCapture: boolean;
}) {
  const firstReceipt = normalizeComunRelataReceipt(input.createdData);
  const receiptResult = await input.db.rpc("comun_relata_get_receipt", {
    p_protocol: firstReceipt.protocol,
    p_receipt_secret: input.receiptSecret,
  });
  if (
    receiptResult.error ||
    !Array.isArray(receiptResult.data) ||
    !receiptResult.data[0]
  ) {
    return NextResponse.json(
      { code: "receipt_unavailable" },
      { status: 503, headers },
    );
  }
  const receipt = normalizeComunRelataReceipt(receiptResult.data[0]);
  const wallet = await attachWallet(
    input.request,
    input.db,
    receipt.protocol,
    input.receiptSecret,
  );
  const response = NextResponse.json(
    {
      receipt,
      intakeReady: input.intakeReady,
      progressiveCapture: input.progressiveCapture,
      noOfficialSend: true,
      nothingPublished: true,
      ...(wallet.recoveryCode
        ? { walletRecoveryCode: wallet.recoveryCode }
        : {}),
    },
    { status: 201, headers },
  );
  response.cookies.set(
    COMUN_RELATA_RECEIPT_COOKIE,
    encodeComunRelataReceiptCookie(receipt.protocol, input.receiptSecret),
    {
      httpOnly: true,
      secure: input.request.nextUrl.protocol === "https:",
      sameSite: "strict",
      path: "/api/comun/relata",
    },
  );
  if (wallet.token) setWalletCookie(response, wallet.token);
  return response;
}

async function createProgressiveCapture(
  request: NextRequest,
  body: Record<string, unknown>,
) {
  const idempotencyKey = String(body.idempotencyKey ?? "");
  const receiptSecret = String(body.receiptSecret ?? "");
  if (
    body.phase !== "capture" ||
    body.text !== null ||
    body.hasPhoto !== true ||
    ["condition", "problems", "affectedGroups", "description"].some((key) =>
      Object.hasOwn(body, key),
    ) ||
    !/^[A-Za-z0-9_-]{32,160}$/.test(idempotencyKey) ||
    !/^[A-Za-z0-9_-]{32,160}$/.test(receiptSecret)
  ) {
    return NextResponse.json(
      { code: "invalid_request" },
      { status: 400, headers },
    );
  }
  const decision = createComunSidewalkProgressiveCaptureDecision();
  const db = createComunRelataPersistenceClient();
  const created = await db.rpc("comun_relata_create", {
    p_idempotency_key: idempotencyKey,
    p_receipt_secret: receiptSecret,
    p_original_text: null,
    p_answers: {},
    p_category: decision.category,
    p_urgency: decision.urgency,
    p_rule_version: decision.ruleVersion,
    p_decision: decision,
    p_privacy_class: decision.privacy,
    p_consent_version: "relata-consent-v1",
  });
  if (created.error || !Array.isArray(created.data) || !created.data[0]) {
    const conflict = created.error?.message?.includes("IDEMPOTENCY_CONFLICT");
    return NextResponse.json(
      { code: conflict ? "idempotency_conflict" : "persistence_unavailable" },
      { status: conflict ? 409 : 503, headers },
    );
  }
  return createdResponse({
    request,
    db,
    createdData: created.data[0],
    receiptSecret,
    intakeReady: false,
    progressiveCapture: true,
  });
}

async function createLegacyIntake(
  request: NextRequest,
  body: Record<string, unknown>,
) {
  const details = readDetails(body);
  const idempotencyKey = String(body.idempotencyKey ?? "");
  const receiptSecret = String(body.receiptSecret ?? "");
  if (
    !details ||
    !/^[A-Za-z0-9_-]{32,160}$/.test(idempotencyKey) ||
    !/^[A-Za-z0-9_-]{32,160}$/.test(receiptSecret)
  ) {
    return NextResponse.json(
      { code: "invalid_request" },
      { status: 400, headers },
    );
  }
  const db = createComunRelataPersistenceClient();
  const originalText = buildCanonicalSidewalkRelataText(details);
  const created = await db.rpc("comun_relata_create", {
    p_idempotency_key: idempotencyKey,
    p_receipt_secret: receiptSecret,
    p_original_text: originalText,
    p_answers: {},
    p_category: "sidewalk_accessibility",
    p_urgency: details.condition === "terrible" ? "attention" : "routine",
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
  const receipt = normalizeComunRelataReceipt(created.data[0]);
  const intake = await db.rpc("comun_sidewalk_intake_create", {
    p_protocol: receipt.protocol,
    p_receipt_secret: receiptSecret,
    p_condition: details.condition,
    p_problems: details.problems,
    p_affected_groups: details.affectedGroups,
  });
  const intakeReady =
    !intake.error && Array.isArray(intake.data) && Boolean(intake.data[0]);
  return createdResponse({
    request,
    db,
    createdData: created.data[0],
    receiptSecret,
    intakeReady,
    progressiveCapture: false,
  });
}

export async function POST(request: NextRequest) {
  if (!isComunSidewalkRelataEnabled()) return dormant();
  const body = await readBody(request);
  if (!body)
    return NextResponse.json(
      { code: "invalid_request" },
      { status: 400, headers },
    );
  if (body.phase === "capture") {
    if (!isComunSidewalkProgressiveCaptureEnabled()) return dormant();
    return createProgressiveCapture(request, body);
  }
  return createLegacyIntake(request, body);
}

export async function PATCH(request: NextRequest) {
  if (!isComunSidewalkProgressiveCaptureEnabled()) return dormant();
  const proof = decodeComunRelataReceiptCookie(
    request.cookies.get(COMUN_RELATA_RECEIPT_COOKIE)?.value,
  );
  if (!proof) return dormant();
  const body = await readBody(request);
  const details = body ? readDetails(body) : null;
  if (!details || body?.phase !== "complete" || details.description) {
    return NextResponse.json(
      { code: "invalid_request" },
      { status: 400, headers },
    );
  }
  const db = createComunRelataPersistenceClient();
  const intake = await db.rpc("comun_sidewalk_intake_create", {
    p_protocol: proof.protocol,
    p_receipt_secret: proof.receiptSecret,
    p_condition: details.condition,
    p_problems: details.problems,
    p_affected_groups: details.affectedGroups,
  });
  if (intake.error || !Array.isArray(intake.data) || !intake.data[0]) {
    return NextResponse.json(
      { code: "intake_unavailable" },
      { status: 409, headers },
    );
  }
  return NextResponse.json(
    {
      intakeReady: true,
      intake: { state: intake.data[0].review_state },
      sameProtocol: true,
      noOfficialSend: true,
      nothingPublished: true,
    },
    { headers },
  );
}
