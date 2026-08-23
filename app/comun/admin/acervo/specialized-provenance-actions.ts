"use server";

import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

/**
 * These actions are deliberately not wired to a public route until A5-A1-R1
 * installs the migration. The database RPC is the atomic authority: a replay
 * returns the first private root, while a conflicting retarget fails closed.
 */
export async function materializeOralHistorySuggestionPrivateRoot(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");

  const suggestionId = value(formData, "suggestion_id");
  const title = value(formData, "title");
  const slug = value(formData, "slug");
  const { data, error } = await (db as any).rpc(
    "comun_materialize_oral_history_suggestion_private_root_v1",
    { p_suggestion_id: suggestionId, p_title: title, p_slug: slug },
  );
  if (error || !data) throw new Error(error?.message || "Não foi possível materializar a raiz privada.");

  await logComunAdminAction({
    session,
    action: "oral_history_private_root_materialized",
    targetType: "oral_history_suggestion",
    targetId: suggestionId,
    metadata: {
      private_root_archive_item_id: data,
      publication: "not_authorized",
      provenance: "immutable_specialized_link",
    },
  });
  revalidatePath("/comun/admin/acervo/historias-orais");
  return data as string;
}

export async function materializeRadioContributionPrivateRoot(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");

  const contributionId = value(formData, "contribution_id");
  const privateRootKind = value(formData, "private_root_kind");
  const title = value(formData, "title");
  const slug = value(formData, "slug");
  const programItemId = value(formData, "program_item_id") || null;
  const { data, error } = await (db as any).rpc(
    "comun_materialize_radio_contribution_private_root_v1",
    {
      p_contribution_id: contributionId,
      p_private_root_kind: privateRootKind,
      p_title: title,
      p_slug: slug,
      p_program_item_id: programItemId,
    },
  );
  if (error || !data) throw new Error(error?.message || "Não foi possível materializar a raiz privada.");

  await logComunAdminAction({
    session,
    action: "radio_private_root_materialized",
    targetType: "radio_contribution",
    targetId: contributionId,
    metadata: {
      private_root_archive_item_id: data,
      private_root_kind: privateRootKind,
      publication: "not_authorized",
      provenance: "immutable_specialized_link",
    },
  });
  revalidatePath("/comun/admin/radio/programas");
  revalidatePath("/comun/admin/radio/episodios");
  return data as string;
}
