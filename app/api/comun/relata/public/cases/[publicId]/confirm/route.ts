import { NextRequest, NextResponse } from "next/server";
import { COMUN_RELATA_CONFIRM_COOKIE, COMUN_RELATA_PUBLIC_NO_STORE, confirmLocalPublicProjection } from "@/lib/comun-relata-public-runtime";

async function handle(request: NextRequest, context: { params: Promise<{ publicId: string }> }, undo: boolean) {
  const { publicId } = await context.params;
  const result = await confirmLocalPublicProjection(request, publicId, undo);
  if (!result) return NextResponse.json({ code: "public_confirmation_unavailable" }, { status: 404, headers: COMUN_RELATA_PUBLIC_NO_STORE });
  const response = NextResponse.json({ active: result.result.active, confirmationCount: result.result.confirmation_count }, { headers: COMUN_RELATA_PUBLIC_NO_STORE });
  if (result.setCookie) response.cookies.set({ name: COMUN_RELATA_CONFIRM_COOKIE, value: result.setCookie, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/comun/relata/public", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
export async function POST(request: NextRequest, context: { params: Promise<{ publicId: string }> }) { return handle(request, context, false); }
export async function DELETE(request: NextRequest, context: { params: Promise<{ publicId: string }> }) { return handle(request, context, true); }

