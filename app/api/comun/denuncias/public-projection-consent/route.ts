import { NextRequest, NextResponse } from "next/server";
import { isComunParticipationWalletEnabled } from "@/lib/comun-participation-wallet-feature";
import {
  readWalletToken,
  walletDb,
  walletSecretHash,
} from "@/lib/comun-participation-wallet-runtime";

export const runtime = "nodejs";

const headers = {
  "cache-control": "private, no-store, max-age=0",
  "x-content-type-options": "nosniff",
};

function unavailable() {
  return NextResponse.json({ code: "not_found" }, { status: 404, headers });
}

function itemId(value: string | null) {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : null;
}

type ConsentResult = {
  available: boolean;
  active: boolean;
  category: string | null;
  location_ready: boolean;
  grouping_ready: boolean;
  result_code: string;
};

async function resolve(
  request: NextRequest,
  active?: boolean,
) {
  if (!isComunParticipationWalletEnabled()) return unavailable();
  const token = readWalletToken(request);
  const walletItemId = itemId(
    request.nextUrl.searchParams.get("walletItemId"),
  );
  if (!token || !walletItemId) return unavailable();

  const { data, error } = await walletDb().rpc(
    "comun_relata_public_projection_consent_set",
    {
      p_token_hash_hex: walletSecretHash(token),
      p_wallet_item_id: walletItemId,
      p_active: active,
    },
  );
  if (error || !Array.isArray(data) || !data[0]) return unavailable();
  const result = data[0] as ConsentResult;
  if (!result.available) return unavailable();
  return NextResponse.json(
    {
      consent: {
        available: true,
        active: Boolean(result.active),
        locationReady: Boolean(result.location_ready),
        groupingReady: Boolean(result.grouping_ready),
      },
    },
    { headers },
  );
}

export async function GET(request: NextRequest) {
  if (!isComunParticipationWalletEnabled()) return unavailable();
  const token = readWalletToken(request);
  const walletItemId = itemId(
    request.nextUrl.searchParams.get("walletItemId"),
  );
  if (!token || !walletItemId) return unavailable();
  const { data, error } = await walletDb().rpc(
    "comun_relata_public_projection_consent_status",
    {
      p_token_hash_hex: walletSecretHash(token),
      p_wallet_item_id: walletItemId,
    },
  );
  if (error || !Array.isArray(data) || !data[0]) return unavailable();
  const result = data[0] as ConsentResult;
  if (!result.available) return unavailable();
  return NextResponse.json(
    {
      consent: {
        available: true,
        active: Boolean(result.active),
        locationReady: Boolean(result.location_ready),
        groupingReady: Boolean(result.grouping_ready),
      },
    },
    { headers },
  );
}

export async function POST(request: NextRequest) {
  return resolve(request, true);
}

export async function DELETE(request: NextRequest) {
  return resolve(request, false);
}
