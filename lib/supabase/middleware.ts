import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname, search } = request.nextUrl;
  const isCollectiveActionsPreviewAdmin =
    pathname === "/comun/admin/acoes" &&
    process.env.VERCEL_ENV === "preview" &&
    process.env.COMUN_COLLECTIVE_ACTIONS_PREVIEW_FIXTURES === "enabled";

  let response = NextResponse.next({ request });
  if (isCollectiveActionsPreviewAdmin) return response;
  if (!url || !anonKey) return response;

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

  const isAdminRoute =
    pathname === "/comun/admin" || pathname.startsWith("/comun/admin/");
  const isLoginRoute = pathname === "/comun/admin/login";

  if (isAdminRoute && !isLoginRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/comun/admin/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
