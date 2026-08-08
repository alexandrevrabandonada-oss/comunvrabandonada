import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  canonicalComunHref,
  shouldUseLegacyDefault,
} from "@/lib/comun-experience";
import {
  shouldCloakComunRelataEvidenceApi,
  shouldCloakComunRelataPublicMap,
} from "@/lib/comun-relata-evidence-feature";
import { shouldCloakComunBus } from "@/lib/comun-bus-feature";
import { shouldCloakComunQuickCaptureApi } from "@/lib/comun-capture-feature";
import { shouldCloakComunParticipationWallet } from "@/lib/comun-participation-wallet-feature";
import { shouldCloakComunForwarding } from "@/lib/comun-forwarding-feature";
import { shouldCloakComunSidewalkP4 } from "@/lib/comun-sidewalk-p4-feature";
import { updateSession } from "@/lib/supabase/middleware";

function shouldRefreshCommunitySession(pathname: string) {
  return (
    pathname === "/comun/entrar" ||
    pathname === "/comun/criar-conta" ||
    pathname === "/comun/onboarding" ||
    pathname === "/comun/minha-participacao" ||
    pathname.startsWith("/comun/minha-participacao/") ||
    pathname === "/comun/conta" ||
    pathname.startsWith("/comun/conta/") ||
    pathname === "/comun/completar-conta" ||
    pathname === "/comun/recuperar-acesso" ||
    pathname === "/comun/redefinir-acesso" ||
    pathname === "/api/comun/participation-wallet" ||
    pathname.startsWith("/api/comun/participation-wallet/")
  );
}

export async function proxy(request: NextRequest) {
  if (
    shouldCloakComunRelataEvidenceApi(request.nextUrl.pathname) ||
    shouldCloakComunRelataPublicMap(request.nextUrl.pathname) ||
    shouldCloakComunBus(request.nextUrl.pathname) ||
    shouldCloakComunQuickCaptureApi(request.nextUrl.pathname) ||
    shouldCloakComunParticipationWallet(request.nextUrl.pathname) ||
    shouldCloakComunForwarding(request.nextUrl.pathname) ||
    shouldCloakComunSidewalkP4(request.nextUrl.pathname)
  ) {
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
  const response =
    isAdminRoute || shouldRefreshCommunitySession(request.nextUrl.pathname)
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
  matcher: [
    "/comun/:path*",
    "/api/comun/relata/evidence/:path*",
    "/api/comun/relata/public/:path*",
    "/comun/onibus/:path*",
    "/api/comun/onibus/:path*",
    "/api/comun/capture/:path*",
    "/api/comun/participation-wallet",
    "/api/comun/participation-wallet/:path*",
    "/api/comun/forwarding/:path*",
    "/api/comun/calcadas/intake",
    "/api/comun/calcadas/intake/:path*",
    "/api/comun/relata/sidewalk/finalize",
    "/api/comun/relata/sidewalk/:path*",
  ],
};
