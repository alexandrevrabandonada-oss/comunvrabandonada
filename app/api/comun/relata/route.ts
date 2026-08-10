import { NextRequest, NextResponse } from "next/server";
import {
  COMUN_RELATA_RECEIPT_COOKIE,
  createComunRelataPersistenceClient,
  encodeComunRelataReceiptCookie,
  isComunRelataPersistenceEnabled,
  normalizeComunRelataReceipt,
} from "@/lib/comun-relata-persistence";
import { routeRelata } from "@/lib/comun-relata-routing";
import { isComunRelataAttachmentsEnabled } from "@/lib/comun-relata-evidence-feature";
import {
  createComunRelataPhotoOnlyDecision,
  isComunRelataPhotoOnlyCapture,
  isComunRelataPhotoOnlyEnabled,
} from "@/lib/comun-relata-photo-first";
import { associateComunRelataCollective } from "@/lib/comun-relata-evidence-runtime";
import { isComunQuickCaptureEnabled } from "@/lib/comun-capture-feature";
import { isComunParticipationWalletEnabled } from "@/lib/comun-participation-wallet-feature";
import {
  createWallet,
  readWalletToken,
  setWalletCookie,
  walletSecretHash,
} from "@/lib/comun-participation-wallet-runtime";
import {
  applyComunEssentialServicesRoutingGate,
  isComunEssentialServicesEnabled,
  isEssentialServiceCategory,
} from "@/lib/comun-essential-services-feature";
import { isComunEnvironmentalIncidentsEnabled } from "@/lib/comun-environmental-incidents-feature";
import { isComunUrbanIncidentsEnabled } from "@/lib/comun-urban-incidents-feature";
import { isComunPublicHealthSensitiveRoutingEnabled } from "@/lib/comun-public-health-sensitive-feature";
import { isComunPublicEducationSensitiveRoutingEnabled } from "@/lib/comun-public-education-sensitive-feature";
import { isComunChildProtectionPrivateRoutingEnabled } from "@/lib/comun-child-protection-feature";

export const runtime = "nodejs";

const noStoreHeaders = { "cache-control": "no-store, max-age=0" };

function dormant() {
  return NextResponse.json(
    { code: "not_found" },
    { status: 404, headers: noStoreHeaders },
  );
}

export function GET() {
  return dormant();
}

export function PUT() {
  return dormant();
}

export function PATCH() {
  return dormant();
}

export function DELETE() {
  return dormant();
}

export function HEAD() {
  return dormant();
}

export function OPTIONS() {
  return dormant();
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
  const wantsQuickCapture = body.captureMode === "quick_v2";
  const quickCapture = wantsQuickCapture && isComunQuickCaptureEnabled();
  const attachmentsEnabled = isComunRelataAttachmentsEnabled();
  const hasPhoto = body.hasPhoto === true;
  const photoOnlyEnabled = isComunRelataPhotoOnlyEnabled();
  const photoOnly = isComunRelataPhotoOnlyCapture({
    text,
    semanticTextAbsent: body.text === null,
    hasPhoto,
    quickCapture,
    photoOnlyEnabled,
  });
  if (wantsQuickCapture && !quickCapture) return dormant();
  const allowedAnswerKeys = new Set([
    "homes_power",
    "smoke_active",
    "flood_active_risk",
    "tree_state",
    "health_issue_type",
    "education_issue_type",
    "child_immediate_danger",
    "blocked",
    "line",
    "direction",
    "unit",
    "school_type",
  ]);
  const binaryAdaptiveAnswerKeys = new Set(["homes_power", "blocked"]);

  if (
    (!photoOnly && text.length < 8) ||
    text.length > 600 ||
    !/^[A-Za-z0-9_-]{32,160}$/.test(idempotencyKey) ||
    !/^[A-Za-z0-9_-]{32,160}$/.test(receiptSecret) ||
    Object.keys(answers).some(
      (key) =>
        !allowedAnswerKeys.has(key) ||
        (binaryAdaptiveAnswerKeys.has(key) &&
          !["sim", "nao"].includes(answers[key])) ||
        (key === "smoke_active" &&
          !["sim", "nao", "nao_sei"].includes(answers[key])) ||
        (key === "flood_active_risk" &&
          !["sim", "nao", "nao_sei"].includes(answers[key])) ||
        (key === "tree_state" &&
          !["caiu", "em_pe", "nao_sei"].includes(answers[key])) ||
        (key === "health_issue_type" &&
          ![
            "access_or_waiting",
            "exam_or_procedure",
            "medicine_or_supply",
            "staff_or_service_availability",
            "facility_or_accessibility",
            "care_conduct",
            "transfer_or_health_transport",
            "information_or_followup",
            "other_health_service",
          ].includes(answers[key])) ||
        (key === "education_issue_type" &&
          ![
            "staff_or_service_availability",
            "infrastructure_or_climate",
            "school_meals_or_supplies",
            "school_transport_or_access",
            "accessibility_or_inclusion",
            "enrollment_or_attendance",
            "discrimination_or_bullying",
            "information_or_management",
            "other_education_service",
          ].includes(answers[key])) ||
        (key === "child_immediate_danger" &&
          !["sim", "nao", "nao_sei"].includes(answers[key])),
    )
  ) {
    return NextResponse.json(
      { code: "invalid_request" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  if (
    (body.captureMode === "quick_v2" && hasPhoto && !attachmentsEnabled) ||
    (photoOnly && Object.keys(answers).length > 0)
  ) {
    return NextResponse.json(
      { code: "invalid_request" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const input = {
    text: photoOnly ? null : text,
    answers,
    hasAttachment: quickCapture && hasPhoto,
  };
  const routedDecision = photoOnly
    ? createComunRelataPhotoOnlyDecision()
    : routeRelata(
        { ...input, text },
        {
          environmentalIncidentsEnabled: isComunEnvironmentalIncidentsEnabled(),
          urbanIncidentsEnabled: isComunUrbanIncidentsEnabled(),
          publicHealthSensitiveRoutingEnabled:
            isComunPublicHealthSensitiveRoutingEnabled(),
          publicEducationSensitiveRoutingEnabled:
            isComunPublicEducationSensitiveRoutingEnabled(),
          childProtectionPrivateRoutingEnabled:
            isComunChildProtectionPrivateRoutingEnabled(),
        },
      );
  const decision = applyComunEssentialServicesRoutingGate(
    routedDecision,
    isComunEssentialServicesEnabled(),
  );

  const db = createComunRelataPersistenceClient();
  const { data, error } = await db.rpc("comun_relata_create", {
    p_idempotency_key: idempotencyKey,
    p_receipt_secret: receiptSecret,
    p_original_text: photoOnly ? null : text,
    p_answers: answers,
    p_category: decision.category,
    p_urgency: decision.urgency,
    p_rule_version: decision.ruleVersion,
    p_decision: quickCapture
      ? {
          ...decision,
          captureMode: "quick_v2",
          captureState: "captured_private",
        }
      : decision,
    p_privacy_class: decision.privacyClass,
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
  await associateComunRelataCollective(db, {
    protocol: receipt.protocol,
    receiptSecret,
  });
  let walletRecoveryCode: string | undefined;
  let walletToken: string | null = null;
  let walletItemId: string | undefined;
  if (quickCapture && isComunParticipationWalletEnabled()) {
    try {
      const existingToken = readWalletToken(request);
      if (existingToken) {
        walletToken = existingToken;
      } else {
        const createdWallet = await createWallet(db);
        walletToken = createdWallet.token;
        walletRecoveryCode = createdWallet.recoveryCode;
      }
      if (walletToken) {
        const attached = await db.rpc(
          "comun_participation_wallet_attach_relata",
          {
            p_token_hash_hex: walletSecretHash(walletToken),
            p_protocol: receipt.protocol,
            p_receipt_secret: receiptSecret,
          },
        );
        const attachedItem = Array.isArray(attached.data)
          ? attached.data[0]
          : null;
        if (
          !attached.error &&
          attachedItem &&
          typeof attachedItem.item_id === "string"
        ) {
          walletItemId = attachedItem.item_id;
          if (
            isComunEssentialServicesEnabled() &&
            isEssentialServiceCategory(receipt.category)
          ) {
            await db.rpc("comun_essential_wallet_mark_ready", {
              p_token_hash_hex: walletSecretHash(walletToken),
              p_wallet_item_id: walletItemId,
            });
          }
        }
      }
    } catch {
      // A wallet association is compensable; the already-created Relata receipt is not rolled back.
    }
  }
  const response = NextResponse.json(
    {
      receipt,
      noOfficialSend: true,
      ...(walletRecoveryCode ? { walletRecoveryCode } : {}),
      ...(walletItemId ? { walletItemId } : {}),
    },
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
  if (walletToken) setWalletCookie(response, walletToken);
  return response;
}
