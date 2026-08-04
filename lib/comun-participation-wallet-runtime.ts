import { createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import {
  COMUN_PARTICIPATION_WALLET_COOKIE,
  isComunParticipationWalletEnabled,
} from "./comun-participation-wallet-feature";
import {
  createComunRelataPersistenceClient,
  isLoopbackSupabaseUrl,
} from "./comun-relata-persistence";

export function walletSecretHash(value: string) {
  return createHash("sha256").update(`comun-wallet-v1:${value}`).digest("hex");
}

export function createWalletToken() {
  return randomBytes(32).toString("base64url");
}

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createWalletRecoveryCode() {
  const bytes = randomBytes(24);
  let output = "";
  for (const byte of bytes) output += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length];
  return output.match(/.{1,4}/g)!.join("-");
}

export function isWalletRecoveryCode(value: string) {
  return /^[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){5}$/.test(value);
}

export function readWalletToken(request: NextRequest) {
  const value = request.cookies.get(COMUN_PARTICIPATION_WALLET_COOKIE)?.value;
  return value && /^[A-Za-z0-9_-]{32,80}$/.test(value) ? value : null;
}

export function setWalletCookie(response: NextResponse, token: string) {
  response.cookies.set(COMUN_PARTICIPATION_WALLET_COOKIE, token, {
    httpOnly: true,
    secure: process.env.COMUN_BASE_URL?.startsWith("https://") ?? false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function walletRuntimeAvailable() {
  return (
    isComunParticipationWalletEnabled() &&
    isLoopbackSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  );
}

export function walletDb() {
  if (!walletRuntimeAvailable()) throw new Error("COMUN_PARTICIPATION_WALLET_LOCAL_REQUIRED");
  return createComunRelataPersistenceClient();
}

export async function createWallet(db: ReturnType<typeof walletDb>) {
  const token = createWalletToken();
  const recoveryCode = createWalletRecoveryCode();
  const { data, error } = await db.rpc("comun_participation_wallet_create", {
    p_token_hash_hex: walletSecretHash(token),
    p_recovery_hash_hex: walletSecretHash(recoveryCode),
  });
  if (error || !Array.isArray(data) || !data[0]?.wallet_id) throw new Error("wallet_create_failed");
  return { token, recoveryCode, walletId: data[0].wallet_id as string };
}
