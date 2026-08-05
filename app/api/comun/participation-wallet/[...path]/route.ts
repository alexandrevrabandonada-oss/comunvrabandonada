import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isComunParticipationWalletEnabled } from "@/lib/comun-participation-wallet-feature";
import {
  createWalletRecoveryCode,
  createWalletToken,
  isWalletRecoveryCode,
  readWalletToken,
  setWalletCookie,
  walletDb,
  walletSecretHash,
} from "@/lib/comun-participation-wallet-runtime";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store, max-age=0" };
function dormant() { return NextResponse.json({ code: "not_found" }, { status: 404, headers }); }
function bodyObject(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }

export async function GET() { return dormant(); }

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!isComunParticipationWalletEnabled()) return dormant();
  const path = (await context.params).path;
  let body: Record<string, unknown>;
  try { body = bodyObject(await request.json()); } catch { return NextResponse.json({ code: "invalid_request" }, { status: 400, headers }); }
  const token = readWalletToken(request);
  try {
    if (path[0] === "recovery" && path[1] === "redeem") {
      const code = typeof body.recoveryCode === "string" ? body.recoveryCode.trim().toUpperCase() : "";
      if (!isWalletRecoveryCode(code)) return NextResponse.json({ code: "invalid_recovery" }, { status: 400, headers });
      const newToken = createWalletToken();
      const { data } = await walletDb().rpc("comun_participation_wallet_redeem", { p_recovery_code_hash_hex: walletSecretHash(code), p_new_token_hash_hex: walletSecretHash(newToken) });
      if (!Array.isArray(data) || !data[0]?.recovery_ok) return NextResponse.json({ code: "recovery_unavailable" }, { status: 404, headers });
      const { data: items } = await walletDb().rpc("comun_participation_wallet_list", { p_token_hash_hex: walletSecretHash(newToken) });
      const response = NextResponse.json({ recovered: true, items: Array.isArray(items) ? items : [] }, { headers });
      setWalletCookie(response, newToken);
      return response;
    }

    if (path[0] === "recovery" && path[1] === "rotate") {
      if (!token) return dormant();
      const newToken = createWalletToken(); const code = createWalletRecoveryCode();
      const { data } = await walletDb().rpc("comun_participation_wallet_rotate_recovery", { p_token_hash_hex: walletSecretHash(token), p_new_recovery_hash_hex: walletSecretHash(code), p_new_token_hash_hex: walletSecretHash(newToken) });
      if (!Array.isArray(data) || !data[0]?.rotated) return dormant();
      const response = NextResponse.json({ rotated: true, recoveryCode: code }, { headers }); setWalletCookie(response, newToken); return response;
    }

    if (!token) return dormant();
    const db = walletDb(); const tokenHash = walletSecretHash(token);
    if (path[0] === "account" && path[1] === "link") {
      const server = await createSupabaseServerClient();
      const { data: auth } = server ? await server.auth.getUser() : { data: { user: null } };
      if (!auth.user?.id) return dormant();
      const { data, error } = await db.rpc("comun_participation_wallet_link_account", {
        p_token_hash_hex: tokenHash,
        p_user_id: auth.user.id,
        p_link_method: "explicit_account_link",
      });
      if (error || !Array.isArray(data) || !data[0]?.linked) return dormant();
      return NextResponse.json({ linked: true }, { headers });
    }
    if (path[0] === "items" && path[1] === "claim-relata") {
      const protocol = typeof body.protocol === "string" ? body.protocol : ""; const receiptSecret = typeof body.receiptSecret === "string" ? body.receiptSecret : "";
      const { data, error } = await db.rpc("comun_participation_wallet_attach_relata", { p_token_hash_hex: tokenHash, p_protocol: protocol, p_receipt_secret: receiptSecret });
      if (error || !Array.isArray(data) || !data[0]) return dormant(); return NextResponse.json({ item: data[0] }, { status: 201, headers });
    }
    if (path[0] === "items" && path[1] === "follow-legacy") {
      const protocol = typeof body.protocol === "string" ? body.protocol : ""; const { data, error } = await db.rpc("comun_participation_wallet_follow_legacy", { p_token_hash_hex: tokenHash, p_protocol: protocol });
      if (error || !Array.isArray(data) || !data[0]) return dormant(); return NextResponse.json({ item: data[0] }, { status: 201, headers });
    }
    if (path[0] === "items" && path[1] === "follow-case") {
      const publicCaseId = typeof body.publicCaseId === "string" ? body.publicCaseId : ""; const category = typeof body.category === "string" ? body.category : null; const { data, error } = await db.rpc("comun_participation_wallet_follow_case", { p_token_hash_hex: tokenHash, p_public_case_id: publicCaseId, p_category: category });
      if (error || !Array.isArray(data) || !data[0]) return dormant(); return NextResponse.json({ item: data[0] }, { status: 201, headers });
    }
    if (path[0] === "items" && path[1] === "claim-bus") {
      const observationId = typeof body.observationId === "string" ? body.observationId : ""; const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {};
      const { data, error } = await db.rpc("comun_participation_wallet_claim_bus", { p_token_hash_hex: tokenHash, p_observation_id: observationId, p_metadata: metadata });
      if (error || !Array.isArray(data) || !data[0]) return dormant(); return NextResponse.json({ item: data[0] }, { status: 201, headers });
    }
    return dormant();
  } catch { return NextResponse.json({ code: "wallet_unavailable" }, { status: 503, headers }); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!isComunParticipationWalletEnabled()) return dormant();
  const token = readWalletToken(request); const path = (await context.params).path;
  if (!token || path[0] !== "items" || !path[1]) return dormant();
  try {
    const { data, error } = await walletDb().rpc("comun_participation_wallet_remove_item", { p_token_hash_hex: walletSecretHash(token), p_item_id: path[1] });
    if (error || !Array.isArray(data) || data[0] !== true) return dormant();
    return NextResponse.json({ removed: true }, { headers });
  } catch { return dormant(); }
}
