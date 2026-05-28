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
  quick_category: z.string().optional(),
  quick_report: z.coerce.boolean().default(false),
  title: z.string().optional(),
  raw_text: z.string().min(1, "Descreva o que aconteceu."),
  period_text: z.string().optional(),
  approximate_location: z.string().optional(),
  neighborhood: z.string().optional(),
  involved_entity: z.string().optional(),
  latitude: emptyStringToUndefined(z.coerce.number().optional()),
  longitude: emptyStringToUndefined(z.coerce.number().optional()),
  location_accuracy: emptyStringToUndefined(z.coerce.number().optional()),
  location_source: z.string().optional(),
  is_anonymous: z.coerce.boolean().default(true),
  can_publish_sanitized: z.coerce.boolean().default(false),
  accepts_contact: z.coerce.boolean().default(false),
  private_contact: z.string().optional(),
});

function emptyStringToUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => (value === "" ? undefined : value), schema);
}

export async function submitReport(_: unknown, formData: FormData) {
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise o formulario." };
  }

  const rawText = parsed.data.raw_text.trim();
  const isQuickReport = parsed.data.quick_report;
  const minimumLength = isQuickReport ? 8 : 20;
  if (rawText.length < minimumLength) {
    return {
      ok: false,
      error: isQuickReport
        ? "O relato rapido precisa ter pelo menos 8 caracteres."
        : "O relato precisa ter pelo menos 20 caracteres.",
    };
  }

  const supabase = createServiceSupabaseClient() ?? createPublicSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      error: "Supabase ainda nao esta configurado. Preencha .env.local para salvar relatos.",
    };
  }

  const protocol = generateProtocol();
  const reportPhoto = formData.get("report_photo");
  const hasPhoto = reportPhoto instanceof File && reportPhoto.size > 0;
  const payload = {
    ...parsed.data,
    protocol,
    raw_text: rawText,
    quick_report: isQuickReport,
    issue_slug: parsed.data.issue_slug || null,
    title: buildStoredTitle(parsed.data.title, parsed.data.campaign_category, parsed.data.quick_category),
    period_text: parsed.data.period_text || null,
    approximate_location: parsed.data.approximate_location || null,
    neighborhood: parsed.data.neighborhood || null,
    involved_entity: parsed.data.involved_entity || null,
    latitude: isFiniteCoordinate(parsed.data.latitude, -90, 90) ? parsed.data.latitude : null,
    longitude: isFiniteCoordinate(parsed.data.longitude, -180, 180) ? parsed.data.longitude : null,
    location_accuracy: isFiniteCoordinate(parsed.data.location_accuracy, 0, 100000) ? parsed.data.location_accuracy : null,
    location_source: parsed.data.location_source || null,
    public_location_level: "approximate",
    source_channel: isQuickReport ? "quick_report" : "detailed_report",
    has_attachments: hasPhoto,
    photo_count: hasPhoto ? 1 : 0,
    private_contact: parsed.data.accepts_contact ? parsed.data.private_contact || null : null,
    status: "received",
    risk_level: "unknown",
  };

  const { data: insertedReport, error } = await supabase.from("comun_reports").insert(payload).select("id").single();
  if (error) {
    return { ok: false, error: error.message };
  }

  if (hasPhoto && insertedReport?.id) {
    const attachmentResult = await storeReportPhoto({
      reportId: insertedReport.id,
      protocol,
      file: reportPhoto,
    });

    if (!attachmentResult.ok) {
      await supabase
        .from("comun_reports")
        .update({ has_attachments: false, photo_count: 0, internal_notes: attachmentResult.error })
        .eq("id", insertedReport.id);
    }
  }

  const confirmationUrl = isQuickReport
    ? `/comun/relatar/confirmacao?protocolo=${encodeURIComponent(protocol)}&modo=rapido`
    : `/comun/relatar/confirmacao?protocolo=${encodeURIComponent(protocol)}`;
  redirect(confirmationUrl);
}

async function storeReportPhoto({ reportId, protocol, file }: { reportId: string; protocol: string; file: File }) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return { ok: false, error: "Service role nao configurada para upload de anexo." };

  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Anexo ignorado: o arquivo enviado nao era uma imagem." };
  }

  const bucket = "comun-report-attachments";
  const extension = extensionFromFile(file);
  const storagePath = `${protocol}/${Date.now()}-${crypto.randomUUID()}${extension}`;
  const bytes = await file.arrayBuffer();
  const upload = await supabase.storage.from(bucket).upload(storagePath, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (upload.error) {
    return { ok: false, error: `Falha no upload privado do anexo: ${upload.error.message}` };
  }

  const insertAttachment = await supabase.from("comun_report_attachments").insert({
    report_id: reportId,
    storage_bucket: bucket,
    storage_path: storagePath,
    original_filename: file.name || null,
    mime_type: file.type || null,
    size_bytes: file.size || null,
    attachment_type: "photo",
    public_approved: false,
  });

  if (insertAttachment.error) {
    await supabase.storage.from(bucket).remove([storagePath]);
    return { ok: false, error: insertAttachment.error.message };
  }

  return { ok: true };
}

function extensionFromFile(file: File) {
  const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
  if (/^\.[a-z0-9]{2,5}$/.test(extension)) return extension;
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  return ".jpg";
}

function isFiniteCoordinate(value: number | undefined, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function buildStoredTitle(title: string | undefined, campaignCategory: string | undefined, quickCategory?: string) {
  const cleanTitle = title?.trim() || "";
  const cleanCategory = campaignCategory?.trim() || "";
  const cleanQuickCategory = quickCategory?.trim() || "";

  if (cleanQuickCategory) {
    const quickLabel = formatQuickCategory(cleanQuickCategory);
    return cleanTitle ? `[Rapido: ${quickLabel}] ${cleanTitle}` : `[Rapido: ${quickLabel}]`;
  }

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

function formatQuickCategory(value: string) {
  const labels: Record<string, string> = {
    "buraco-calcada": "Buraco ou calcada",
    "lixo-entulho": "Lixo ou entulho",
    "poluicao-po-preto": "Poluicao ou po preto",
    iluminacao: "Iluminacao",
    transporte: "Transporte",
    escola: "Escola",
    saude: "Saude",
    trabalho: "Trabalho",
    outro: "Outro",
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
