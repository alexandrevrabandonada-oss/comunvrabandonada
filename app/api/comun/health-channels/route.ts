import { NextResponse } from "next/server";
import { isComunPublicHealthSensitiveRoutingEnabled } from "@/lib/comun-public-health-sensitive-feature";
import { listComunHealthInstitutionalChannels } from "@/lib/server/comun-health-institutional-channel-catalog";

export const runtime = "nodejs";
const headers = { "cache-control": "public, max-age=300, must-revalidate" };

function dormant() {
  return NextResponse.json(
    { code: "not_found" },
    { status: 404, headers: { "cache-control": "no-store" } },
  );
}

export function GET() {
  if (!isComunPublicHealthSensitiveRoutingEnabled()) return dormant();
  return NextResponse.json(
    {
      channels: listComunHealthInstitutionalChannels(),
      forwardingEnabled: false,
      noHealthDataTransferred: true,
    },
    { headers },
  );
}

export const POST = dormant;
export const PUT = dormant;
export const PATCH = dormant;
export const DELETE = dormant;
