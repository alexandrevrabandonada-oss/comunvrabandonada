"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkAdminPassword, clearAdminSession, setAdminSession } from "@/lib/admin-auth";
import { generateProtocol } from "@/lib/protocol";
import { createPublicSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

const reportSchema = z.object({
  community_slug: z.string().min(1),
  issue_slug: z.string().optional(),
  title: z.string().optional(),
  raw_text: z.string().min(20, "O relato precisa ter pelo menos 20 caracteres."),
  period_text: z.string().optional(),
  approximate_location: z.string().optional(),
  neighborhood: z.string().optional(),
  involved_entity: z.string().optional(),
  is_anonymous: z.coerce.boolean().default(true),
  can_publish_sanitized: z.coerce.boolean().default(false),
  accepts_contact: z.coerce.boolean().default(false),
  private_contact: z.string().optional(),
});

export async function submitReport(_: unknown, formData: FormData) {
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise o formulario." };
  }

  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      error: "Supabase ainda nao esta configurado. Preencha .env.local para salvar relatos.",
    };
  }

  const protocol = generateProtocol();
  const payload = {
    ...parsed.data,
    protocol,
    issue_slug: parsed.data.issue_slug || null,
    title: parsed.data.title || null,
    period_text: parsed.data.period_text || null,
    approximate_location: parsed.data.approximate_location || null,
    neighborhood: parsed.data.neighborhood || null,
    involved_entity: parsed.data.involved_entity || null,
    private_contact: parsed.data.accepts_contact ? parsed.data.private_contact || null : null,
    status: "received",
    risk_level: "unknown",
  };

  const { error } = await supabase.from("comun_reports").insert(payload);
  if (error) {
    return { ok: false, error: error.message };
  }

  redirect(`/comun/relatar/confirmacao?protocolo=${encodeURIComponent(protocol)}`);
}

export async function loginAdmin(_: unknown, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!checkAdminPassword(password)) {
    return { ok: false, error: "Senha invalida ou COMUN_ADMIN_PASSWORD ausente." };
  }
  setAdminSession();
  redirect("/comun/admin");
}

export async function logoutAdmin() {
  clearAdminSession();
  redirect("/comun/admin");
}

export async function updateReportReview(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "save");
  const publicText = String(formData.get("public_text") ?? "").trim();
  const canPublish = formData.get("can_publish_sanitized") === "true";
  const status = String(formData.get("status") ?? "under_review");

  if (!id) throw new Error("Relato sem ID.");
  if (intent === "publish" && !publicText) throw new Error("Publicacao exige versao publica sanitizada.");
  if (intent === "publish" && !canPublish) throw new Error("Relato sem autorizacao para publicacao sanitizada.");

  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");

  const nextStatus =
    intent === "publish"
      ? "published"
      : intent === "archive"
        ? "archived"
        : intent === "needs_more_info"
          ? "needs_more_info"
          : intent === "unpublish"
            ? "sanitized"
            : status;

  const { error } = await supabase
    .from("comun_reports")
    .update({
      public_text: publicText || null,
      status: nextStatus,
      risk_level: String(formData.get("risk_level") ?? "unknown"),
      community_slug: String(formData.get("community_slug") ?? ""),
      issue_slug: String(formData.get("issue_slug") ?? "") || null,
      internal_notes: String(formData.get("internal_notes") ?? "") || null,
      published_at: intent === "publish" ? new Date().toISOString() : intent === "unpublish" ? null : undefined,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/comun/admin");
  revalidatePath(`/comun/admin/relatos/${id}`);
  redirect(`/comun/admin/relatos/${id}`);
}
