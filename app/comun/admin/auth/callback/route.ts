import { NextResponse } from "next/server";
import { logComunAdminAction } from "@/lib/admin-audit";
import { safeAdminReturn } from "@/lib/admin-google-auth";
import {
  isGoogleAuthEnabled,
  trustedCommunityOrigin,
} from "@/lib/community-google-auth";
import {
  createServiceSupabaseClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { ComunAdminRecord } from "@/lib/admin-auth";

function loginRedirect(reason = "google") {
  const url = new URL("/comun/admin/login", trustedCommunityOrigin());
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  if (!isGoogleAuthEnabled()) return loginRedirect();
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnTo = safeAdminReturn(requestUrl.searchParams.get("returnTo"));
  if (!code || code.length > 2048 || /[\u0000-\u001f\u007f]/.test(code))
    return loginRedirect();

  const supabase = await createSupabaseServerClient();
  if (!supabase) return loginRedirect();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return loginRedirect();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const service = createServiceSupabaseClient();
  if (!user || !service) {
    await supabase.auth.signOut();
    return loginRedirect();
  }

  const { data: admin, error } = await service
    .from("comun_admin_users")
    .select("id, user_id, email, role, is_active")
    .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !admin) {
    await supabase.auth.signOut();
    return loginRedirect("not-authorized");
  }

  await logComunAdminAction({
    session: {
      user: { id: user.id, email: user.email ?? null },
      admin: admin as ComunAdminRecord,
      profile: null,
    },
    action: "admin_login_success",
    metadata: { provider: "google" },
  });
  return NextResponse.redirect(new URL(returnTo, trustedCommunityOrigin()));
}
