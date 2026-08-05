import { NextResponse } from "next/server";
import { createServiceSupabaseClient, createSupabaseServerClient } from "@/lib/supabase/server";
import {
  googleAuthErrorHref,
  googleCompletionHref,
  isGoogleAuthEnabled,
  suggestedCommunityName,
  trustedCommunityOrigin,
} from "@/lib/community-google-auth";
import { safeCommunityReturn } from "@/lib/community-return";

function errorRedirect() {
  return NextResponse.redirect(
    new URL(googleAuthErrorHref(), trustedCommunityOrigin()),
  );
}

export async function GET(request: Request) {
  if (!isGoogleAuthEnabled()) return errorRedirect();
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnTo = safeCommunityReturn(requestUrl.searchParams.get("returnTo"));
  if (!code || code.length > 2048 || /[\u0000-\u001f\u007f]/.test(code))
    return errorRedirect();

  const supabase = await createSupabaseServerClient();
  if (!supabase) return errorRedirect();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return errorRedirect();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorRedirect();

  const service = createServiceSupabaseClient();
  if (!service) {
    await supabase.auth.signOut();
    return errorRedirect();
  }
  const { data: existingProfile } = await service
    .from("comun_member_profiles" as never)
    .select("user_id, display_name, status, onboarding_completed_at" as never)
    .eq("user_id" as never, user.id)
    .maybeSingle();
  let profile = existingProfile as {
    user_id: string;
    display_name: string;
    status: string;
    onboarding_completed_at: string | null;
  } | null;

  if (!profile) {
    const { error: profileError } = await service
      .from("comun_member_profiles" as never)
      .insert({
        user_id: user.id,
        display_name: suggestedCommunityName(user.user_metadata as Record<string, unknown>),
        participation_visibility: "private",
        profile_visibility: "private",
        status: "active",
      } as never);
    if (profileError && !profileError.message.toLowerCase().includes("duplicate")) {
      await supabase.auth.signOut();
      return errorRedirect();
    }
    const { data: insertedProfile } = await service
      .from("comun_member_profiles" as never)
      .select("user_id, display_name, status, onboarding_completed_at" as never)
      .eq("user_id" as never, user.id)
      .maybeSingle();
    profile = insertedProfile as typeof profile;
  }

  if (!profile || ["suspended", "deactivation_requested", "deactivated", "archived"].includes(profile.status)) {
    await supabase.auth.signOut();
    return errorRedirect();
  }
  if (!profile.onboarding_completed_at)
    return NextResponse.redirect(
      new URL(googleCompletionHref(returnTo), trustedCommunityOrigin()),
    );
  return NextResponse.redirect(new URL(returnTo, trustedCommunityOrigin()));
}
