"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getComunAdminSession, requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { generateProtocol } from "@/lib/protocol";
import { createPublicSupabaseClient, createServiceSupabaseClient, createSupabaseServerClient } from "@/lib/supabase/server";

const reportSchema = z.object({
  community_slug: z.string().min(1),
  issue_slug: z.string().optional(),
  campaign_category: z.string().optional(),
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
    title: buildStoredTitle(parsed.data.title, parsed.data.campaign_category),
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

function buildStoredTitle(title: string | undefined, campaignCategory: string | undefined) {
  const cleanTitle = title?.trim() || "";
  const cleanCategory = campaignCategory?.trim() || "";

  if (!cleanCategory) {
    return cleanTitle || null;
  }

  const categoryLabel = formatCampaignCategory(cleanCategory);
  if (!cleanTitle) {
    return `[${categoryLabel}]`;
  }

  return `[${categoryLabel}] ${cleanTitle}`;
}

function formatCampaignCategory(value: string) {
  const labels: Record<string, string> = {
    "pressao-psicologica": "Pressao psicologica",
    "assedio-moral": "Assedio moral",
    burnout: "Burnout",
    "atraso-salarial": "Atraso salarial",
    "fgts-atrasado": "FGTS atrasado",
    terceirizacao: "Terceirizacao",
    "jornada-abusiva": "Jornada abusiva",
    "ferias-impostas": "Ferias impostas",
    "risco-de-acidente": "Risco de acidente",
    "insalubridade-periculosidade": "Insalubridade/periculosidade",
    "medo-de-denunciar": "Medo de denunciar",
    retaliacao: "Retaliacao",
  };

  return labels[value] ?? value;
}

export async function loginAdmin(_: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/comun/admin");

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase Auth nao configurado." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: "E-mail ou senha invalidos." };
  }

  const session = await getComunAdminSession();
  if (!session) {
    await supabase.auth.signOut();
    return { ok: false, error: "Usuario autenticado, mas nao autorizado como admin COMUN." };
  }

  await logComunAdminAction({ session, action: "admin_login_success" });
  redirect(redirectTo.startsWith("/comun/admin") ? redirectTo : "/comun/admin");
}

export async function logoutAdmin() {
  const session = await getComunAdminSession();
  await logComunAdminAction({ session, action: "admin_logout" });

  const supabase = createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/comun/admin/login");
}

export async function updateReportReview(formData: FormData) {
  const session = await requireComunAdmin();
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

  const { data: currentReport, error: currentReportError } = await supabase
    .from("comun_reports")
    .select("community_slug, issue_slug")
    .eq("id", id)
    .single();

  if (currentReportError) throw new Error(currentReportError.message);

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

  const action =
    intent === "publish"
      ? "report_published"
      : intent === "archive"
        ? "report_archived"
        : intent === "unpublish"
          ? "report_unpublished"
          : "report_sanitized_saved";

  await logComunAdminAction({
    session,
    action,
    targetType: "report",
    targetId: id,
    metadata: {
      status: nextStatus,
      risk_level: String(formData.get("risk_level") ?? "unknown"),
      community_slug: String(formData.get("community_slug") ?? ""),
      issue_slug: String(formData.get("issue_slug") ?? "") || null,
      public_text_length: publicText.length,
    },
  });

  revalidatePath("/comun/admin");
  revalidatePath(`/comun/admin/relatos/${id}`);
  revalidatePath("/comun");
  revalidatePath("/comun/comunidades");
  revalidatePath(`/comun/c/${currentReport.community_slug}`);
  revalidatePath(String(formData.get("community_slug") ?? "").trim() ? `/comun/c/${String(formData.get("community_slug") ?? "").trim()}` : "/comun");
  if (currentReport.issue_slug) revalidatePath(`/comun/pautas/${currentReport.issue_slug}`);
  if (String(formData.get("issue_slug") ?? "").trim()) revalidatePath(`/comun/pautas/${String(formData.get("issue_slug") ?? "").trim()}`);
  redirect(`/comun/admin/relatos/${id}`);
}
