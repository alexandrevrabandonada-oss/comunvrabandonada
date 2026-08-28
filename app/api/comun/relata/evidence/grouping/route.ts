import { NextRequest, NextResponse } from "next/server";
import {
  associateComunRelataCollectiveForWallet,
  COMUN_RELATA_EVIDENCE_NO_STORE,
} from "@/lib/comun-relata-evidence-runtime";
import {
  readWalletToken,
  walletDb,
  walletSecretHash,
} from "@/lib/comun-participation-wallet-runtime";
import { isComunRelataCollectiveEnabled } from "@/lib/comun-relata-evidence-feature";

export const runtime = "nodejs";

function unavailable() {
  return NextResponse.json(
    { code: "grouping_unavailable" },
    { status: 404, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
  );
}

function authorityRequired() {
  return NextResponse.json(
    { code: "wallet_authority_required" },
    { status: 401, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
  );
}

function walletItemRequired() {
  return NextResponse.json(
    { code: "wallet_item_required" },
    { status: 400, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
  );
}

function readWalletItemId(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("walletItemId");
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

export async function GET(request: NextRequest) {
  if (!isComunRelataCollectiveEnabled()) return unavailable();
  const token = readWalletToken(request);
  const walletItemId = readWalletItemId(request);
  if (!token) return authorityRequired();
  if (!walletItemId) return walletItemRequired();
  try {
    const { data, error } = await walletDb().rpc(
      "comun_relata_collective_connection_for_wallet",
      {
        p_token_hash_hex: walletSecretHash(token),
        p_wallet_item_id: walletItemId,
      },
    );
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row || !["waiting", "matched"].includes(row.connection))
      return unavailable();
    return NextResponse.json(
      { collectiveConnection: row.connection },
      { headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  } catch {
    return unavailable();
  }
}

export async function POST(request: NextRequest) {
  if (!isComunRelataCollectiveEnabled()) return unavailable();
  const token = readWalletToken(request);
  const walletItemId = readWalletItemId(request);
  if (!token) return authorityRequired();
  if (!walletItemId) return walletItemRequired();
  try {
    const grouping = await associateComunRelataCollectiveForWallet(
      walletDb(),
      token,
      walletItemId,
    );
    if (!grouping) return unavailable();
    return NextResponse.json(
      {
        collectiveConnection:
          grouping.grouping_state === "auto_link_high_confidence"
            ? "matched"
            : "waiting",
      },
      { headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  } catch {
    return unavailable();
  }
}
