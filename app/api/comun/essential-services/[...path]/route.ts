import { NextRequest, NextResponse } from "next/server";
import {
  isComunEssentialForwardingAssistedEnabled,
  isEssentialServiceCategory,
} from "@/lib/comun-essential-services-feature";
import { forwardingDb } from "@/lib/comun-forwarding-runtime";
import {
  readWalletToken,
  walletSecretHash,
} from "@/lib/comun-participation-wallet-runtime";
import {
  findInstitutionalChannel,
  listInstitutionalChannels,
  publicInstitutionalChannel,
} from "@/lib/server/comun-institutional-channel-catalog";

export const runtime = "nodejs";

const headers = { "cache-control": "private, no-store, max-age=0" };
const dormant = () =>
  NextResponse.json({ code: "not_found" }, { status: 404, headers });
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, { status, headers });
const uuid = (value: unknown) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
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

function authorized(request: NextRequest) {
  if (!isComunEssentialForwardingAssistedEnabled()) return null;
  const token = readWalletToken(request);
  return token ? walletSecretHash(token) : null;
}

function channelView(category: string) {
  if (!isEssentialServiceCategory(category)) return [];
  return listInstitutionalChannels(category).map(publicInstitutionalChannel);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const tokenHash = authorized(request);
  if (!tokenHash) return dormant();
  const path = (await context.params).path;
  const walletItemId = path[0] === "packages" ? uuid(path[1]) : null;
  if (!walletItemId || path.length !== 2) return dormant();
  try {
    const result = await forwardingDb().rpc("comun_assisted_forwarding_list", {
      p_token_hash_hex: tokenHash,
      p_wallet_item_id: walletItemId,
    });
    if (result.error) return dormant();
    const packages = Array.isArray(result.data) ? result.data : [];
    const category = packages[0]?.category;
    return json({
      packages,
      channels: typeof category === "string" ? channelView(category) : [],
      noOfficialSend: true,
    });
  } catch {
    return dormant();
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const tokenHash = authorized(request);
  if (!tokenHash) return dormant();
  const path = (await context.params).path;
  const input = await body(request);
  const db = forwardingDb();
  try {
    if (
      path[0] === "packages" &&
      uuid(path[1]) &&
      path[2] === "prepare" &&
      path.length === 3
    ) {
      const result = await db.rpc("comun_essential_assisted_prepare", {
        p_token_hash_hex: tokenHash,
        p_wallet_item_id: path[1],
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0])
        return dormant();
      const value = result.data[0] as Record<string, unknown>;
      return json(
        {
          package: value,
          channels:
            typeof value.category === "string"
              ? channelView(value.category)
              : [],
          noOfficialSend: true,
        },
        201,
      );
    }
    if (
      path[0] === "packages" &&
      uuid(path[1]) &&
      uuid(path[2]) &&
      path[3] === "open" &&
      path.length === 4
    ) {
      const walletItemId = path[1];
      const packageId = path[2];
      const channelId =
        typeof input.channelId === "string" ? input.channelId : "";
      const listed = await db.rpc("comun_assisted_forwarding_list", {
        p_token_hash_hex: tokenHash,
        p_wallet_item_id: walletItemId,
      });
      const selected = Array.isArray(listed.data)
        ? (listed.data as Array<Record<string, unknown>>).find(
            (entry) => entry.package_id === packageId,
          )
        : null;
      if (
        listed.error ||
        !selected ||
        selected.source_domain !== "essential_service" ||
        !isEssentialServiceCategory(selected.category)
      )
        return dormant();
      const channel = findInstitutionalChannel(selected.category, channelId);
      if (!channel || channel.automationAllowed) return dormant();
      const result = await db.rpc("comun_assisted_forwarding_open", {
        p_token_hash_hex: tokenHash,
        p_package_id: packageId,
        p_channel: channel.channelType,
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0])
        return dormant();
      return json({
        attempt: result.data[0],
        destination: channel.destination,
        channel: publicInstitutionalChannel(channel),
        noOfficialSend: true,
      });
    }
    if (
      path[0] === "attempts" &&
      uuid(path[1]) &&
      path[2] === "declare-sent" &&
      path.length === 3 &&
      typeof input.sent === "boolean"
    ) {
      const result = await db.rpc("comun_assisted_forwarding_declare_sent", {
        p_token_hash_hex: tokenHash,
        p_attempt_id: path[1],
        p_sent: input.sent,
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0])
        return dormant();
      return json({ attempt: result.data[0], personDeclared: true });
    }
    if (
      path[0] === "attempts" &&
      uuid(path[1]) &&
      path[2] === "response" &&
      path.length === 3
    ) {
      const note =
        typeof input.note === "string" ? input.note.trim().slice(0, 600) : "";
      const protocol =
        typeof input.officialProtocol === "string"
          ? input.officialProtocol.trim().slice(0, 240)
          : "";
      if (!note) return dormant();
      const result = await db.rpc("comun_assisted_forwarding_record_response", {
        p_token_hash_hex: tokenHash,
        p_attempt_id: path[1],
        p_response_note: note,
        p_official_protocol: protocol || null,
        p_resolved: input.resolved === true,
      });
      if (result.error || !Array.isArray(result.data) || !result.data[0])
        return dormant();
      return json({ attempt: result.data[0] });
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
