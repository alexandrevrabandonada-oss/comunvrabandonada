import { NextRequest, NextResponse } from "next/server";
import { isComunStmuAssistedEnabled } from "@/lib/comun-stmu-assisted-feature";
import { forwardingDb } from "@/lib/comun-forwarding-runtime";
import { readWalletToken, walletSecretHash } from "@/lib/comun-participation-wallet-runtime";
import { validateStmuDestination } from "@/lib/comun-stmu-whatsapp";
import { STMU_EMAIL_CHANNEL, STMU_PHONE, validateStmuEmailDestination } from "@/lib/comun-stmu-multichannel";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store, max-age=0" };
const dormant = () => NextResponse.json({ code: "not_found" }, { status: 404, headers });
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });
const uuid = (value: unknown) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;

async function body(request: NextRequest) {
  try { const value = await request.json(); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
  catch { return {}; }
}

function authorized(request: NextRequest) {
  if (!isComunStmuAssistedEnabled()) return null;
  const token = readWalletToken(request);
  return token ? walletSecretHash(token) : null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const tokenHash = authorized(request); if (!tokenHash) return dormant();
  const path = (await context.params).path;
  const walletItemId = path[0] === "packages" ? uuid(path[1]) : null;
  if (!walletItemId || path.length !== 2) return dormant();
  try {
    const result = await forwardingDb().rpc("comun_stmu_assisted_list", { p_token_hash_hex: tokenHash, p_wallet_item_id: walletItemId });
    if (result.error) return dormant();
    return json({ packages: Array.isArray(result.data) ? result.data : [] });
  } catch { return dormant(); }
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const tokenHash = authorized(request); if (!tokenHash) return dormant();
  const path = (await context.params).path; const input = await body(request); const db = forwardingDb();
  try {
    if (path[0] === "packages" && uuid(path[1]) && path[2] === "prepare") {
      const result = await db.rpc("comun_stmu_assisted_prepare", { p_token_hash_hex: tokenHash, p_wallet_item_id: path[1] });
      if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant();
      return json({ package: result.data[0], noOfficialSend: true }, 201);
    }
    if (path[0] === "packages" && uuid(path[1]) && path[2] === "open") {
      const channel = typeof input.channel === "string" ? input.channel : "";
      if (!["whatsapp", "email", "phone", "in_person"].includes(channel)) return dormant();
      const result = await db.rpc("comun_stmu_assisted_open", { p_token_hash_hex: tokenHash, p_package_id: path[1], p_channel: channel });
      if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant();
      const row = result.data[0] as { channel_url?: string | null };
      const valid = channel === "whatsapp" ? validateStmuDestination(String(row.channel_url ?? "")).valid
        : channel === "email" ? validateStmuEmailDestination(String(row.channel_url ?? ""))
        : channel === "phone" ? row.channel_url === `tel:${STMU_PHONE}` : row.channel_url === null;
      if (!valid) return dormant();
      return json({ attempt: row, destination: channel === "email" ? STMU_EMAIL_CHANNEL.destination : row.channel_url, noOfficialSend: true });
    }
    if (path[0] === "attempts" && uuid(path[1]) && path[2] === "declare-sent") {
      if (typeof input.sent !== "boolean") return dormant();
      const result = await db.rpc("comun_stmu_assisted_declare_sent", { p_token_hash_hex: tokenHash, p_attempt_id: path[1], p_sent: input.sent });
      if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant();
      return json({ attempt: result.data[0], personDeclared: true });
    }
    if (path[0] === "attempts" && uuid(path[1]) && path[2] === "response") {
      const note = typeof input.note === "string" ? input.note.trim().slice(0, 600) : "";
      const protocol = typeof input.officialProtocol === "string" ? input.officialProtocol.trim().slice(0, 240) : "";
      if (!note) return dormant();
      const result = await db.rpc("comun_stmu_assisted_record_response", { p_token_hash_hex: tokenHash, p_attempt_id: path[1], p_response_note: note, p_official_protocol: protocol || null, p_resolved: input.resolved === true });
      if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant();
      return json({ attempt: result.data[0] });
    }
    return dormant();
  } catch { return dormant(); }
}

export const PUT = dormant;
export const PATCH = dormant;
export const DELETE = dormant;
export const HEAD = dormant;
export const OPTIONS = dormant;
