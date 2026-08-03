import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  canonicalComunHref,
  shouldUseLegacyDefault,
} from "@/lib/comun-experience";
import { shouldCloakComunRelataEvidenceApi } from "@/lib/comun-relata-evidence-feature";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  if (shouldCloakComunRelataEvidenceApi(request.nextUrl.pathname)) {
    return NextResponse.json(
      { code: "evidence_unavailable" },
      {
        status: 404,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      },
    );
  }

  const requestedExperience = request.nextUrl.searchParams.get("experiencia");

  if (
    shouldUseLegacyDefault(
      process.env.COMUN_DEFAULT_EXPERIENCE,
      requestedExperience,
    )
  ) {
    const rollbackUrl = request.nextUrl.clone();
    rollbackUrl.searchParams.set("experiencia", "legacy");
    return NextResponse.redirect(rollbackUrl);
  }

  const isAdminRoute =
    request.nextUrl.pathname === "/comun/admin" ||
    request.nextUrl.pathname.startsWith("/comun/admin/");
  const response = isAdminRoute
    ? await updateSession(request)
    : NextResponse.next({ request });

  if (requestedExperience === "app-v2" || requestedExperience === "legacy") {
    const canonicalPath = canonicalComunHref(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    const canonicalUrl = new URL(canonicalPath, request.nextUrl.origin);
    response.headers.set("Link", `<${canonicalUrl.href}>; rel=\"canonical\"`);
    response.headers.set("X-Robots-Tag", "noindex, follow");
  }

  return response;
}

export const config = {
  matcher: ["/comun/:path*", "/api/comun/relata/evidence/:path*"],
};
