"use server";

import { revalidatePath } from "next/cache";
import { requireCommunitySession } from "@/lib/community-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

async function updateOwnInboxItem(
  formData: FormData,
  values: Record<string, string | null>,
) {
  const { user } = await requireCommunitySession("/comun/caixa-de-entrada");
  const db = createServiceSupabaseClient();
  const id = String(formData.get("id") ?? "");
  if (!db || !id) return;
  await db
    .from("comun_member_inbox")
    .update(values)
    .eq("id", id)
    .eq("member_user_id", user.id);
  revalidatePath("/comun/caixa-de-entrada");
}

export async function markInboxRead(formData: FormData) {
  await updateOwnInboxItem(formData, { read_at: new Date().toISOString() });
}

export async function markInboxUnread(formData: FormData) {
  await updateOwnInboxItem(formData, { read_at: null });
}

export async function archiveInboxItem(formData: FormData) {
  await updateOwnInboxItem(formData, {
    read_at: new Date().toISOString(),
    resolved_at: new Date().toISOString(),
  });
}
