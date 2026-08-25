import { NextRequest, NextResponse } from "next/server";
import {
  isCivicAssistedCategory,
  isCivicEmergencyContext,
  isComunCivicForwardingAssistedEnabled,
  validateCivicForwardingInput,
} from "@/lib/comun-civic-forwarding-feature";
import { forwardingDb } from "@/lib/comun-forwarding-runtime";
import { readWalletToken, walletSecretHash } from "@/lib/comun-participation-wallet-runtime";
import {
  findCivicInstitutionalChannel,
  listCivicInstitutionalChannels,
  publicCivicInstitutionalChannel,
} from "@/lib/server/comun-civic-institutional-channel-catalog";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store, max-age=0" };
const dormant = () => NextResponse.json({ code: "not_found" }, { status: 404, headers });
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });
const uuid = (value: unknown) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;

async function body(request: NextRequest) {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function tokenHash(request: NextRequest) {
  const token = readWalletToken(request);
  return token ? walletSecretHash(token) : null;
}

async function contextFor(hash: string, walletItemId: string) {
  const result = await forwardingDb().rpc("comun_civic_wallet_item_context", {
    p_token_hash_hex: hash,
    p_wallet_item_id: walletItemId,
  });
  const value = Array.isArray(result.data) ? result.data[0] : null;
  if (result.error || !value || !isCivicAssistedCategory(value.category)) return null;
  const context = {
    category: value.category,
    urgency: typeof value.urgency === "string" ? value.urgency : null,
    immediateDanger: value.immediate_danger === true,
    smokeActive: value.smoke_active === true,
    floodActiveRisk: value.flood_active_risk === true,
    treeFallState: typeof value.tree_fall_state === "string" ? value.tree_fall_state : null,
  };
  if (isCivicEmergencyContext(context) || !isComunCivicForwardingAssistedEnabled(context.category)) return null;
  return context;
}

function subject(category: string) {
  const labels: Record<string, string> = {
    waste_or_debris: "Lixo ou entulho em área pública",
    smoke_or_environmental_trace: "Vestígio ambiental ou fumaça não ativa",
    environmental_pollution: "Poluição ambiental",
    stormwater_drainage: "Drenagem ou bueiro",
    urban_flooding: "Alagamento sem risco imediato",
    tree_hazard: "Avaliação de árvore ou galho",
  };
  return labels[category] ?? "Encaminhamento de serviço público";
}

async function listedCivicPackage(hash: string, walletItemId: string, packageId?: string) {
  const result = await forwardingDb().rpc("comun_assisted_forwarding_list", {
    p_token_hash_hex: hash,
    p_wallet_item_id: walletItemId,
  });
  if (result.error || !Array.isArray(result.data)) return null;
  const value = (result.data as Array<Record<string, unknown>>).filter(
    (entry) => entry.source_domain === "civic_service",
  );
  return packageId ? value.find((entry) => entry.package_id === packageId) ?? null : value[0] ?? null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const hash = tokenHash(request);
  const path = (await context.params).path;
  const walletItemId = path[0] === "packages" ? uuid(path[1]) : null;
  if (!hash || !walletItemId || path.length !== 2) return dormant();
  try {
    const access = await contextFor(hash, walletItemId);
    if (!access) return dormant();
    const result = await forwardingDb().rpc("comun_assisted_forwarding_list", {
      p_token_hash_hex: hash,
      p_wallet_item_id: walletItemId,
    });
    if (result.error) return dormant();
    return json({
      packages: (Array.isArray(result.data) ? result.data : []).filter(
        (entry) => (entry as Record<string, unknown>).source_domain === "civic_service",
      ),
      channels: listCivicInstitutionalChannels(access.category).map(publicCivicInstitutionalChannel),
      noOfficialSend: true,
    });
  } catch {
    return dormant();
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const hash = tokenHash(request);
  if (!hash) return dormant();
  const path = (await context.params).path;
  const input = await body(request);
  const walletItemId = path[0] === "packages" ? uuid(path[1]) : null;
  if (!walletItemId) return dormant();
  const db = forwardingDb();
  try {
    const access = await contextFor(hash, walletItemId);
    if (!access) return dormant();
    if (path[2] === "preview" && path.length === 3) {
      const checked = validateCivicForwardingInput({
        publicReference: typeof input.publicReference === "string" ? input.publicReference : "",
        personAuthoredSummary: typeof input.personAuthoredSummary === "string" ? input.personAuthoredSummary : "",
      });
      if (!checked.ok) return json(checked, 422);
      return json({
        preview: {
          subject: subject(access.category),
          publicReference: checked.value.publicReference,
          personAuthoredSummary: checked.value.personAuthoredSummary,
          warning: "Esta prévia não inclui contato, documento, coordenada privada ou endereço residencial exato.",
        },
      });
    }
    if (path[2] === "prepare" && path.length === 3) {
      if (input.previewConfirmed !== true) return dormant();
      const checked = validateCivicForwardingInput({
        publicReference: typeof input.publicReference === "string" ? input.publicReference : "",
        personAuthoredSummary: typeof input.personAuthoredSummary === "string" ? input.personAuthoredSummary : "",
      });
      if (!checked.ok) return json(checked, 422);
      const result = await db.rpc("comun_civic_assisted_prepare", {
        p_token_hash_hex: hash,
        p_wallet_item_id: walletItemId,
        p_public_reference: checked.value.publicReference,
        p_person_authored_summary: checked.value.personAuthoredSummary,
        p_preview_confirmed: true,
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant();
      return json({ package: result.data[0], noOfficialSend: true }, 201);
    }
    if (path[3] === "open" && uuid(path[2]) && path.length === 4) {
      const selected = await listedCivicPackage(hash, walletItemId, path[2]);
      if (!selected || selected.category !== access.category) return dormant();
      const channelId = typeof input.channelId === "string" ? input.channelId : "";
      const channel = findCivicInstitutionalChannel(access.category, channelId);
      if (!channel || channel.automationAllowed) return dormant();
      const result = await db.rpc("comun_assisted_forwarding_open", {
        p_token_hash_hex: hash,
        p_package_id: path[2],
        p_channel: channel.channelType,
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant();
      return json({
        attempt: result.data[0],
        destination: channel.destination,
        channel: publicCivicInstitutionalChannel(channel),
        noOfficialSend: true,
      });
    }
    if (path[0] === "attempts" && uuid(path[1]) && path[2] === "declare-sent" && path.length === 3) {
      if (typeof input.sent !== "boolean") return dormant();
      const result = await db.rpc("comun_assisted_forwarding_declare_sent", {
        p_token_hash_hex: hash,
        p_attempt_id: path[1],
        p_sent: input.sent,
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant();
      return json({ attempt: result.data[0], personDeclared: true });
    }
    if (path[0] === "attempts" && uuid(path[1]) && path[2] === "response" && path.length === 3) {
      const note = typeof input.note === "string" ? input.note.trim().slice(0, 600) : "";
      const protocol = typeof input.officialProtocol === "string" ? input.officialProtocol.trim().slice(0, 240) : "";
      if (!note) return dormant();
      const result = await db.rpc("comun_assisted_forwarding_record_response", {
        p_token_hash_hex: hash,
        p_attempt_id: path[1],
        p_response_note: note,
        p_official_protocol: protocol || null,
        p_resolved: input.resolved === true,
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0]) return dormant();
      return json({ attempt: result.data[0] });
    }
    if (path[3] === "withdraw" && uuid(path[2]) && path.length === 4) {
      const selected = await listedCivicPackage(hash, walletItemId, path[2]);
      if (!selected) return dormant();
      const result = await db.rpc("comun_assisted_forwarding_withdraw", {
        p_token_hash_hex: hash,
        p_package_id: path[2],
      });
      return result.error || result.data !== true ? dormant() : json({ withdrawn: true });
    }
    return dormant();
  } catch {
    return dormant();
  }
}

export const PUT = dormant;
export const PATCH = dormant;
export const DELETE = dormant;
export const HEAD = dormant;
export const OPTIONS = dormant;
