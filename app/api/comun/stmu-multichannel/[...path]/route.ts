import { NextRequest, NextResponse } from "next/server";
import { isComunStmuMultichannelEnabled } from "@/lib/comun-stmu-multichannel-feature";
import {
  STMU_EMAIL_CHANNEL,
  validateStmuEmailDestination,
} from "@/lib/comun-stmu-multichannel";
import { forwardingDb, walletHash } from "@/lib/comun-forwarding-runtime";
import { readWalletToken } from "@/lib/comun-participation-wallet-runtime";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store, max-age=0" };
const dormant = () =>
  NextResponse.json({ code: "not_found" }, { status: 404, headers });
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers });
async function body(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
function text(value: unknown, max = 600) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!isComunStmuMultichannelEnabled()) return dormant();
  const token = readWalletToken(request);
  if (!token) return dormant();
  const path = (await context.params).path;
  try {
    if (path[0] === "observation")
      return json({
        whatsapp: {
          state: "menu_operational_complaint_flow_pending",
          protocol: "unconfirmed",
          questions: "pending",
        },
        email: STMU_EMAIL_CHANNEL,
        fieldEmail: { state: "candidate_unverified_blocked" },
        phone: { state: "source_verified_not_tested" },
        inPerson: { state: "source_verified_not_tested" },
        sequence: ["whatsapp", "official_email", "phone_or_in_person"],
      });
    if (path[0] === "packages" && path.length === 1) {
      const result = await forwardingDb().rpc("comun_forwarding_package_list", {
        p_token_hash_hex: walletHash(token),
      });
      if (result.error) return dormant();
      const packages = (Array.isArray(result.data) ? result.data : []).filter(
        (item: { adapter_id?: string }) =>
          item.adapter_id === "vr-stmu-whatsapp-complaint-v1" ||
          item.adapter_id === "vr-stmu-official-email-complaint-v1",
      );
      return json({ packages });
    }
    if (path[0] === "packages" && path[2] === "attempts" && path[1]) {
      const result = await forwardingDb().rpc("comun_forwarding_attempt_list", {
        p_token_hash_hex: walletHash(token),
        p_relata_case_id: path[1],
      });
      if (result.error) return dormant();
      return json({ attempts: result.data ?? [] });
    }
    return dormant();
  } catch {
    return dormant();
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!isComunStmuMultichannelEnabled()) return dormant();
  const token = readWalletToken(request);
  if (!token) return dormant();
  const path = (await context.params).path;
  const input = await body(request);
  const db = forwardingDb();
  try {
    if (path[0] === "packages" && path.length === 1) {
      const result = await db.rpc("comun_stmu_email_package_create", {
        p_token_hash_hex: walletHash(token),
        p_relata_case_id: text(input.relataCaseId, 80),
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0])
        return dormant();
      return json({ package: result.data[0] }, 201);
    }
    if (path[0] !== "packages" || !path[1]) return dormant();
    if (path[2] === "email-requirements") {
      const result = await db.rpc("comun_stmu_email_requirements_update", {
        p_token_hash_hex: walletHash(token),
        p_package_id: path[1],
        p_subject: text(input.subject, 240),
        p_line: text(input.line, 120),
        p_direction: text(input.direction, 120),
        p_location: text(input.location, 240),
        p_observed_at: text(input.observedAt, 120),
        p_vehicle_order: text(input.vehicleOrder, 120),
        p_confirm_text: input.confirmText === true,
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0])
        return dormant();
      return json({ package: result.data[0] });
    }
    if (path[2] === "email-review") {
      const result = await db.rpc("comun_forwarding_review", {
        p_token_hash_hex: walletHash(token),
        p_package_id: path[1],
        p_institutional_text: text(input.institutionalText, 3000),
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0])
        return dormant();
      return json({ package: result.data[0] });
    }
    if (path[2] === "email-opened") {
      const result = await db.rpc("comun_stmu_email_opened", {
        p_token_hash_hex: walletHash(token),
        p_package_id: path[1],
      });
      if (
        result.error ||
        !Array.isArray(result.data) ||
        !result.data[0] ||
        !validateStmuEmailDestination(result.data[0].channel_url)
      )
        return dormant();
      return json({
        opened: true,
        package: {
          ...result.data[0],
          channel_url: STMU_EMAIL_CHANNEL.destination,
        },
      });
    }
    if (path[2] === "declare-sent") {
      const result = await db.rpc("comun_stmu_email_declare_sent", {
        p_token_hash_hex: walletHash(token),
        p_package_id: path[1],
        p_result: text(input.result, 40),
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0])
        return dormant();
      return json({ package: result.data[0] });
    }
    return dormant();
  } catch {
    return dormant();
  }
}

export async function PATCH() {
  return dormant();
}
export async function DELETE() {
  return dormant();
}
export async function PUT() {
  return dormant();
}
