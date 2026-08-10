import { NextResponse } from "next/server";
import { isComunPublicEducationSensitiveRoutingEnabled } from "@/lib/comun-public-education-sensitive-feature";
import { listComunEducationInstitutionalChannels } from "@/lib/server/comun-education-institutional-channel-catalog";

export const runtime = "nodejs";
const publicHeaders = {
  "cache-control": "public, max-age=300, must-revalidate",
};
const privateHeaders = { "cache-control": "no-store" };
const dormant = () =>
  NextResponse.json(
    { code: "not_found" },
    { status: 404, headers: privateHeaders },
  );

export function GET() {
  if (!isComunPublicEducationSensitiveRoutingEnabled()) return dormant();
  return NextResponse.json(
    {
      channels: listComunEducationInstitutionalChannels(),
      forwardingEnabled: false,
      noEducationDataTransferred: true,
    },
    { headers: publicHeaders },
  );
}

export const POST = dormant;
export const PUT = dormant;
export const PATCH = dormant;
export const DELETE = dormant;
