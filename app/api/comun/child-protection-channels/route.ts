import { NextResponse } from "next/server";
import { isComunChildProtectionPrivateRoutingEnabled } from "@/lib/comun-child-protection-feature";
import { listComunChildProtectionChannels } from "@/lib/server/comun-child-protection-channel-catalog";

const headers = { "cache-control": "private, no-store, max-age=0" };
const dormant = () =>
  NextResponse.json({ code: "not_found" }, { status: 404, headers });

export function GET() {
  if (!isComunChildProtectionPrivateRoutingEnabled()) return dormant();
  return NextResponse.json(
    { channels: listComunChildProtectionChannels(), informationalOnly: true },
    { headers },
  );
}

export const POST = dormant;
export const PUT = dormant;
export const PATCH = dormant;
export const DELETE = dormant;
export const HEAD = dormant;
export const OPTIONS = dormant;
