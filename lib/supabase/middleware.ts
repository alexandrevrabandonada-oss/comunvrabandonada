import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  COMUN_LEGACY_EXPERIENCE,
  resolveComunExperience,
  withComunExperience,
} from "@/lib/comun-experience";

export function requiresAdminSession(pathname: string) {
  const isAdminRoute =
    pathname === "/comun/admin" || pathname.startsWith("/comun/admin/");
  return (
    isAdminRoute &&
    pathname !== "/comun/admin/login" &&
    pathname !== "/comun/admin/auth/callback"
  );
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname, search } = request.nextUrl;
  const adminSessionRequired = requiresAdminSession(pathname);
  const isCollectiveActionsPreviewAdmin =
    pathname === "/comun/admin/acoes" &&
    process.env.VERCEL_ENV === "preview" &&
    process.env.COMUN_COLLECTIVE_ACTIONS_PREVIEW_FIXTURES === "enabled";

  let response = NextResponse.next({ request });
  if (isCollectiveActionsPreviewAdmin) return response;
  if (!url || !anonKey)
    return adminSessionRequired
      ? adminLoginRedirect(request, pathname, search)
      : response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (adminSessionRequired && !user) {
    return adminLoginRedirect(request, pathname, search);
  }

  return response;
}

function adminLoginRedirect(
  request: NextRequest,
  pathname: string,
  search: string,
) {
  const redirectUrl = request.nextUrl.clone();
  const experience = resolveComunExperience(
    request.nextUrl.searchParams.get("experiencia"),
  );
  const returnTo = withComunExperience(`${pathname}${search}`, experience);
  redirectUrl.pathname = "/comun/admin/login";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("redirectTo", returnTo);
  if (experience === COMUN_LEGACY_EXPERIENCE)
    redirectUrl.searchParams.set("experiencia", COMUN_LEGACY_EXPERIENCE);
  return NextResponse.redirect(redirectUrl);
}
