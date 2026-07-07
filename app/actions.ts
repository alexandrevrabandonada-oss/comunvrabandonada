"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getComunAdminSession, requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { checkProtocolLookupRateLimit } from "@/lib/rate-limit";
import {
  createOrUpdateOfficialProtocolDraftForReport,
  getOfficialProtocolReportSurface,
} from "@/lib/official-protocols";
import { assessPautaContributionSafety, createPendingPautaContribution, slugifyPauta } from "@/lib/pauta-spaces";
import { generateProtocol } from "@/lib/protocol";
import { isValidProtocol, normalizeProtocol } from "@/lib/reports";
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

export async function updateAttachmentReviewStatus(formData: FormData) {
  const status = String(formData.get("review_status") ?? "");
  if (status !== "approved_private") throw new Error("Status de anexo invalido.");
  await setAttachmentReviewStatus({
    formData,
    reviewStatus: "approved_private",
    publicApproved: false,
    needsRedaction: false,
    auditAction: "attachment_review_updated",
  });
}

export async function markAttachmentNeedsRedaction(formData: FormData) {
  const notes = String(formData.get("redaction_notes") ?? "").trim();
  if (!notes) throw new Error("Informe uma nota de blur/redacao.");
  await setAttachmentReviewStatus({
    formData,
    reviewStatus: "needs_redaction",
    publicApproved: false,
    needsRedaction: true,
    redactionNotes: notes,
    auditAction: "attachment_marked_needs_redaction",
  });
}

export async function rejectAttachment(formData: FormData) {
  await setAttachmentReviewStatus({
    formData,
    reviewStatus: "rejected",
    publicApproved: false,
    needsRedaction: false,
    auditAction: "attachment_rejected",
  });
}

async function setAttachmentReviewStatus(input: {
  formData: FormData;
  reviewStatus: "approved_private" | "needs_redaction" | "rejected";
  publicApproved: boolean;
  needsRedaction: boolean;
  redactionNotes?: string;
  auditAction: string;
}) {
  const session = await requireComunAdmin();
  const attachmentId = String(input.formData.get("attachment_id") ?? "");
  const reportId = String(input.formData.get("report_id") ?? "");
  if (!attachmentId || !reportId) throw new Error("Anexo sem ID.");

  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");

  const { error } = await supabase
    .from("comun_report_attachments")
    .update({
      review_status: input.reviewStatus,
      public_approved: input.publicApproved,
      needs_redaction: input.needsRedaction,
      redaction_notes: input.redactionNotes ?? null,
      reviewed_by: session.admin.id,
      reviewed_at: new Date().toISOString(),
      public_storage_bucket: null,
      public_storage_path: null,
      public_mime_type: null,
      public_size_bytes: null,
      public_approved_at: null,
    })
    .eq("id", attachmentId)
    .eq("report_id", reportId);

  if (error) throw new Error(error.message);

  await logComunAdminAction({
    session,
    action: input.auditAction,
    targetType: "attachment",
    targetId: attachmentId,
    metadata: {
      attachment_id: attachmentId,
      report_id: reportId,
      review_status: input.reviewStatus,
      has_public_safe_version: false,
      redaction_notes_length: input.redactionNotes?.length ?? 0,
    },
  });

  revalidatePath(`/comun/admin/relatos/${reportId}`);
  revalidatePath("/comun/admin");
  revalidatePath("/comun/admin/anexos");
  redirect(safeAdminReturnPath(input.formData, reportId));
}

export async function uploadPublicSafeAttachment(formData: FormData) {
  const session = await requireComunAdmin();
  const attachmentId = String(formData.get("attachment_id") ?? "");
  const reportId = String(formData.get("report_id") ?? "");
  const file = formData.get("public_safe_file");
  if (!attachmentId || !reportId) throw new Error("Anexo sem ID.");
  if (!(file instanceof File) || file.size <= 0) throw new Error("Envie a versao publica segura.");
  if (!file.type.startsWith("image/")) throw new Error("A versao publica segura precisa ser imagem.");

  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");

  const bucket = "comun-public-safe-attachments";
  const extension = extensionFromFile(file);
  const storagePath = `${reportId}/${attachmentId}/${Date.now()}-${crypto.randomUUID()}${extension}`;
  const bytes = await file.arrayBuffer();
  const upload = await supabase.storage.from(bucket).upload(storagePath, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (upload.error) throw new Error(upload.error.message);

  const { error } = await supabase
    .from("comun_report_attachments")
    .update({
      review_status: "public_ready",
      public_approved: true,
      public_storage_bucket: bucket,
      public_storage_path: storagePath,
      public_mime_type: file.type || null,
      public_size_bytes: file.size || null,
      needs_redaction: false,
      redaction_notes: String(formData.get("redaction_notes") ?? "").trim() || null,
      reviewed_by: session.admin.id,
      reviewed_at: new Date().toISOString(),
      public_approved_at: new Date().toISOString(),
    })
    .eq("id", attachmentId)
    .eq("report_id", reportId);

  if (error) {
    await supabase.storage.from(bucket).remove([storagePath]);
    throw new Error(error.message);
  }

  await logComunAdminAction({
    session,
    action: "attachment_public_safe_uploaded",
    targetType: "attachment",
    targetId: attachmentId,
    metadata: {
      attachment_id: attachmentId,
      report_id: reportId,
      review_status: "public_ready",
      has_public_safe_version: true,
      public_size_bytes: file.size,
      public_mime_type: file.type || null,
    },
  });

  revalidatePath(`/comun/admin/relatos/${reportId}`);
  revalidatePath("/comun/admin");
  revalidatePath("/comun/admin/anexos");
  redirect(safeAdminReturnPath(formData, reportId));
}

function safeAdminReturnPath(formData: FormData, reportId: string) {
  const returnTo = String(formData.get("return_to") ?? "");
  if (returnTo.startsWith("/comun/admin/anexos")) return returnTo;
  if (returnTo.startsWith(`/comun/admin/relatos/${reportId}`)) return returnTo;
  return `/comun/admin/relatos/${reportId}`;
}

export async function createOrUpdateOfficialProtocolDraft(formData: FormData) {
  const comunProtocol = normalizeProtocol(String(formData.get("comun_protocol") ?? ""));
  await assertPublicOfficialProtocolAccess(comunProtocol);
  const report = await getOfficialProtocolReportSurface(comunProtocol);
  if (!report) throw new Error("Protocolo COMUN nao encontrado.");

  const protocol = await createOrUpdateOfficialProtocolDraftForReport(report, String(formData.get("channel") ?? "ouvidoria-municipal"));
  await logComunAdminAction({
    action: "official_protocol_text_generated",
    targetType: "official_protocol",
    targetId: protocol.id,
    metadata: {
      comun_protocol: comunProtocol,
      report_id: report.id,
      channel: protocol.channel,
      generated_text_length: protocol.generated_text?.length ?? 0,
    },
  });

  revalidatePath(`/comun/acompanhar/${comunProtocol}`);
  revalidatePath(`/comun/acompanhar/${comunProtocol}/ouvidoria`);
  redirect(`/comun/acompanhar/${encodeURIComponent(comunProtocol)}/ouvidoria`);
}

export async function saveOfficialProtocolNumber(formData: FormData) {
  const comunProtocol = normalizeProtocol(String(formData.get("comun_protocol") ?? ""));
  await assertPublicOfficialProtocolAccess(comunProtocol);
  const report = await getOfficialProtocolReportSurface(comunProtocol);
  if (!report) throw new Error("Protocolo COMUN nao encontrado.");

  const officialNumber = String(formData.get("official_protocol_number") ?? "").trim().slice(0, 120);
  if (!officialNumber) throw new Error("Informe o numero do protocolo oficial.");
  const submittedAt = parseOptionalDate(String(formData.get("submitted_at") ?? ""));
  const protocol = await ensureOfficialProtocolForReport(report);
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");

  const { error } = await supabase
    .from("comun_official_protocols")
    .update({
      official_protocol_number: officialNumber,
      submitted_by_user: true,
      submitted_at: submittedAt,
      status: "official_protocol_informed",
    })
    .eq("id", protocol.id);
  if (error) throw new Error(error.message);

  await logComunAdminAction({
    action: "official_protocol_number_saved",
    targetType: "official_protocol",
    targetId: protocol.id,
    metadata: { comun_protocol: comunProtocol, report_id: report.id, status: "official_protocol_informed" },
  });

  revalidatePath(`/comun/acompanhar/${comunProtocol}`);
  revalidatePath(`/comun/acompanhar/${comunProtocol}/ouvidoria`);
  redirect(`/comun/acompanhar/${encodeURIComponent(comunProtocol)}/ouvidoria`);
}

export async function saveOfficialProtocolResponse(formData: FormData) {
  const comunProtocol = normalizeProtocol(String(formData.get("comun_protocol") ?? ""));
  await assertPublicOfficialProtocolAccess(comunProtocol);
  const report = await getOfficialProtocolReportSurface(comunProtocol);
  if (!report) throw new Error("Protocolo COMUN nao encontrado.");
  const responseText = String(formData.get("response_text") ?? "").trim();
  if (!responseText) throw new Error("Informe a resposta recebida.");
  const satisfaction = normalizeSatisfaction(String(formData.get("satisfaction") ?? "unknown"));
  const protocol = await ensureOfficialProtocolForReport(report);
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");

  const { error } = await supabase
    .from("comun_official_protocols")
    .update({
      response_text: responseText,
      satisfaction,
      response_received_at: new Date().toISOString(),
      status: "response_received",
    })
    .eq("id", protocol.id);
  if (error) throw new Error(error.message);

  await logComunAdminAction({
    action: "official_protocol_response_saved",
    targetType: "official_protocol",
    targetId: protocol.id,
    metadata: {
      comun_protocol: comunProtocol,
      report_id: report.id,
      status: "response_received",
      response_text_length: responseText.length,
      satisfaction,
    },
  });

  revalidatePath(`/comun/acompanhar/${comunProtocol}`);
  revalidatePath(`/comun/acompanhar/${comunProtocol}/ouvidoria`);
  redirect(`/comun/acompanhar/${encodeURIComponent(comunProtocol)}/ouvidoria`);
}

export async function updateOfficialProtocolAdmin(formData: FormData) {
  const session = await requireComunAdmin();
  const reportId = String(formData.get("report_id") ?? "");
  const protocolId = String(formData.get("official_protocol_id") ?? "");
  if (!reportId || !protocolId) throw new Error("Protocolo oficial sem ID.");
  const status = normalizeOfficialStatus(String(formData.get("status") ?? "draft"));
  const responseText = String(formData.get("response_text") ?? "").trim();
  const publicSummary = String(formData.get("public_summary") ?? "").trim();
  const internalNotes = String(formData.get("internal_notes") ?? "").trim();
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");

  const { data: protocol, error } = await supabase
    .from("comun_official_protocols")
    .update({
      channel: String(formData.get("channel") ?? "ouvidoria-municipal"),
      agency: String(formData.get("agency") ?? "").trim() || null,
      official_protocol_number: String(formData.get("official_protocol_number") ?? "").trim() || null,
      submitted_at: parseOptionalDate(String(formData.get("submitted_at") ?? "")),
      expected_response_at: parseOptionalDate(String(formData.get("expected_response_at") ?? "")),
      status,
      response_text: responseText || null,
      response_received_at: parseOptionalDate(String(formData.get("response_received_at") ?? "")),
      satisfaction: normalizeSatisfaction(String(formData.get("satisfaction") ?? "")),
      public_summary: publicSummary || null,
      internal_notes: internalNotes || null,
    })
    .eq("id", protocolId)
    .eq("report_id", reportId)
    .select("id, comun_protocol")
    .single();
  if (error) throw new Error(error.message);

  await logComunAdminAction({
    session,
    action: "official_protocol_status_updated",
    targetType: "official_protocol",
    targetId: protocolId,
    metadata: {
      report_id: reportId,
      comun_protocol: protocol.comun_protocol,
      status,
      public_summary_length: publicSummary.length,
      response_text_length: responseText.length,
    },
  });

  revalidatePath(`/comun/admin/relatos/${reportId}`);
  revalidatePath(`/comun/acompanhar/${protocol.comun_protocol}`);
  revalidatePath(`/comun/acompanhar/${protocol.comun_protocol}/ouvidoria`);
  redirect(`/comun/admin/relatos/${reportId}`);
}

export async function updateOfficialProtocolQueueAction(formData: FormData) {
  const session = await requireComunAdmin();
  const protocolId = String(formData.get("official_protocol_id") ?? "");
  const intent = String(formData.get("intent") ?? "status");
  const returnTo = String(formData.get("return_to") ?? "/comun/admin/protocolos-oficiais");
  if (!protocolId) throw new Error("Protocolo oficial sem ID.");

  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");

  const statusFromForm = normalizeOfficialStatus(String(formData.get("status") ?? "waiting_response"));
  const nextStatus =
    intent === "resolved"
      ? "resolved"
      : intent === "unresolved"
        ? "unresolved"
        : intent === "archived"
          ? "archived"
          : intent === "response"
            ? "response_received"
            : statusFromForm;
  const responseText = String(formData.get("response_text") ?? "").trim();
  const publicSummary = String(formData.get("public_summary") ?? "").trim();
  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    public_summary: publicSummary || null,
  };

  if (intent === "response" && responseText) {
    updatePayload.response_text = responseText;
    updatePayload.response_received_at = new Date().toISOString();
  }
  if (intent === "summary") updatePayload.public_summary = publicSummary || null;

  const { data: protocol, error } = await supabase
    .from("comun_official_protocols")
    .update(updatePayload)
    .eq("id", protocolId)
    .select("id, report_id, comun_protocol")
    .single();
  if (error) throw new Error(error.message);

  const auditAction =
    intent === "response"
      ? "official_protocol_response_saved"
      : intent === "summary"
        ? "official_protocol_public_summary_updated"
        : intent === "resolved"
          ? "official_protocol_resolved"
          : intent === "unresolved"
            ? "official_protocol_unresolved"
            : intent === "archived"
              ? "official_protocol_archived"
              : "official_protocol_status_updated";

  await logComunAdminAction({
    session,
    action: auditAction,
    targetType: "official_protocol",
    targetId: protocolId,
    metadata: {
      report_id: protocol.report_id,
      comun_protocol: protocol.comun_protocol,
      status: nextStatus,
      response_text_length: responseText.length,
      public_summary_length: publicSummary.length,
    },
  });

  revalidatePath("/comun/admin/protocolos-oficiais");
  revalidatePath(`/comun/admin/relatos/${protocol.report_id}`);
  revalidatePath(`/comun/acompanhar/${protocol.comun_protocol}`);
  redirect(returnTo.startsWith("/comun/admin/protocolos-oficiais") ? returnTo : "/comun/admin/protocolos-oficiais");
}

export async function submitPautaContribution(formData: FormData) {
  const pautaId = String(formData.get("pauta_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const contributionType = normalizeContributionType(String(formData.get("contribution_type") ?? "relato"));
  const authorAlias = String(formData.get("author_alias") ?? "").trim().slice(0, 80);
  const contactPrivate = String(formData.get("contact_private") ?? "").trim().slice(0, 160);
  const body = String(formData.get("body") ?? "").trim();
  const honeypot = String(formData.get("company_website") ?? "");
  const challengeAnswer = String(formData.get("human_check") ?? "");
  if (!pautaId || !slug) throw new Error("Pauta sem ID.");
  if (body.length < 10) throw new Error("A contribuicao precisa ter pelo menos 10 caracteres.");

  const safety = await assessPautaContributionSafety({ pautaId, body, honeypot, challengeAnswer });
  if (!safety.allowed && safety.rateLimitReason) {
    await logComunAdminAction({
      action: "pauta_contribution_rate_limited",
      targetType: "pauta_space",
      targetId: pautaId,
      metadata: { reason: safety.rateLimitReason, risk_level: safety.risk_level, risk_reasons: safety.risk_reasons },
    });
    throw new Error("Recebemos muitas contribuicoes em pouco tempo. Tente novamente mais tarde.");
  }

  await createPendingPautaContribution({ pautaId, contributionType, authorAlias, body, contactPrivate, safety });
  await logComunAdminAction({
    action: "pauta_contribution_created",
    targetType: "pauta_space",
    targetId: pautaId,
    metadata: {
      status: safety.status,
      contribution_type: contributionType,
      risk_level: safety.risk_level,
      moderation_priority: safety.moderation_priority,
      risk_reasons: safety.risk_reasons,
    },
  });
  if (safety.risk_level !== "normal") {
    await logComunAdminAction({
      action: "pauta_contribution_flagged",
      targetType: "pauta_space",
      targetId: pautaId,
      metadata: { risk_level: safety.risk_level, moderation_priority: safety.moderation_priority, risk_reasons: safety.risk_reasons },
    });
  }
  revalidatePath(`/comun/pautas/${slug}`);
  redirect(`/comun/pautas/${slug}?contribuicao=${safety.status === "pending" ? "pendente" : "recebida"}`);
}

export async function upsertPautaSpaceAction(formData: FormData) {
  const session = await requireComunAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Informe o titulo da pauta.");
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");
  const current = id
    ? await supabase.from("comun_pauta_spaces").select("public_synthesis, next_step").eq("id", id).maybeSingle()
    : null;
  const publicSynthesis = String(formData.get("public_synthesis") ?? "").trim() || null;
  const nextStep = String(formData.get("next_step") ?? "").trim() || null;

  const payload = {
    slug: slugifyPauta(String(formData.get("slug") ?? "").trim() || title),
    title,
    summary: String(formData.get("summary") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    community: String(formData.get("community") ?? "").trim() || null,
    status: normalizePautaStatus(String(formData.get("status") ?? "observing")),
    visibility: String(formData.get("visibility") ?? "public") === "internal" ? "internal" : "public",
    public_synthesis: publicSynthesis,
    next_step: nextStep,
    updated_at: new Date().toISOString(),
  };

  const query = id
    ? supabase.from("comun_pauta_spaces").update(payload).eq("id", id)
    : supabase.from("comun_pauta_spaces").insert({ ...payload, created_from_signal: String(formData.get("created_from_signal") ?? "").trim() || null });
  const { data, error } = await query.select("id, slug").single();
  if (error) throw new Error(error.message);

  const previousSynthesis = current?.data?.public_synthesis ?? null;
  const previousNextStep = current?.data?.next_step ?? null;
  if (id && (previousSynthesis !== publicSynthesis || previousNextStep !== nextStep)) {
    const editorNote = String(formData.get("editor_note") ?? "").trim();
    await supabase.from("comun_pauta_synthesis_versions").insert({
      pauta_id: data.id,
      previous_public_synthesis: previousSynthesis,
      new_public_synthesis: publicSynthesis,
      previous_next_step: previousNextStep,
      new_next_step: nextStep,
      editor_note: editorNote || null,
    });
    await logComunAdminAction({
      session,
      action: "pauta_synthesis_updated",
      targetType: "pauta_space",
      targetId: data.id,
      metadata: {
        slug: data.slug,
        public_synthesis_changed: previousSynthesis !== publicSynthesis,
        next_step_changed: previousNextStep !== nextStep,
        editor_note_length: editorNote.length,
      },
    });
  }

  await logComunAdminAction({
    session,
    action: id ? "pauta_space_updated" : "pauta_space_created",
    targetType: "pauta_space",
    targetId: data.id,
    metadata: { slug: data.slug, status: payload.status, visibility: payload.visibility },
  });

  revalidatePath("/comun/pautas");
  revalidatePath(`/comun/pautas/${data.slug}`);
  revalidatePath("/comun/admin/pautas");
  redirect(`/comun/admin/pautas/${data.id}`);
}

export async function updatePautaEditorialChecklistAction(formData: FormData) {
  const session = await requireComunAdmin();
  const pautaId = String(formData.get("pauta_id") ?? "");
  if (!pautaId) throw new Error("Pauta sem ID.");
  const checklist = formData.getAll("editorial_checklist").map((value) => String(value)).filter(Boolean);
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");

  const { error } = await supabase.from("comun_pauta_spaces").update({
    editorial_checklist: checklist,
    updated_at: new Date().toISOString(),
  }).eq("id", pautaId);
  if (error) throw new Error(error.message);

  await logComunAdminAction({
    session,
    action: "pauta_editorial_checklist_updated",
    targetType: "pauta_space",
    targetId: pautaId,
    metadata: { checked_count: checklist.length },
  });
  revalidatePath(`/comun/admin/pautas/${pautaId}`);
  redirect(`/comun/admin/pautas/${pautaId}`);
}

export async function upsertPautaEvidenceAction(formData: FormData) {
  const session = await requireComunAdmin();
  const pautaId = String(formData.get("pauta_id") ?? "");
  const evidenceId = String(formData.get("evidence_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!pautaId || !title) throw new Error("Evidencia sem pauta ou titulo.");
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");
  const status = normalizeEvidenceStatus(String(formData.get("status") ?? "candidate"));
  const payload = {
    source_type: normalizeEvidenceSourceType(String(formData.get("source_type") ?? "manual")),
    source_id: String(formData.get("source_id") ?? "").trim() || null,
    title,
    summary: String(formData.get("summary") ?? "").trim() || null,
    evidence_type: normalizeEvidenceType(String(formData.get("evidence_type") ?? "outro")),
    sensitivity: normalizeEvidenceSensitivity(String(formData.get("sensitivity") ?? "public_safe")),
    status,
    public_note: String(formData.get("public_note") ?? "").trim() || null,
    internal_note: String(formData.get("internal_note") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };
  const query = evidenceId
    ? supabase.from("comun_pauta_evidence_items").update(payload).eq("id", evidenceId).eq("pauta_id", pautaId)
    : supabase.from("comun_pauta_evidence_items").insert({ ...payload, pauta_id: pautaId });
  const { data, error } = await query.select("id").single();
  if (error) throw new Error(error.message);

  const action = evidenceId
    ? status === "approved"
      ? "pauta_evidence_approved"
      : status === "rejected"
        ? "pauta_evidence_rejected"
        : status === "archived"
          ? "pauta_evidence_archived"
          : "pauta_evidence_updated"
    : "pauta_evidence_created";
  await logComunAdminAction({
    session,
    action,
    targetType: "pauta_evidence",
    targetId: data.id,
    metadata: {
      pauta_id: pautaId,
      source_type: payload.source_type,
      evidence_type: payload.evidence_type,
      sensitivity: payload.sensitivity,
      status,
    },
  });
  revalidatePath(`/comun/admin/pautas/${pautaId}`);
  revalidatePath("/comun/pautas");
  redirect(`/comun/admin/pautas/${pautaId}`);
}

export async function createPautaFromSignalAction(formData: FormData) {
  const session = await requireComunAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Sinal sem titulo.");
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");

  const community = String(formData.get("community") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const slug = slugifyPauta([community, category, title].filter(Boolean).join(" "));
  const { data, error } = await supabase.from("comun_pauta_spaces").insert({
    slug,
    title,
    summary: "Pauta criada a partir de sinal operacional de protocolos oficiais.",
    category,
    community,
    status: "organizing",
    visibility: "public",
    created_from_signal: String(formData.get("created_from_signal") ?? "protocolos-oficiais"),
  }).select("id, slug").single();
  if (error) throw new Error(error.message);

  await logComunAdminAction({
    session,
    action: "pauta_space_created_from_signal",
    targetType: "pauta_space",
    targetId: data.id,
    metadata: { slug, community, category },
  });

  revalidatePath("/comun/pautas");
  revalidatePath("/comun/admin/pautas");
  redirect(`/comun/admin/pautas/${data.id}`);
}

export async function moderatePautaContributionAction(formData: FormData) {
  const session = await requireComunAdmin();
  const id = String(formData.get("contribution_id") ?? "");
  const pautaId = String(formData.get("pauta_id") ?? "");
  const status = normalizeContributionStatus(String(formData.get("status") ?? "pending"));
  const notes = String(formData.get("moderator_notes") ?? "").trim();
  if (!id || !pautaId) throw new Error("Contribuicao sem ID.");
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");

  const { error } = await supabase.from("comun_pauta_contributions").update({
    status,
    moderator_notes: notes || null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: session.admin.id,
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("pauta_id", pautaId);
  if (error) throw new Error(error.message);

  await logComunAdminAction({
    session,
    action: status === "approved" ? "pauta_contribution_approved" : status === "rejected" ? "pauta_contribution_rejected" : "pauta_contribution_archived",
    targetType: "pauta_contribution",
    targetId: id,
    metadata: { pauta_id: pautaId, status },
  });
  revalidatePath("/comun/pautas");
  revalidatePath("/comun/admin/pautas");
  redirect(`/comun/admin/pautas/${pautaId}`);
}

export async function upsertPautaTaskAction(formData: FormData) {
  const session = await requireComunAdmin();
  const id = String(formData.get("task_id") ?? "");
  const pautaId = String(formData.get("pauta_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!pautaId || !title) throw new Error("Tarefa sem pauta ou titulo.");
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");
  const payload = {
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    status: normalizeTaskStatus(String(formData.get("status") ?? "open")),
    help_needed: formData.get("help_needed") === "true",
    owner_alias: String(formData.get("owner_alias") ?? "").trim() || null,
    due_at: parseOptionalDate(String(formData.get("due_at") ?? "")),
    updated_at: new Date().toISOString(),
  };
  const query = id
    ? supabase.from("comun_pauta_tasks").update(payload).eq("id", id).eq("pauta_id", pautaId)
    : supabase.from("comun_pauta_tasks").insert({ ...payload, pauta_id: pautaId });
  const { data, error } = await query.select("id").single();
  if (error) throw new Error(error.message);

  await logComunAdminAction({
    session,
    action: id ? (payload.status === "archived" ? "pauta_task_archived" : "pauta_task_updated") : "pauta_task_created",
    targetType: "pauta_task",
    targetId: data.id,
    metadata: { pauta_id: pautaId, status: payload.status },
  });
  revalidatePath("/comun/pautas");
  redirect(`/comun/admin/pautas/${pautaId}`);
}

async function ensureOfficialProtocolForReport(report: Awaited<ReturnType<typeof getOfficialProtocolReportSurface>>) {
  if (!report) throw new Error("Protocolo COMUN nao encontrado.");
  return createOrUpdateOfficialProtocolDraftForReport(report);
}

async function assertPublicOfficialProtocolAccess(comunProtocol: string) {
  if (!isValidProtocol(comunProtocol)) throw new Error("Protocolo COMUN invalido.");
  const rateLimit = await checkProtocolLookupRateLimit({
    protocol: comunProtocol,
    route: "/comun/acompanhar/[protocol]/ouvidoria",
  });
  if (!rateLimit.allowed) throw new Error("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.");
}

function parseOptionalDate(value: string) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeSatisfaction(value: string) {
  if (["satisfactory", "unsatisfactory", "partial", "unknown"].includes(value)) return value;
  return null;
}

function normalizeOfficialStatus(value: string) {
  const valid = [
    "draft",
    "text_generated",
    "sent_by_user",
    "official_protocol_informed",
    "waiting_response",
    "response_received",
    "satisfactory_response",
    "unsatisfactory_response",
    "overdue",
    "resolved",
    "unresolved",
    "archived",
  ];
  return valid.includes(value) ? value : "draft";
}

function normalizeContributionType(value: string) {
  const valid = ["relato", "evidencia", "proposta", "duvida", "contraponto", "encaminhamento", "tarefa_oferecida"];
  return valid.includes(value) ? value : "relato";
}

function normalizeContributionStatus(value: string) {
  const valid = ["pending", "approved", "rejected", "archived"];
  return valid.includes(value) ? value : "pending";
}

function normalizePautaStatus(value: string) {
  const valid = ["observing", "organizing", "drafting", "pressuring", "resolved", "unresolved", "archived"];
  return valid.includes(value) ? value : "observing";
}

function normalizeTaskStatus(value: string) {
  const valid = ["open", "in_progress", "done", "blocked", "archived"];
  return valid.includes(value) ? value : "open";
}

function normalizeEvidenceSourceType(value: string) {
  const valid = ["contribution", "report", "official_protocol", "manual", "external_reference"];
  return valid.includes(value) ? value : "manual";
}

function normalizeEvidenceType(value: string) {
  const valid = ["relato", "foto_segura", "protocolo", "resposta_oficial", "dado_agregado", "documento", "testemunho", "outro"];
  return valid.includes(value) ? value : "outro";
}

function normalizeEvidenceSensitivity(value: string) {
  const valid = ["public_safe", "needs_review", "private_only"];
  return valid.includes(value) ? value : "public_safe";
}

function normalizeEvidenceStatus(value: string) {
  const valid = ["candidate", "approved", "rejected", "archived"];
  return valid.includes(value) ? value : "candidate";
}
