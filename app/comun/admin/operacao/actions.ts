"use server";

import { revalidatePath } from "next/cache";
import { requireComunAdminProfile } from "@/lib/admin-auth";
import {
  canAssumeOperationalItem,
  effectiveOperationalRole,
} from "@/lib/operational-responsibility";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

function itemId(formData: FormData) {
  const value = String(formData.get("item_id") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value))
    throw new Error("Item operacional inválido.");
  return value;
}

export async function assumeOperationalItem(formData: FormData) {
  const session = await requireComunAdminProfile();
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const id = itemId(formData);
  const { data: item } = await db
    .from("comun_editorial_operation_items")
    .select("id,state,required_role")
    .eq("id", id)
    .maybeSingle();
  if (
    !item ||
    !canAssumeOperationalItem(session.profile, {
      requiredRole: item.required_role,
      state: item.state,
    })
  )
    throw new Error("Este papel não pode assumir o item.");

  const role = effectiveOperationalRole(session.profile);
  const { error } = await db
    .from("comun_editorial_operation_assignments")
    .upsert(
      {
        item_id: id,
        assignee_profile_id: session.profile.id,
        assigned_by_profile_id: session.profile.id,
        role_at_assignment: role,
        assignment_kind: "responsible",
        status: "active",
      },
      {
        onConflict: "item_id,assignee_profile_id,status",
        ignoreDuplicates: true,
      },
    );
  if (error) throw new Error("Não foi possível assumir o item.");
  await Promise.all([
    db
      .from("comun_editorial_operation_items")
      .update({ state: "assigned", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("state", "pending"),
    db.from("comun_editorial_operation_events").insert({
      item_id: id,
      actor_profile_id: session.profile.id,
      event_type: "responsibility_assumed",
      payload: { role, assignment_kind: "responsible" },
    }),
  ]);
  revalidatePath("/comun/admin/operacao");
  revalidatePath(`/comun/admin/operacao/${id}`);
}

export async function releaseOwnOperationalItem(formData: FormData) {
  const session = await requireComunAdminProfile();
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const id = itemId(formData);
  const { data, error } = await db
    .from("comun_editorial_operation_assignments")
    .update({ status: "released", resolved_at: new Date().toISOString() })
    .eq("item_id", id)
    .eq("assignee_profile_id", session.profile.id)
    .eq("status", "active")
    .select("id");
  if (error || !data?.length)
    throw new Error("Atribuição própria não encontrada.");
  await db.from("comun_editorial_operation_events").insert({
    item_id: id,
    actor_profile_id: session.profile.id,
    event_type: "responsibility_released",
    payload: { assignment_kind: "responsible" },
  });
  revalidatePath("/comun/admin/operacao");
  revalidatePath(`/comun/admin/operacao/${id}`);
}
