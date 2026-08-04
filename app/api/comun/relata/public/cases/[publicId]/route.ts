import { NextRequest, NextResponse } from "next/server";
import { COMUN_RELATA_PUBLIC_NO_STORE, getLocalPublicProjection } from "@/lib/comun-relata-public-runtime";

export async function GET(_request: NextRequest, context: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await context.params;
  const projection = await getLocalPublicProjection(publicId);
  if (!projection) return NextResponse.json({ code: "public_case_unavailable" }, { status: 404, headers: COMUN_RELATA_PUBLIC_NO_STORE });
  return NextResponse.json({ policyVersion: "relata-public-projection-v1", case: projection }, { headers: COMUN_RELATA_PUBLIC_NO_STORE });
}

