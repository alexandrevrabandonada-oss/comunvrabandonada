import { NextRequest, NextResponse } from "next/server";
import { isComunParticipationWalletEnabled } from "@/lib/comun-participation-wallet-feature";
import {
  createWallet,
  readWalletToken,
  setWalletCookie,
  walletDb,
  walletSecretHash,
} from "@/lib/comun-participation-wallet-runtime";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store, max-age=0" };
function dormant() { return NextResponse.json({ code: "not_found" }, { status: 404, headers }); }

export async function GET(request: NextRequest) {
  if (!isComunParticipationWalletEnabled()) return dormant();
  const token = readWalletToken(request);
  if (!token) return NextResponse.json({ wallet: null, items: [] }, { headers });
  try {
    const { data, error } = await walletDb().rpc("comun_participation_wallet_list", { p_token_hash_hex: walletSecretHash(token) });
    if (error) return dormant();
    return NextResponse.json({ wallet: { present: true }, items: Array.isArray(data) ? data : [] }, { headers });
  } catch { return dormant(); }
}

export async function POST() {
  if (!isComunParticipationWalletEnabled()) return dormant();
  try {
    const created = await createWallet(walletDb());
    const response = NextResponse.json({ created: true, recoveryCode: created.recoveryCode }, { status: 201, headers });
    setWalletCookie(response, created.token);
    return response;
  } catch { return NextResponse.json({ code: "wallet_unavailable" }, { status: 503, headers }); }
}
