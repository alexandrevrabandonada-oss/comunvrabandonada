import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import {
  COMUN_RELATA_RECEIPT_COOKIE,
  createComunRelataPersistenceClient,
} from "./comun-relata-persistence";
import {
  isComunRelataPublicMapEnabled,
} from "./comun-relata-evidence-feature";
import {
  sanitizeComunRelataPublicProjection,
  type PublicProjectionRow,
} from "./comun-relata-public-projection";

export const COMUN_RELATA_PUBLIC_NO_STORE = {
  "cache-control": "private, no-store, max-age=0",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow, noarchive",
};
export const COMUN_RELATA_CONFIRM_COOKIE = "comun_relata_public_confirm_v1";

export function publicMapRuntimeEnabled() {
  return isComunRelataPublicMapEnabled();
}

function normalizeRows(data: unknown): PublicProjectionRow[] {
  return Array.isArray(data) ? (data as PublicProjectionRow[]) : [];
}

export async function listLocalPublicProjections(input: {
  category?: string;
  state?: string;
  limit: number;
}) {
  if (!publicMapRuntimeEnabled()) return null;
  const db = createComunRelataPersistenceClient();
  const { data, error } = await db.rpc("comun_relata_public_list", {
    p_category: input.category ?? null,
    p_projection_state: input.state ?? "visible_local_preview",
    p_limit: input.limit,
  });
  if (error) throw new Error("RELATA_PUBLIC_LOCAL_UNAVAILABLE");
  return normalizeRows(data).map(sanitizeComunRelataPublicProjection);
}

export async function getLocalPublicProjection(publicId: string) {
  if (!publicMapRuntimeEnabled() || !/^[0-9a-f-]{36}$/i.test(publicId)) return null;
  const db = createComunRelataPersistenceClient();
  const { data, error } = await db.rpc("comun_relata_public_get", { p_public_id: publicId });
  if (error || !Array.isArray(data) || !data[0]) return null;
  return sanitizeComunRelataPublicProjection(data[0] as PublicProjectionRow);
}

function getOrCreateToken(request: NextRequest) {
  const existing = request.cookies.get(COMUN_RELATA_CONFIRM_COOKIE)?.value;
  if (existing && /^[A-Za-z0-9_-]{32,128}$/.test(existing)) return { token: existing, created: false };
  return { token: randomBytes(32).toString("base64url"), created: true };
}

export function hashConfirmationToken(token: string) {
  return createHash("sha256").update(`comun-relata-confirm-v1:${token}`, "utf8").digest();
}

export async function confirmLocalPublicProjection(request: NextRequest, publicId: string, undo: boolean) {
  if (!publicMapRuntimeEnabled() || !/^[0-9a-f-]{36}$/i.test(publicId)) return null;
  const { token, created } = getOrCreateToken(request);
  const db = createComunRelataPersistenceClient();
  const { data, error } = await db.rpc("comun_relata_public_confirm", {
    p_public_id: publicId,
    p_token_hash: `\\x${hashConfirmationToken(token).toString("hex")}`,
    p_undo: undo,
  });
  if (error || !Array.isArray(data) || !data[0]) return null;
  return { result: data[0] as { active: boolean; confirmation_count: number }, setCookie: created ? token : null };
}

export function isReceiptCookiePresent(request: NextRequest) {
  return Boolean(request.cookies.get(COMUN_RELATA_RECEIPT_COOKIE)?.value);
}
