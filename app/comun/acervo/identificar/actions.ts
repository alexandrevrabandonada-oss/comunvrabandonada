"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCommunitySession } from "@/lib/community-auth";
import { upsertMemberInbox } from "@/lib/community-inbox";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { identificationTypes } from "@/lib/archive-identification";
import {
  canReplyTo,
  COMMENT_LIMITS,
  identificationRisk,
  shouldHideOnReport,
} from "@/lib/archive-identification-rules";
import {
  resolveComunExperience,
  withComunExperience,
} from "@/lib/comun-experience";

const commentSchema = z.object({
  itemId: z.string().uuid(),
  slug: z.string().min(3).max(120),
  parentId: z.string().uuid().optional(),
  type: z.enum(identificationTypes),
  body: z.string().trim().min(10).max(3000),
  source: z.string().trim().max(1000).optional(),
  publicName: z.literal("on"),
});
function preserveExperience(href: string, formData: FormData) {
  return withComunExperience(
    href,
    resolveComunExperience(String(formData.get("experiencia") ?? "")),
  );
}
export async function submitIdentificationComment(formData: FormData) {
  const parsed = commentSchema.safeParse({
    itemId: formData.get("item_id"),
    slug: formData.get("slug"),
    parentId: String(formData.get("parent_id") || "") || undefined,
    type: formData.get("type"),
    body: formData.get("body"),
    source: String(formData.get("source") || "") || undefined,
    publicName: formData.get("public_name"),
  });
  if (!parsed.success)
    redirect(
      preserveExperience(
        `/comun/acervo/identificar/${String(formData.get("slug") || "")}?envio=invalido`,
        formData,
      ),
    );
  const returnTo = preserveExperience(
    `/comun/acervo/identificar/${parsed.data.slug}`,
    formData,
  );
  const { user, profile } = await requireCommunitySession(returnTo);
  if (!profile?.onboarding_completed_at || !profile?.display_name)
    redirect(`/comun/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Serviço indisponível.");
  const { data: campaignItem } = await db
    .from("comun_archive_identification_items")
    .select(
      "archive_item_id,display_state,campaign:comun_archive_identification_campaigns!inner(state)",
    )
    .eq("id", parsed.data.itemId)
    .single();
  if (
    !campaignItem ||
    campaignItem.display_state !== "open" ||
    (campaignItem.campaign as any)?.state !== "open"
  )
    throw new Error("Esta memória não está recebendo contribuições.");
  const hour = new Date(Date.now() - 3600000).toISOString(),
    day = new Date(Date.now() - 86400000).toISOString();
  const [h, d] = await Promise.all([
    db
      .from("comun_archive_item_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("member_user_id", user.id)
      .gte("created_at", hour),
    db
      .from("comun_archive_item_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("member_user_id", user.id)
      .gte("created_at", day),
  ]);
  if (
    (h.count ?? 0) >= COMMENT_LIMITS.hour ||
    (d.count ?? 0) >= COMMENT_LIMITS.day
  )
    redirect(
      preserveExperience(
        `/comun/acervo/identificar/${parsed.data.slug}?envio=limite`,
        formData,
      ),
    );
  if (parsed.data.parentId) {
    const { data: parent } = await db
      .from("comun_archive_item_suggestions")
      .select("id,parent_id,archive_item_id,status,publication_status")
      .eq("id", parsed.data.parentId)
      .maybeSingle();
    if (!canReplyTo(parent, campaignItem.archive_item_id))
      throw new Error("Resposta indisponível.");
  }
  const risk = identificationRisk(parsed.data.type, parsed.data.body);
  const { error } = await db.from("comun_archive_item_suggestions").insert({
    archive_item_id: campaignItem.archive_item_id,
    member_user_id: user.id,
    parent_id: parsed.data.parentId ?? null,
    suggestion_type: parsed.data.type,
    suggestion_text: parsed.data.body,
    source_reference: parsed.data.source || null,
    display_name_snapshot: profile.display_name,
    status: "pending",
    publication_status: "private",
    risk_level: risk,
  });
  if (error) throw error;
  revalidatePath(`/comun/acervo/identificar/${parsed.data.slug}`);
  redirect(
    preserveExperience(
      `/comun/acervo/identificar/${parsed.data.slug}?envio=recebido`,
      formData,
    ),
  );
}

export async function reportIdentificationComment(formData: FormData) {
  const slug = String(formData.get("slug") || ""),
    suggestionId = String(formData.get("suggestion_id") || ""),
    reason = String(formData.get("reason") || "");
  const { user } = await requireCommunitySession(
    preserveExperience(`/comun/acervo/identificar/${slug}`, formData),
  );
  if (
    ![
      "personal_data",
      "incorrect_authorship",
      "abuse",
      "offensive_content",
      "copyright",
      "other",
    ].includes(reason)
  )
    throw new Error("Motivo inválido.");
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Serviço indisponível.");
  const { error } = await db
    .from("comun_archive_identification_reports")
    .upsert(
      {
        suggestion_id: suggestionId,
        reporter_user_id: user.id,
        reason,
        details_private:
          String(formData.get("details") || "")
            .trim()
            .slice(0, 1000) || null,
        status: "pending",
      },
      { onConflict: "suggestion_id,reporter_user_id" },
    );
  if (error) throw error;
  if (shouldHideOnReport(reason))
    await db
      .from("comun_archive_item_suggestions")
      .update({ publication_status: "hidden" })
      .eq("id", suggestionId)
      .eq("publication_status", "approved_public");
  revalidatePath(`/comun/acervo/identificar/${slug}`);
  redirect(
    preserveExperience(
      `/comun/acervo/identificar/${slug}?denuncia=recebida`,
      formData,
    ),
  );
}

export async function withdrawIdentificationComment(formData: FormData) {
  const id = String(formData.get("id") || ""),
    slug = String(formData.get("slug") || "");
  const { user } = await requireCommunitySession(
    `/comun/acervo/identificar/${slug}`,
  );
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Serviço indisponível.");
  await db
    .from("comun_archive_item_suggestions")
    .update({
      status: "withdrawn",
      publication_status: "withdrawn",
      public_text: null,
      withdrawn_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("member_user_id", user.id);
  await upsertMemberInbox({
    memberUserId: user.id,
    type: "archive_comment_withdrawn",
    title: "Contribuição retirada",
    summary:
      "Seu texto deixou de ser exibido; o registro privado foi preservado.",
    actionLabel: "Voltar à memória",
    actionUrl: `/comun/acervo/identificar/${slug}`,
    dedupeKey: `archive-comment-withdrawn:${id}`,
    resolved: true,
  });
  revalidatePath(`/comun/acervo/identificar/${slug}`);
  redirect(`/comun/acervo/identificar/${slug}?retirada=concluida`);
}
