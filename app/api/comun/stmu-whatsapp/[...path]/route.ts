import { NextRequest, NextResponse } from "next/server";
import { isComunStmuWhatsappEnabled } from "@/lib/comun-stmu-whatsapp-feature";
import { STMU_WHATSAPP_CHANNEL, validateStmuDestination } from "@/lib/comun-stmu-whatsapp";
import { forwardingDb, walletHash } from "@/lib/comun-forwarding-runtime";
import { readWalletToken } from "@/lib/comun-participation-wallet-runtime";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store, max-age=0" };
const dormant = () => NextResponse.json({ code: "not_found" }, { status: 404, headers });
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
async function body(request: NextRequest): Promise<Record<string, unknown>> { try { const value = await request.json(); return value && typeof value === "object" ? value as Record<string, unknown> : {}; } catch { return {}; } }
function text(value: unknown, max = 600) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!isComunStmuWhatsappEnabled()) return dormant();
  const token = readWalletToken(request); if (!token) return dormant();
  const path = (await context.params).path;
  try {
    if (path.length === 1 && path[0] === "observation") return json({ channel: STMU_WHATSAPP_CHANNEL.id, adapter: STMU_WHATSAPP_CHANNEL.adapterId, state: STMU_WHATSAPP_CHANNEL.state, liveChannelReached: true, menuObserved: true, complaintOptionObserved: true, serviceHours: STMU_WHATSAPP_CHANNEL.serviceHours, protocol: "unconfirmed", tracking: "unconfirmed", responseExpectation: STMU_WHATSAPP_CHANNEL.responseExpectation });
    if (path.length === 1 && path[0] === "packages") {
      const result = await forwardingDb().rpc("comun_forwarding_package_list", { p_token_hash_hex: walletHash(token) });
      if (result.error) return dormant();
      const packages = (Array.isArray(result.data) ? result.data : []).filter((item: { adapter_id?: string }) => item.adapter_id === STMU_WHATSAPP_CHANNEL.adapterId);
      return json({ packages });
    }
    return dormant();
  } catch { return dormant(); }
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!isComunStmuWhatsappEnabled()) return dormant();
  const token = readWalletToken(request); if (!token) return dormant();
  const path = (await context.params).path; const input = await body(request); const db = forwardingDb();
  try {
    if (path.length === 1 && path[0] === "packages") {
      const result = await db.rpc("comun_stmu_package_create", { p_token_hash_hex: walletHash(token), p_relata_case_id: text(input.relataCaseId, 80) });
      if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant();
      return json({ package: result.data[0] }, 201);
    }
    const packageId = path[1]; if (!packageId) return dormant();
    if (path[2] === "review") {
      const result = await db.rpc("comun_forwarding_review", { p_token_hash_hex: walletHash(token), p_package_id: packageId, p_institutional_text: text(input.institutionalText, 3000) });
      if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant(); return json({ package: result.data[0] });
    }
    if (path[2] === "opened") {
      const result = await db.rpc("comun_forwarding_opened", { p_token_hash_hex: walletHash(token), p_package_id: packageId });
      if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant();
      const destination = validateStmuDestination(result.data[0].channel_url); if (!destination.valid) return dormant();
      return json({ opened: true, package: { ...result.data[0], channel_url: STMU_WHATSAPP_CHANNEL.officialUrl } });
    }
    if (path[2] === "declare-sent") {
      const result = await db.rpc("comun_stmu_declare_sent", { p_token_hash_hex: walletHash(token), p_package_id: packageId, p_result: text(input.result, 40) });
      if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant(); return json({ package: result.data[0] });
    }
    if (path[2] === "official-protocol") {
      const result = await db.rpc("comun_forwarding_record_official_protocol", { p_token_hash_hex: walletHash(token), p_package_id: packageId, p_protocol: text(input.protocol, 240) });
      if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant(); return json({ package: result.data[0] });
    }
    if (path[2] === "response") {
      const result = await db.rpc("comun_forwarding_record_response", { p_token_hash_hex: walletHash(token), p_package_id: packageId, p_note: text(input.note, 600), p_state: text(input.state, 40) || "response_recorded" });
      if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant(); return json({ package: result.data[0] });
    }
    return dormant();
  } catch { return dormant(); }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!isComunStmuWhatsappEnabled()) return dormant();
  const token = readWalletToken(request); if (!token) return dormant(); const path = (await context.params).path; if (path[0] !== "packages" || path[2] !== "requirements" || !path[1]) return dormant();
  const input = await body(request);
  try {
    const result = await forwardingDb().rpc("comun_stmu_requirements_update", { p_token_hash_hex: walletHash(token), p_package_id: path[1], p_name: text(input.name, 240), p_line: text(input.line, 120), p_direction: text(input.direction, 120), p_location: text(input.location, 240), p_observed_at: text(input.observedAt, 120), p_vehicle_order: text(input.vehicleOrder, 120), p_occurrence: text(input.occurrence, 120), p_confirm_text: input.confirmText === true });
    if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant(); return json({ package: result.data[0] });
  } catch { return dormant(); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!isComunStmuWhatsappEnabled()) return dormant(); const token = readWalletToken(request); if (!token) return dormant(); const path = (await context.params).path; if (path[0] !== "packages" || path[2] !== "withdraw" || !path[1]) return dormant();
  try { const result = await forwardingDb().rpc("comun_forwarding_withdraw", { p_token_hash_hex: walletHash(token), p_package_id: path[1] }); return result.error || result.data !== true ? dormant() : json({ withdrawn: true }); } catch { return dormant(); }
}
export async function PUT() { return dormant(); }
