"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getComunAdminSession,
  requireComunAdmin,
  requireComunAdminRole,
} from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import {
  createAdminNotification,
  safeDossierNotificationBody,
  updateAdminNotificationStatus,
} from "@/lib/admin-notifications";
import {
  canManagePublicDossierFeatures,
  canPublishDossier,
  canReviewEditorial,
  canReviewFactual,
  countActiveAdminProfiles,
  getAdminProfileById,
  normalizeAdminProfileRole,
  profileLabel,
} from "@/lib/admin-profiles";
import type { PautaDossierReviewPriority } from "@/lib/types";
import { checkProtocolLookupRateLimit } from "@/lib/rate-limit";
import {
  createOrUpdateOfficialProtocolDraftForReport,
  getOfficialProtocolReportSurface,
} from "@/lib/official-protocols";
import {
  createPautaDossierDraft,
  getAdminPautaDossier,
  getDossierPublicationSnapshot,
  regeneratePautaDossierDraft,
} from "@/lib/pauta-dossiers";
import {
  assessPautaContributionSafety,
  createPendingPautaContribution,
  slugifyPauta,
} from "@/lib/pauta-spaces";
import { generateProtocol } from "@/lib/protocol";
import { isValidProtocol, normalizeProtocol } from "@/lib/reports";
import {
  createPublicSupabaseClient,
  createServiceSupabaseClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { applyPautaAppTemplate, upsertPautaModule } from "@/lib/pauta-miniapps";
import {
  pautaAppTemplates,
  pautaModuleTypes,
  type PautaModuleType,
} from "@/lib/comun/pauta-module-registry";
import {
  getCommunitySession,
  requireCommunitySession,
} from "@/lib/community-auth";
import {
  communityOnboardingHref,
  safeCommunityReturn,
} from "@/lib/community-return";
import {
  communityLoginError,
  communitySignupError,
} from "@/lib/community-auth-errors";
import { withComunAppV2 } from "@/lib/comun-shell-contract";
import { withComunJourneyContext } from "@/lib/comun-journey-context";

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
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revise o formulario.",
    };
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

  const supabase =
    createServiceSupabaseClient() ?? createPublicSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      error:
        "Supabase ainda nao esta configurado. Preencha .env.local para salvar relatos.",
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
    title: buildStoredTitle(
      parsed.data.title,
      parsed.data.campaign_category,
      parsed.data.quick_category,
    ),
    period_text: parsed.data.period_text || null,
    approximate_location: parsed.data.approximate_location || null,
    neighborhood: parsed.data.neighborhood || null,
    involved_entity: parsed.data.involved_entity || null,
    latitude: isFiniteCoordinate(parsed.data.latitude, -90, 90)
      ? parsed.data.latitude
      : null,
    longitude: isFiniteCoordinate(parsed.data.longitude, -180, 180)
      ? parsed.data.longitude
      : null,
    location_accuracy: isFiniteCoordinate(
      parsed.data.location_accuracy,
      0,
      100000,
    )
      ? parsed.data.location_accuracy
      : null,
    location_source: parsed.data.location_source || null,
    public_location_level: "approximate",
    source_channel: isQuickReport ? "quick_report" : "detailed_report",
    has_attachments: hasPhoto,
    photo_count: hasPhoto ? 1 : 0,
    private_contact: parsed.data.accepts_contact
      ? parsed.data.private_contact || null
      : null,
    status: "received",
    risk_level: "unknown",
  };

  const { data: insertedReport, error } = await supabase
    .from("comun_reports")
    .insert(payload)
    .select("id")
    .single();
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
        .update({
          has_attachments: false,
          photo_count: 0,
          internal_notes: attachmentResult.error,
        })
        .eq("id", insertedReport.id);
    }
  }

  const confirmationUrl = isQuickReport
    ? `/comun/relatar/confirmacao?protocolo=${encodeURIComponent(protocol)}&modo=rapido`
    : `/comun/relatar/confirmacao?protocolo=${encodeURIComponent(protocol)}`;
  redirect(confirmationUrl);
}

async function storeReportPhoto({
  reportId,
  protocol,
  file,
}: {
  reportId: string;
  protocol: string;
  file: File;
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    return {
      ok: false,
      error: "Service role nao configurada para upload de anexo.",
    };

  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      error: "Anexo ignorado: o arquivo enviado nao era uma imagem.",
    };
  }

  const bucket = "comun-report-attachments";
  const extension = extensionFromFile(file);
  const storagePath = `${protocol}/${Date.now()}-${crypto.randomUUID()}${extension}`;
  const bytes = await file.arrayBuffer();
  const upload = await supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (upload.error) {
    return {
      ok: false,
      error: `Falha no upload privado do anexo: ${upload.error.message}`,
    };
  }

  const insertAttachment = await supabase
    .from("comun_report_attachments")
    .insert({
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
  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    : "";
  if (/^\.[a-z0-9]{2,5}$/.test(extension)) return extension;
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  return ".jpg";
}

function isFiniteCoordinate(
  value: number | undefined,
  min: number,
  max: number,
) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function buildStoredTitle(
  title: string | undefined,
  campaignCategory: string | undefined,
  quickCategory?: string,
) {
  const cleanTitle = title?.trim() || "";
  const cleanCategory = campaignCategory?.trim() || "";
  const cleanQuickCategory = quickCategory?.trim() || "";

  if (cleanQuickCategory) {
    const quickLabel = formatQuickCategory(cleanQuickCategory);
    return cleanTitle
      ? `[Rapido: ${quickLabel}] ${cleanTitle}`
      : `[Rapido: ${quickLabel}]`;
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
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/comun/admin");

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase Auth nao configurado." };
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return { ok: false, error: "E-mail ou senha invalidos." };
  }

  const service = createServiceSupabaseClient();
  const { data: admin } =
    service && authData.user
      ? await service
          .from("comun_admin_users")
          .select("id, user_id, email, role, is_active")
          .or(
            `user_id.eq.${authData.user.id},email.eq.${authData.user.email ?? ""}`,
          )
          .eq("is_active", true)
          .maybeSingle()
      : { data: null };
  if (!authData.user || !admin) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "Usuario autenticado, mas nao autorizado como admin COMUN.",
    };
  }

  await logComunAdminAction({
    session: {
      user: { id: authData.user.id, email: authData.user.email ?? null },
      admin,
      profile: null,
    },
    action: "admin_login_success",
  });
  redirect(redirectTo.startsWith("/comun/admin") ? redirectTo : "/comun/admin");
}

export async function logoutAdmin() {
  const session = await getComunAdminSession();
  await logComunAdminAction({ session, action: "admin_logout" });

  const supabase = await createSupabaseServerClient();
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
  if (intent === "publish" && !publicText)
    throw new Error("Publicacao exige versao publica sanitizada.");
  if (intent === "publish" && !canPublish)
    throw new Error("Relato sem autorizacao para publicacao sanitizada.");

  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");

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
      published_at:
        intent === "publish"
          ? new Date().toISOString()
          : intent === "unpublish"
            ? null
            : undefined,
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
  revalidatePath(
    String(formData.get("community_slug") ?? "").trim()
      ? `/comun/c/${String(formData.get("community_slug") ?? "").trim()}`
      : "/comun",
  );
  if (currentReport.issue_slug)
    revalidatePath(`/comun/pautas/${currentReport.issue_slug}`);
  if (String(formData.get("issue_slug") ?? "").trim())
    revalidatePath(
      `/comun/pautas/${String(formData.get("issue_slug") ?? "").trim()}`,
    );
  redirect(`/comun/admin/relatos/${id}`);
}

export async function updateAttachmentReviewStatus(formData: FormData) {
  const status = String(formData.get("review_status") ?? "");
  if (status !== "approved_private")
    throw new Error("Status de anexo invalido.");
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
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");

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
  if (!(file instanceof File) || file.size <= 0)
    throw new Error("Envie a versao publica segura.");
  if (!file.type.startsWith("image/"))
    throw new Error("A versao publica segura precisa ser imagem.");

  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");

  const bucket = "comun-public-safe-attachments";
  const extension = extensionFromFile(file);
  const storagePath = `${reportId}/${attachmentId}/${Date.now()}-${crypto.randomUUID()}${extension}`;
  const bytes = await file.arrayBuffer();
  const upload = await supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, {
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
      redaction_notes:
        String(formData.get("redaction_notes") ?? "").trim() || null,
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
  const comunProtocol = normalizeProtocol(
    String(formData.get("comun_protocol") ?? ""),
  );
  await assertPublicOfficialProtocolAccess(comunProtocol);
  const report = await getOfficialProtocolReportSurface(comunProtocol);
  if (!report) throw new Error("Protocolo COMUN nao encontrado.");

  const protocol = await createOrUpdateOfficialProtocolDraftForReport(
    report,
    String(formData.get("channel") ?? "ouvidoria-municipal"),
  );
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
  const comunProtocol = normalizeProtocol(
    String(formData.get("comun_protocol") ?? ""),
  );
  await assertPublicOfficialProtocolAccess(comunProtocol);
  const report = await getOfficialProtocolReportSurface(comunProtocol);
  if (!report) throw new Error("Protocolo COMUN nao encontrado.");

  const officialNumber = String(formData.get("official_protocol_number") ?? "")
    .trim()
    .slice(0, 120);
  if (!officialNumber)
    throw new Error("Informe o numero do protocolo oficial.");
  const submittedAt = parseOptionalDate(
    String(formData.get("submitted_at") ?? ""),
  );
  const protocol = await ensureOfficialProtocolForReport(report);
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");

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
    metadata: {
      comun_protocol: comunProtocol,
      report_id: report.id,
      status: "official_protocol_informed",
    },
  });

  revalidatePath(`/comun/acompanhar/${comunProtocol}`);
  revalidatePath(`/comun/acompanhar/${comunProtocol}/ouvidoria`);
  redirect(`/comun/acompanhar/${encodeURIComponent(comunProtocol)}/ouvidoria`);
}

export async function saveOfficialProtocolResponse(formData: FormData) {
  const comunProtocol = normalizeProtocol(
    String(formData.get("comun_protocol") ?? ""),
  );
  await assertPublicOfficialProtocolAccess(comunProtocol);
  const report = await getOfficialProtocolReportSurface(comunProtocol);
  if (!report) throw new Error("Protocolo COMUN nao encontrado.");
  const responseText = String(formData.get("response_text") ?? "").trim();
  if (!responseText) throw new Error("Informe a resposta recebida.");
  const satisfaction = normalizeSatisfaction(
    String(formData.get("satisfaction") ?? "unknown"),
  );
  const protocol = await ensureOfficialProtocolForReport(report);
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");

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
  const status = normalizeOfficialStatus(
    String(formData.get("status") ?? "draft"),
  );
  const responseText = String(formData.get("response_text") ?? "").trim();
  const publicSummary = String(formData.get("public_summary") ?? "").trim();
  const internalNotes = String(formData.get("internal_notes") ?? "").trim();
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");

  const { data: protocol, error } = await supabase
    .from("comun_official_protocols")
    .update({
      channel: String(formData.get("channel") ?? "ouvidoria-municipal"),
      agency: String(formData.get("agency") ?? "").trim() || null,
      official_protocol_number:
        String(formData.get("official_protocol_number") ?? "").trim() || null,
      submitted_at: parseOptionalDate(
        String(formData.get("submitted_at") ?? ""),
      ),
      expected_response_at: parseOptionalDate(
        String(formData.get("expected_response_at") ?? ""),
      ),
      status,
      response_text: responseText || null,
      response_received_at: parseOptionalDate(
        String(formData.get("response_received_at") ?? ""),
      ),
      satisfaction: normalizeSatisfaction(
        String(formData.get("satisfaction") ?? ""),
      ),
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
  const returnTo = String(
    formData.get("return_to") ?? "/comun/admin/protocolos-oficiais",
  );
  if (!protocolId) throw new Error("Protocolo oficial sem ID.");

  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");

  const statusFromForm = normalizeOfficialStatus(
    String(formData.get("status") ?? "waiting_response"),
  );
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
  if (intent === "summary")
    updatePayload.public_summary = publicSummary || null;

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
  redirect(
    returnTo.startsWith("/comun/admin/protocolos-oficiais")
      ? returnTo
      : "/comun/admin/protocolos-oficiais",
  );
}

export async function submitPautaContribution(formData: FormData) {
  const pautaId = String(formData.get("pauta_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const contributionType = normalizeContributionType(
    String(formData.get("contribution_type") ?? "relato"),
  );
  const authorAlias = String(formData.get("author_alias") ?? "")
    .trim()
    .slice(0, 80);
  const contactPrivate = String(formData.get("contact_private") ?? "")
    .trim()
    .slice(0, 160);
  const body = String(formData.get("body") ?? "").trim();
  const honeypot = String(formData.get("company_website") ?? "");
  const challengeAnswer = String(formData.get("human_check") ?? "");
  if (!pautaId || !slug) throw new Error("Pauta sem ID.");
  if (body.length < 10)
    throw new Error("A contribuicao precisa ter pelo menos 10 caracteres.");

  const safety = await assessPautaContributionSafety({
    pautaId,
    body,
    honeypot,
    challengeAnswer,
  });
  if (!safety.allowed && safety.rateLimitReason) {
    await logComunAdminAction({
      action: "pauta_contribution_rate_limited",
      targetType: "pauta_space",
      targetId: pautaId,
      metadata: {
        reason: safety.rateLimitReason,
        risk_level: safety.risk_level,
        risk_reasons: safety.risk_reasons,
      },
    });
    throw new Error(
      "Recebemos muitas contribuicoes em pouco tempo. Tente novamente mais tarde.",
    );
  }

  await createPendingPautaContribution({
    pautaId,
    contributionType,
    authorAlias,
    body,
    contactPrivate,
    safety,
  });
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
      metadata: {
        risk_level: safety.risk_level,
        moderation_priority: safety.moderation_priority,
        risk_reasons: safety.risk_reasons,
      },
    });
  }
  revalidatePath(`/comun/pautas/${slug}`);
  redirect(
    `/comun/pautas/${slug}?contribuicao=${safety.status === "pending" ? "pendente" : "recebida"}`,
  );
}

export async function applyPautaAppTemplateAction(formData: FormData) {
  const session = await requireComunAdmin();
  const pautaId = String(formData.get("pauta_id") ?? "");
  const template = String(
    formData.get("template") ?? "",
  ) as keyof typeof pautaAppTemplates;
  if (!pautaId || !(template in pautaAppTemplates))
    throw new Error("Modelo de aplicativo inválido.");
  const result = await applyPautaAppTemplate(
    pautaId,
    template,
    session.user.id,
  );
  await logComunAdminAction({
    session,
    action: "pauta_app_template_applied",
    targetType: "pauta_space",
    targetId: pautaId,
    metadata: { template, ...result },
  });
  revalidatePath(`/comun/admin/pautas/${pautaId}/aplicativo`);
  redirect(
    `/comun/admin/pautas/${pautaId}/aplicativo?template=${template}&created=${result.created}`,
  );
}

const communityAccountSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(10).max(128),
    password_confirmation: z.string().min(10).max(128),
    display_name: z.string().trim().min(2).max(80),
    terms: z.literal("on"),
    privacy: z.literal("on"),
    returnTo: z.string().optional(),
    website: z.string().max(0).optional(),
  })
  .strict();
export async function createCommunityAccount(_: unknown, formData: FormData) {
  const submitted = Object.fromEntries(
    [...formData].filter(([key]) => !key.startsWith("$ACTION_")),
  );
  const parsed = communityAccountSchema.safeParse(submitted);
  if (
    !parsed.success ||
    parsed.data.password !== parsed.data.password_confirmation
  )
    return { ok: false, error: "Não foi possível concluir o cadastro." };
  if ((process.env.COMMUNITY_REGISTRATION_MODE ?? "open") !== "open")
    return {
      ok: false,
      error: "Cadastros comunitários não estão abertos agora.",
    };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Cadastro indisponível." };
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
  });
  if (error || !data.user)
    return { ok: false, error: communitySignupError(error) };
  const service = createServiceSupabaseClient();
  if (!service) return { ok: false, error: "Cadastro indisponível." };
  const { error: profileError } = await service
    .from("comun_member_profiles" as never)
    .upsert(
      {
        user_id: data.user.id,
        display_name: parsed.data.display_name,
        participation_visibility: "private",
        profile_visibility: "private",
        terms_version: "2026-07",
        terms_accepted_at: new Date().toISOString(),
        privacy_version: "2026-07",
        privacy_accepted_at: new Date().toISOString(),
        status: "active",
      } as never,
      { onConflict: "user_id" as never },
    );
  if (profileError)
    return {
      ok: false,
      error: "Conta criada, mas o perfil precisa ser concluído mais tarde.",
    };
  redirect(
    communityOnboardingHref(
      parsed.data.returnTo ?? "/comun/minha-participacao",
    ),
  );
}

export async function loginCommunity(_: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Não foi possível entrar." };
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user)
    return { ok: false, error: communityLoginError(error) };
  const service = createServiceSupabaseClient();
  const { data: profile } = service
    ? await service
        .from("comun_member_profiles" as never)
        .select("status,onboarding_completed_at" as never)
        .eq("user_id" as never, data.user.id)
        .maybeSingle()
    : { data: null };
  if (
    !profile ||
    ["suspended", "deactivation_requested", "deactivated", "archived"].includes(
      (profile as any).status,
    )
  ) {
    await supabase.auth.signOut();
    return { ok: false, error: "Esta conta não está disponível para acesso." };
  }
  const returnTo = safeCommunityReturn(formData.get("returnTo"));
  if (!(profile as any).onboarding_completed_at)
    redirect(communityOnboardingHref(returnTo));
  redirect(returnTo);
}

export async function logoutCommunity() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/comun/entrar");
}

export async function followPautaAction(formData: FormData) {
  const pautaId = String(formData.get("pauta_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!pautaId || !slug) throw new Error("Pauta inválida.");
  const session = await requireCommunitySession(`/comun/pautas/${slug}`);
  const service = createServiceSupabaseClient();
  if (!service) throw new Error("Serviço indisponível.");
  const { data: pauta } = await service
    .from("comun_pauta_spaces" as never)
    .select("id,slug,visibility" as never)
    .eq("id" as never, pautaId)
    .eq("slug" as never, slug)
    .eq("visibility" as never, "public")
    .maybeSingle();
  if (!pauta) throw new Error("Pauta pública não encontrada.");
  const { error } = await service
    .from("comun_pauta_memberships" as never)
    .upsert(
      {
        pauta_id: pautaId,
        member_user_id: session.user.id,
        role: "participant",
        status: "active",
        left_at: null,
      } as never,
      { onConflict: "pauta_id,member_user_id" as never },
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/comun/pautas/${slug}`);
  revalidatePath("/comun/minha-participacao");
  redirect(`/comun/pautas/${slug}?acompanhando=1`);
}

export async function leavePautaAction(formData: FormData) {
  const session = await requireCommunitySession();
  const pautaId = String(formData.get("pauta_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const service = createServiceSupabaseClient();
  if (!service || !pautaId) throw new Error("Serviço indisponível.");
  const { error } = await service
    .from("comun_pauta_memberships" as never)
    .update({ status: "left", left_at: new Date().toISOString() } as never)
    .eq("pauta_id" as never, pautaId)
    .eq("member_user_id" as never, session.user.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/comun/pautas/${slug}`);
  revalidatePath("/comun/minha-participacao");
  redirect("/comun/minha-participacao");
}

export async function saveCommunityProfileAction(formData: FormData) {
  const session = await requireCommunitySession();
  const displayName = String(formData.get("display_name") ?? "")
    .trim()
    .slice(0, 80);
  const visibility = String(formData.get("profile_visibility") ?? "private");
  if (
    !displayName ||
    !["private", "pauta_members", "public"].includes(visibility)
  )
    throw new Error("Perfil inválido.");
  const service = createServiceSupabaseClient();
  if (!service) throw new Error("Serviço indisponível.");
  const { error } = await service
    .from("comun_member_profiles" as never)
    .update({
      display_name: displayName,
      public_bio:
        String(formData.get("public_bio") ?? "")
          .trim()
          .slice(0, 280) || null,
      profile_visibility: visibility,
      participation_visibility:
        visibility === "public"
          ? "public"
          : visibility === "pauta_members"
            ? "participants"
            : "private",
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("user_id" as never, session.user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/comun/minha-participacao");
  redirect(safeCommunityReturn(formData.get("returnTo")));
}

export async function requestCommunityDeactivationAction() {
  const session = await requireCommunitySession();
  const service = createServiceSupabaseClient();
  if (!service) throw new Error("Serviço indisponível.");
  const now = new Date().toISOString();
  const { error } = await service
    .from("comun_member_profiles" as never)
    .update({ status: "deactivation_requested", updated_at: now } as never)
    .eq("user_id" as never, session.user.id);
  if (error) throw new Error(error.message);
  await service
    .from("comun_pauta_memberships" as never)
    .update({ status: "paused" } as never)
    .eq("member_user_id" as never, session.user.id)
    .eq("status" as never, "active");
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/comun/entrar?status=desativacao-solicitada");
}

export async function requestCommunityPasswordReset(
  _: unknown,
  formData: FormData,
) {
  const email = z.string().trim().email().safeParse(formData.get("email"));
  const generic = {
    ok: true,
    message:
      "Se a conta existir, enviaremos instruções para redefinir o acesso.",
  };
  if (!email.success) return generic;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return generic;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email.data.toLowerCase(), {
    redirectTo: `${siteUrl}/comun/redefinir-acesso`,
  });
  return generic;
}

export async function resetCommunityPassword(_: unknown, formData: FormData) {
  const parsed = z
    .object({
      password: z.string().min(10).max(128),
      password_confirmation: z.string().min(10).max(128),
    })
    .safeParse(Object.fromEntries(formData));
  if (
    !parsed.success ||
    parsed.data.password !== parsed.data.password_confirmation
  )
    return {
      ok: false,
      error: "As senhas precisam coincidir e ter ao menos 10 caracteres.",
    };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Redefinição indisponível." };
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: "O link expirou ou já foi utilizado." };
  await supabase.auth.signOut();
  redirect("/comun/entrar?status=senha-redefinida");
}

export async function submitCircleContributionAction(formData: FormData) {
  const circleId = String(formData.get("circle_id") ?? "");
  const roundId = String(formData.get("round_id") ?? "");
  const pautaSlug = String(formData.get("pauta_slug") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const alias = String(formData.get("author_alias") ?? "")
    .trim()
    .slice(0, 80);
  const contact = String(formData.get("private_contact") ?? "")
    .trim()
    .slice(0, 160);
  if (!circleId || !roundId || !pautaSlug || body.length < 24)
    throw new Error("A contribuição precisa ter pelo menos 24 caracteres.");
  if (
    String(formData.get("company_website") ?? "").trim() ||
    String(formData.get("human_check") ?? "") !== "5"
  )
    throw new Error("Não foi possível validar a contribuição.");
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const community = await getCommunitySession();
  if (
    community &&
    ["suspended", "deactivation_requested", "deactivated", "archived"].includes(
      community.profile?.status,
    )
  )
    throw new Error("Conta indisponível para contribuir.");
  const protocol = `RODA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const { error } = await supabase
    .from("comun_circle_contributions" as never)
    .insert({
      circle_id: circleId,
      round_id: roundId,
      contribution_type: String(
        formData.get("contribution_type") ?? "testimony",
      ),
      public_body: body,
      author_display_name: alias || null,
      author_member_id: community?.user.id ?? null,
      private_contact: contact || null,
      anonymous_publication: formData.get("anonymous") === "on",
      status: "pending",
      public_protocol: protocol,
    } as never);
  if (error) throw new Error(error.message);
  await logComunAdminAction({
    action: "circle_contribution_received",
    targetType: "construction_circle",
    targetId: circleId,
    metadata: { protocol, body_length: body.length },
  });
  revalidatePath(`/comun/pautas/${pautaSlug}`);
  if (formData.get("experiencia") === "app-v2") {
    const pautaRoute = safeCommunityReturn(
      formData.get("journey_return"),
      withComunAppV2(`/comun/pautas/${pautaSlug}`),
    );
    redirect(
      withComunAppV2(
        withComunJourneyContext("/comun/participar/confirmacao", {
          intent: "contribute_pauta",
          sourceRoute: pautaRoute,
          returnTo: pautaRoute,
          pautaSlug,
          currentStage: "confirm",
          trackingRoute: "/comun/minha-participacao?secao=contribuicoes",
        }),
      ),
    );
  }
  redirect(`/comun/pautas/${pautaSlug}?contribuicao=pendente`);
}

export async function upsertPautaModuleAction(formData: FormData) {
  const session = await requireComunAdmin();
  const pautaId = String(formData.get("pauta_id") ?? "");
  const moduleType = String(
    formData.get("module_type") ?? "",
  ) as PautaModuleType;
  if (!pautaId || !pautaModuleTypes.includes(moduleType))
    throw new Error("Módulo inválido.");
  await upsertPautaModule({
    pautaId,
    moduleType,
    title: String(formData.get("title") ?? "")
      .trim()
      .slice(0, 120),
    description: String(formData.get("description") ?? "")
      .trim()
      .slice(0, 500),
    position: Number.parseInt(String(formData.get("position") ?? "0"), 10) || 0,
    status: String(formData.get("status") ?? "draft"),
    visibility: String(formData.get("visibility") ?? "private"),
    configText: String(formData.get("config") ?? "{}"),
    createdBy: session.user.id,
  });
  await logComunAdminAction({
    session,
    action: "pauta_app_module_upserted",
    targetType: "pauta_space",
    targetId: pautaId,
    metadata: { module_type: moduleType },
  });
  revalidatePath(`/comun/admin/pautas/${pautaId}/aplicativo`);
  redirect(`/comun/admin/pautas/${pautaId}/aplicativo`);
}

export async function upsertPautaSpaceAction(formData: FormData) {
  const session = await requireComunAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Informe o titulo da pauta.");
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const current = id
    ? await supabase
        .from("comun_pauta_spaces")
        .select("public_synthesis, next_step")
        .eq("id", id)
        .maybeSingle()
    : null;
  const publicSynthesis =
    String(formData.get("public_synthesis") ?? "").trim() || null;
  const nextStep = String(formData.get("next_step") ?? "").trim() || null;

  const payload = {
    slug: slugifyPauta(String(formData.get("slug") ?? "").trim() || title),
    title,
    summary: String(formData.get("summary") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    community: String(formData.get("community") ?? "").trim() || null,
    status: normalizePautaStatus(String(formData.get("status") ?? "observing")),
    visibility:
      String(formData.get("visibility") ?? "public") === "internal"
        ? "internal"
        : "public",
    public_synthesis: publicSynthesis,
    next_step: nextStep,
    public_status: String(formData.get("public_status") ?? "received"),
    internal_status:
      String(formData.get("internal_status") ?? "triage").trim() || "triage",
    priority: String(formData.get("priority") ?? "normal"),
    urgency: String(formData.get("urgency") ?? "normal"),
    risk_level: String(formData.get("risk_level") ?? "normal"),
    responsible_internal:
      String(formData.get("responsible_internal") ?? "").trim() || null,
    responsible_public:
      String(formData.get("responsible_public") ?? "").trim() || null,
    affected_people_public:
      String(formData.get("affected_people_public") ?? "").trim() || null,
    problem_public: String(formData.get("problem_public") ?? "").trim() || null,
    demand_public: String(formData.get("demand_public") ?? "").trim() || null,
    proposals_public:
      String(formData.get("proposals_public") ?? "").trim() || null,
    participation_public:
      String(formData.get("participation_public") ?? "").trim() || null,
    last_operational_update_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const query = id
    ? supabase.from("comun_pauta_spaces").update(payload).eq("id", id)
    : supabase.from("comun_pauta_spaces").insert({
        ...payload,
        created_from_signal:
          String(formData.get("created_from_signal") ?? "").trim() || null,
      });
  const { data, error } = await query.select("id, slug").single();
  if (error) throw new Error(error.message);

  const previousSynthesis = current?.data?.public_synthesis ?? null;
  const previousNextStep = current?.data?.next_step ?? null;
  if (
    id &&
    (previousSynthesis !== publicSynthesis || previousNextStep !== nextStep)
  ) {
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
    metadata: {
      slug: data.slug,
      status: payload.status,
      visibility: payload.visibility,
    },
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
  const checklist = formData
    .getAll("editorial_checklist")
    .map((value) => String(value))
    .filter(Boolean);
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");

  const { error } = await supabase
    .from("comun_pauta_spaces")
    .update({
      editorial_checklist: checklist,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pautaId);
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
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const status = normalizeEvidenceStatus(
    String(formData.get("status") ?? "candidate"),
  );
  const payload = {
    source_type: normalizeEvidenceSourceType(
      String(formData.get("source_type") ?? "manual"),
    ),
    source_id: String(formData.get("source_id") ?? "").trim() || null,
    title,
    summary: String(formData.get("summary") ?? "").trim() || null,
    evidence_type: normalizeEvidenceType(
      String(formData.get("evidence_type") ?? "outro"),
    ),
    sensitivity: normalizeEvidenceSensitivity(
      String(formData.get("sensitivity") ?? "public_safe"),
    ),
    status,
    public_note: String(formData.get("public_note") ?? "").trim() || null,
    internal_note: String(formData.get("internal_note") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };
  const query = evidenceId
    ? supabase
        .from("comun_pauta_evidence_items")
        .update(payload)
        .eq("id", evidenceId)
        .eq("pauta_id", pautaId)
    : supabase
        .from("comun_pauta_evidence_items")
        .insert({ ...payload, pauta_id: pautaId });
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
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");

  const community = String(formData.get("community") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const slug = slugifyPauta(
    [community, category, title].filter(Boolean).join(" "),
  );
  const { data, error } = await supabase
    .from("comun_pauta_spaces")
    .insert({
      slug,
      title,
      summary:
        "Pauta criada a partir de sinal operacional de protocolos oficiais.",
      category,
      community,
      status: "organizing",
      visibility: "public",
      created_from_signal: String(
        formData.get("created_from_signal") ?? "protocolos-oficiais",
      ),
    })
    .select("id, slug")
    .single();
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
  const status = normalizeContributionStatus(
    String(formData.get("status") ?? "pending"),
  );
  const notes = String(formData.get("moderator_notes") ?? "").trim();
  if (!id || !pautaId) throw new Error("Contribuicao sem ID.");
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");

  const { error } = await supabase
    .from("comun_pauta_contributions")
    .update({
      status,
      moderator_notes: notes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.admin.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("pauta_id", pautaId);
  if (error) throw new Error(error.message);

  await logComunAdminAction({
    session,
    action:
      status === "approved"
        ? "pauta_contribution_approved"
        : status === "rejected"
          ? "pauta_contribution_rejected"
          : "pauta_contribution_archived",
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
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const payload = {
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    status: normalizeTaskStatus(String(formData.get("status") ?? "open")),
    help_needed: formData.get("help_needed") === "true",
    owner_alias: String(formData.get("owner_alias") ?? "").trim() || null,
    due_at: parseOptionalDate(String(formData.get("due_at") ?? "")),
    required_skill: String(formData.get("required_skill") ?? "").trim() || null,
    priority: String(formData.get("priority") ?? "normal"),
    visibility: String(formData.get("visibility") ?? "public"),
    accepts_volunteers: formData.get("accepts_volunteers") === "true",
    participant_limit:
      Number(formData.get("participant_limit")) > 0
        ? Number(formData.get("participant_limit"))
        : null,
    result_public: String(formData.get("result_public") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };
  const query = id
    ? supabase
        .from("comun_pauta_tasks")
        .update(payload)
        .eq("id", id)
        .eq("pauta_id", pautaId)
    : supabase
        .from("comun_pauta_tasks")
        .insert({ ...payload, pauta_id: pautaId });
  const { data, error } = await query.select("id").single();
  if (error) throw new Error(error.message);

  await logComunAdminAction({
    session,
    action: id
      ? payload.status === "archived"
        ? "pauta_task_archived"
        : "pauta_task_updated"
      : "pauta_task_created",
    targetType: "pauta_task",
    targetId: data.id,
    metadata: { pauta_id: pautaId, status: payload.status },
  });
  revalidatePath("/comun/pautas");
  redirect(`/comun/admin/pautas/${pautaId}`);
}

export async function createPautaDossierDraftAction(formData: FormData) {
  const session = await requireComunAdmin();
  const pautaId = String(formData.get("pauta_id") ?? "");
  if (!pautaId) throw new Error("Pauta sem ID.");
  const dossierId = await createPautaDossierDraft(pautaId);
  await logComunAdminAction({
    session,
    action: "pauta_dossier_created",
    targetType: "pauta_dossier",
    targetId: dossierId,
    metadata: { pauta_id: pautaId },
  });
  revalidatePath(`/comun/admin/pautas/${pautaId}`);
  revalidatePath("/comun/admin/dossies");
  redirect(`/comun/admin/dossies/${dossierId}`);
}

export async function regeneratePautaDossierDraftAction(formData: FormData) {
  const session = await requireComunAdmin();
  const dossierId = String(formData.get("dossier_id") ?? "");
  const pautaId = String(formData.get("pauta_id") ?? "");
  if (!dossierId) throw new Error("Dossie sem ID.");
  await regeneratePautaDossierDraft(dossierId);
  await logComunAdminAction({
    session,
    action: "pauta_dossier_regenerated",
    targetType: "pauta_dossier",
    targetId: dossierId,
    metadata: { pauta_id: pautaId || null },
  });
  revalidatePath(`/comun/admin/dossies/${dossierId}`);
  if (pautaId) revalidatePath(`/comun/admin/pautas/${pautaId}`);
  redirect(`/comun/admin/dossies/${dossierId}`);
}

export async function updatePautaDossierAction(formData: FormData) {
  const session = await requireComunAdmin();
  const dossierId = String(formData.get("dossier_id") ?? "");
  const pautaId = String(formData.get("pauta_id") ?? "");
  if (!dossierId) throw new Error("Dossie sem ID.");
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const status = normalizeDossierStatus(
    String(formData.get("status") ?? "draft"),
  );
  const publicSlug = slugifyPauta(
    String(formData.get("public_slug") ?? "").trim() ||
      String(formData.get("public_title") ?? "").trim() ||
      String(formData.get("title") ?? "").trim(),
  );
  const publicTitle = String(formData.get("public_title") ?? "").trim();
  const publicSummary = String(formData.get("public_summary") ?? "").trim();
  const publicBody = String(formData.get("public_body") ?? "").trim();
  const payload = {
    title: String(formData.get("title") ?? "").trim() || "Dossie sem titulo",
    status,
    public_slug: publicSlug || null,
    public_title: publicTitle || null,
    public_summary: publicSummary || null,
    public_body: publicBody || null,
    publication_notes:
      String(formData.get("publication_notes") ?? "").trim() || null,
    executive_summary:
      String(formData.get("executive_summary") ?? "").trim() || null,
    problem_statement:
      String(formData.get("problem_statement") ?? "").trim() || null,
    affected_communities:
      String(formData.get("affected_communities") ?? "").trim() || null,
    evidence_summary:
      String(formData.get("evidence_summary") ?? "").trim() || null,
    official_protocols_summary:
      String(formData.get("official_protocols_summary") ?? "").trim() || null,
    demands: String(formData.get("demands") ?? "").trim() || null,
    next_steps: String(formData.get("next_steps") ?? "").trim() || null,
    public_version: String(formData.get("public_version") ?? "").trim() || null,
    internal_notes: String(formData.get("internal_notes") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("comun_pauta_dossiers")
    .update(payload)
    .eq("id", dossierId);
  if (error) throw new Error(error.message);
  await logComunAdminAction({
    session,
    action: "pauta_dossier_updated",
    targetType: "pauta_dossier",
    targetId: dossierId,
    metadata: {
      pauta_id: pautaId || null,
      status,
      public_version_length: payload.public_version?.length ?? 0,
      public_body_length: payload.public_body?.length ?? 0,
      internal_notes_length: payload.internal_notes?.length ?? 0,
    },
  });
  if (publicTitle || publicSummary || publicBody || publicSlug) {
    await logComunAdminAction({
      session,
      action: "pauta_dossier_public_version_updated",
      targetType: "pauta_dossier",
      targetId: dossierId,
      metadata: {
        pauta_id: pautaId || null,
        public_slug: publicSlug || null,
        public_title_length: publicTitle.length,
        public_summary_length: publicSummary.length,
        public_body_length: publicBody.length,
      },
    });
  }
  revalidatePath(`/comun/admin/dossies/${dossierId}`);
  revalidatePath(`/comun/admin/dossies/${dossierId}/preview`);
  revalidatePath("/comun/dossies");
  if (publicSlug) revalidatePath(`/comun/dossies/${publicSlug}`);
  if (pautaId) revalidatePath(`/comun/admin/pautas/${pautaId}`);
  redirect(`/comun/admin/dossies/${dossierId}`);
}

export async function updatePautaDossierReviewOpsAction(formData: FormData) {
  const session = await requireComunAdmin();
  const dossierId = String(formData.get("dossier_id") ?? "");
  if (!dossierId) throw new Error("Dossie sem ID.");
  const dossier = await getAdminPautaDossier(dossierId);
  if (!dossier) throw new Error("Dossie nao encontrado.");
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");

  const factualReviewer =
    String(formData.get("factual_reviewer_assigned") ?? "").trim() || null;
  const editorialReviewer =
    String(formData.get("editorial_reviewer_assigned") ?? "").trim() || null;
  const factualReviewerUserId =
    String(formData.get("factual_reviewer_assigned_user_id") ?? "").trim() ||
    null;
  const editorialReviewerUserId =
    String(formData.get("editorial_reviewer_assigned_user_id") ?? "").trim() ||
    null;
  const factualProfile = factualReviewerUserId
    ? await getAdminProfileById(factualReviewerUserId)
    : null;
  const editorialProfile = editorialReviewerUserId
    ? await getAdminProfileById(editorialReviewerUserId)
    : null;
  if (factualReviewerUserId && !factualProfile?.active)
    throw new Error("Responsavel factual precisa ser perfil admin ativo.");
  if (editorialReviewerUserId && !editorialProfile?.active)
    throw new Error("Responsavel editorial precisa ser perfil admin ativo.");
  const factualLabel = profileLabel(factualProfile) || factualReviewer;
  const editorialLabel = profileLabel(editorialProfile) || editorialReviewer;
  const reviewDueAt = parseOptionalDate(
    String(formData.get("review_due_at") ?? ""),
  );
  const reviewPriority = normalizeReviewPriority(
    String(formData.get("review_priority") ?? "normal"),
  );
  const reviewNotesInternal =
    String(formData.get("review_notes_internal") ?? "").trim() || null;
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("comun_pauta_dossiers")
    .update({
      factual_reviewer_assigned: factualLabel,
      editorial_reviewer_assigned: editorialLabel,
      factual_reviewer_assigned_user_id: factualReviewerUserId,
      editorial_reviewer_assigned_user_id: editorialReviewerUserId,
      review_priority: reviewPriority,
      review_due_at: reviewDueAt,
      review_notes_internal: reviewNotesInternal,
      updated_at: now,
    })
    .eq("id", dossierId);
  if (error) throw new Error(error.message);

  if (
    factualReviewer !== dossier.factual_reviewer_assigned ||
    editorialReviewer !== dossier.editorial_reviewer_assigned ||
    factualReviewerUserId !== dossier.factual_reviewer_assigned_user_id ||
    editorialReviewerUserId !== dossier.editorial_reviewer_assigned_user_id
  ) {
    await logComunAdminAction({
      session,
      action: "reviewer_assigned",
      targetType: "pauta_dossier",
      targetId: dossierId,
      metadata: {
        factual_reviewer_assigned: factualReviewer,
        editorial_reviewer_assigned: editorialReviewer,
        factual_reviewer_assigned_user_id: factualReviewerUserId,
        editorial_reviewer_assigned_user_id: editorialReviewerUserId,
      },
    });
    await logComunAdminAction({
      session,
      action: "review_assignee_user_changed",
      targetType: "pauta_dossier",
      targetId: dossierId,
      metadata: {
        factual_bound: Boolean(factualReviewerUserId),
        editorial_bound: Boolean(editorialReviewerUserId),
      },
    });
    if (
      factualLabel &&
      (factualLabel !== dossier.factual_reviewer_assigned ||
        factualReviewerUserId !== dossier.factual_reviewer_assigned_user_id)
    ) {
      const notificationId = await createAdminNotification({
        kind: "dossier_factual_assigned",
        targetId: dossierId,
        title: "Dossie atribuido para revisao factual",
        body: safeDossierNotificationBody({
          priority: reviewPriority,
          dueAt: reviewDueAt,
          pendingStage: "Revisao factual",
        }),
        priority: reviewPriority,
        assignedTo: factualLabel,
        assignedToUserId: factualReviewerUserId,
      });
      await logNotificationCreated(
        session,
        notificationId,
        dossierId,
        "dossier_factual_assigned",
      );
    }
    if (
      editorialLabel &&
      (editorialLabel !== dossier.editorial_reviewer_assigned ||
        editorialReviewerUserId !== dossier.editorial_reviewer_assigned_user_id)
    ) {
      const notificationId = await createAdminNotification({
        kind: "dossier_editorial_assigned",
        targetId: dossierId,
        title: "Dossie atribuido para revisao editorial",
        body: safeDossierNotificationBody({
          priority: reviewPriority,
          dueAt: reviewDueAt,
          pendingStage: "Revisao editorial",
        }),
        priority: reviewPriority,
        assignedTo: editorialLabel,
        assignedToUserId: editorialReviewerUserId,
      });
      await logNotificationCreated(
        session,
        notificationId,
        dossierId,
        "dossier_editorial_assigned",
      );
    }
  }
  if (reviewDueAt !== dossier.review_due_at) {
    await logComunAdminAction({
      session,
      action: "review_due_date_changed",
      targetType: "pauta_dossier",
      targetId: dossierId,
      metadata: { has_due_date: Boolean(reviewDueAt) },
    });
    if (reviewDueAt) {
      const kind = isBeforeToday(reviewDueAt)
        ? "dossier_overdue"
        : isToday(reviewDueAt)
          ? "dossier_due_today"
          : "dossier_due_date_changed";
      const notificationId = await createAdminNotification({
        kind,
        targetId: dossierId,
        title:
          kind === "dossier_overdue"
            ? "Dossie vencido"
            : kind === "dossier_due_today"
              ? "Dossie vence hoje"
              : "Prazo de revisao alterado",
        body: safeDossierNotificationBody({
          priority: reviewPriority,
          dueAt: reviewDueAt,
        }),
        priority: kind === "dossier_overdue" ? "urgent" : reviewPriority,
        assignedTo: factualLabel || editorialLabel,
        assignedToUserId: factualReviewerUserId || editorialReviewerUserId,
      });
      await logNotificationCreated(session, notificationId, dossierId, kind);
    }
  }
  if (reviewPriority !== dossier.review_priority) {
    await logComunAdminAction({
      session,
      action: "review_priority_changed",
      targetType: "pauta_dossier",
      targetId: dossierId,
      metadata: {
        previous_priority: dossier.review_priority,
        next_priority: reviewPriority,
      },
    });
    if (["high", "urgent"].includes(reviewPriority)) {
      const notificationId = await createAdminNotification({
        kind: "dossier_priority_high",
        targetId: dossierId,
        title:
          reviewPriority === "urgent"
            ? "Dossie com prioridade urgente"
            : "Dossie com prioridade alta",
        body: safeDossierNotificationBody({
          priority: reviewPriority,
          dueAt: reviewDueAt,
        }),
        priority: reviewPriority,
        assignedTo: factualLabel || editorialLabel,
        assignedToUserId: factualReviewerUserId || editorialReviewerUserId,
      });
      await logNotificationCreated(
        session,
        notificationId,
        dossierId,
        "dossier_priority_high",
      );
    }
  }
  if (reviewDueAt && isBeforeToday(reviewDueAt)) {
    await logComunAdminAction({
      session,
      action: "review_overdue_seen",
      targetType: "pauta_dossier",
      targetId: dossierId,
      metadata: { review_priority: reviewPriority },
    });
  }

  revalidatePath(`/comun/admin/dossies/${dossierId}`);
  revalidatePath("/comun/admin/dossies/revisoes");
  redirect(`/comun/admin/dossies/${dossierId}`);
}

export async function markAdminNotificationReadAction(formData: FormData) {
  const session = await requireComunAdmin();
  const id = String(formData.get("notification_id") ?? "");
  if (!id) throw new Error("Notificacao sem ID.");
  await updateAdminNotificationStatus(id, "read");
  await logComunAdminAction({
    session,
    action: "admin_notification_read",
    targetType: "admin_notification",
    targetId: id,
  });
  revalidatePath("/comun/admin/notificacoes");
  redirect("/comun/admin/notificacoes");
}

export async function archiveAdminNotificationAction(formData: FormData) {
  const session = await requireComunAdmin();
  const id = String(formData.get("notification_id") ?? "");
  if (!id) throw new Error("Notificacao sem ID.");
  await updateAdminNotificationStatus(id, "archived");
  await logComunAdminAction({
    session,
    action: "admin_notification_archived",
    targetType: "admin_notification",
    targetId: id,
  });
  revalidatePath("/comun/admin/notificacoes");
  redirect("/comun/admin/notificacoes");
}

export async function upsertAdminProfileAction(formData: FormData) {
  const session = await requireComunAdminRole(["admin"]);
  const profileId = String(formData.get("profile_id") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = normalizeAdminProfileRole(
    String(formData.get("role") ?? "viewer"),
  );
  const active = formData.get("active") === "true";
  const authUserIdInput = String(formData.get("auth_user_id") ?? "").trim();
  const clearAuthLink = formData.get("clear_auth_link") === "true";
  const operationalNote =
    String(formData.get("operational_note") ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 240) || null;
  if (!displayName || !email)
    throw new Error("Nome e e-mail sao obrigatorios.");
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");

  const current = profileId ? await getAdminProfileById(profileId) : null;
  const activeAdmins = await countActiveAdminProfiles();
  const wouldRemoveLastAdmin =
    current?.active &&
    current.role === "admin" &&
    activeAdmins <= 1 &&
    (!active || role !== "admin");
  if (wouldRemoveLastAdmin) {
    await logComunAdminAction({
      session,
      action: "admin_last_admin_protection_triggered",
      targetType: "admin_profile",
      targetId: profileId,
      metadata: { attempted_role: role, attempted_active: active },
    });
    throw new Error(
      "Nao e permitido remover ou desativar o ultimo admin ativo.",
    );
  }

  const payload = {
    display_name: displayName,
    email,
    role,
    active,
    auth_user_id: clearAuthLink
      ? null
      : authUserIdInput || current?.auth_user_id || null,
    operational_note: operationalNote,
    updated_at: new Date().toISOString(),
  };

  const query = profileId
    ? supabase.from("comun_admin_profiles").update(payload).eq("id", profileId)
    : supabase.from("comun_admin_profiles").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) throw new Error(error.message);
  const targetId = data.id as string;

  await logComunAdminAction({
    session,
    action: profileId ? "admin_profile_updated" : "admin_profile_created",
    targetType: "admin_profile",
    targetId,
    metadata: {
      role,
      active,
      has_auth_user_id: Boolean(payload.auth_user_id),
      note_length: operationalNote?.length ?? 0,
    },
  });
  if (current && current.role !== role) {
    await logComunAdminAction({
      session,
      action: "admin_profile_role_changed",
      targetType: "admin_profile",
      targetId,
      metadata: { previous_role: current.role, next_role: role },
    });
  }
  if (current && current.active && !active) {
    await logComunAdminAction({
      session,
      action: "admin_profile_deactivated",
      targetType: "admin_profile",
      targetId,
    });
  }
  if (current && !current.active && active) {
    await logComunAdminAction({
      session,
      action: "admin_profile_reactivated",
      targetType: "admin_profile",
      targetId,
    });
  }
  if (current && current.auth_user_id !== payload.auth_user_id) {
    await logComunAdminAction({
      session,
      action: "admin_profile_auth_link_changed",
      targetType: "admin_profile",
      targetId,
      metadata: { has_auth_user_id: Boolean(payload.auth_user_id) },
    });
  }

  revalidatePath("/comun/admin/equipe");
  redirect("/comun/admin/equipe");
}

export async function preparePautaDossierPublicVersionAction(
  formData: FormData,
) {
  const session = await requireComunAdmin();
  const dossierId = String(formData.get("dossier_id") ?? "");
  if (!dossierId) throw new Error("Dossie sem ID.");
  const dossier = await getAdminPautaDossier(dossierId);
  if (!dossier) throw new Error("Dossie nao encontrado.");
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const publicTitle = dossier.public_title || dossier.title;
  const publicSummary =
    dossier.public_summary ||
    dossier.executive_summary ||
    dossier.problem_statement ||
    "Dossie em revisao editorial.";
  const publicBody =
    dossier.public_body ||
    dossier.public_version ||
    [
      dossier.executive_summary,
      dossier.problem_statement,
      dossier.evidence_summary,
      dossier.official_protocols_summary,
      dossier.demands,
      dossier.next_steps,
    ]
      .filter(Boolean)
      .join("\n\n");
  const publicSlug =
    dossier.public_slug ||
    (await nextPublicDossierSlug(publicTitle, dossier.id));
  const { error } = await supabase
    .from("comun_pauta_dossiers")
    .update({
      public_slug: publicSlug,
      public_title: publicTitle,
      public_summary: publicSummary,
      public_body: publicBody,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dossierId);
  if (error) throw new Error(error.message);
  await logComunAdminAction({
    session,
    action: "pauta_dossier_public_version_prepared",
    targetType: "pauta_dossier",
    targetId: dossierId,
    metadata: {
      public_slug: publicSlug,
      public_body_length: publicBody.length,
    },
  });
  revalidatePath(`/comun/admin/dossies/${dossierId}`);
  redirect(`/comun/admin/dossies/${dossierId}`);
}

export async function savePautaDossierFinalPublicationChecklistAction(
  formData: FormData,
) {
  const session = await requireComunAdmin();
  const dossierId = String(formData.get("dossier_id") ?? "");
  if (!dossierId) throw new Error("Dossie sem ID.");
  const checklistValues = formData
    .getAll("final_publication_checklist")
    .map((value) => String(value));
  const checklist = Object.fromEntries(
    checklistValues.map((value) => [value, true]),
  );
  const finalNotes =
    String(formData.get("final_publication_notes") ?? "").trim() || null;
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const { error } = await supabase
    .from("comun_pauta_dossiers")
    .update({
      final_publication_checklist: checklist,
      final_publication_notes: finalNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dossierId);
  if (error) throw new Error(error.message);
  await logComunAdminAction({
    session,
    action: "dossier_publication_final_checklist_saved",
    targetType: "pauta_dossier",
    targetId: dossierId,
    metadata: {
      checked_count: checklistValues.length,
      notes_length: finalNotes?.length ?? 0,
    },
  });
  revalidatePath(`/comun/admin/dossies/${dossierId}`);
  redirect(`/comun/admin/dossies/${dossierId}`);
}

export async function rollbackPautaDossierPublicationSnapshotAction(
  formData: FormData,
) {
  const session = await requireComunAdmin();
  if (!session.profile || !canPublishDossier(session.profile.role)) {
    throw new Error("Rollback exige perfil publisher ou admin.");
  }
  const dossierId = String(formData.get("dossier_id") ?? "");
  const snapshotId = String(formData.get("snapshot_id") ?? "");
  if (!dossierId || !snapshotId) throw new Error("Snapshot invalido.");
  const dossier = await getAdminPautaDossier(dossierId);
  const source = await getDossierPublicationSnapshot(snapshotId);
  if (!dossier || !source || source.dossier_id !== dossierId)
    throw new Error("Snapshot nao encontrado para este dossie.");
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const now = new Date().toISOString();
  const active = dossier.publication_snapshots.filter(
    (snapshot) =>
      ["published", "rollback"].includes(snapshot.snapshot_status) &&
      !snapshot.unpublished_at,
  );
  for (const snapshot of active) {
    await supabase
      .from("comun_pauta_dossier_publication_snapshots")
      .update({ snapshot_status: "superseded" })
      .eq("id", snapshot.id);
    await logComunAdminAction({
      session,
      action: "dossier_publication_snapshot_superseded",
      targetType: "pauta_dossier_publication_snapshot",
      targetId: snapshot.id,
      metadata: {
        dossier_id: dossierId,
        rollback_source_snapshot_id: source.id,
      },
    });
  }
  const { data, error } = await supabase
    .from("comun_pauta_dossier_publication_snapshots")
    .insert({
      dossier_id: dossierId,
      public_title: source.public_title,
      public_summary: source.public_summary,
      public_body: source.public_body,
      public_slug: source.public_slug,
      published_by_user_id: session.profile.id,
      published_by_name_snapshot: profileLabel(session.profile),
      published_at: now,
      snapshot_status: "rollback",
      public_change_note:
        source.public_change_note || "Versao revisada publicada.",
      public_version_label: source.public_version_label || "Versao revisada",
      public_updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabase
    .from("comun_pauta_dossiers")
    .update({
      review_status: "published",
      public_title: source.public_title,
      public_summary: source.public_summary,
      public_body: source.public_body,
      public_slug: source.public_slug,
      published_at: now,
      unpublished_at: null,
      updated_at: now,
    })
    .eq("id", dossierId);
  await logComunAdminAction({
    session,
    action: "dossier_publication_rollback_created",
    targetType: "pauta_dossier_publication_snapshot",
    targetId: data.id,
    metadata: { dossier_id: dossierId, source_snapshot_id: source.id },
  });
  revalidatePath(`/comun/admin/dossies/${dossierId}`);
  revalidatePath("/comun/dossies");
  revalidatePath(`/comun/dossies/${source.public_slug}`);
  redirect(`/comun/admin/dossies/${dossierId}`);
}

export async function updateDossierPublicationSnapshotPublicNoteAction(
  formData: FormData,
) {
  const session = await requireComunAdmin();
  if (!session.profile || !canPublishDossier(session.profile.role)) {
    throw new Error("Edicao de nota publica exige perfil publisher ou admin.");
  }
  const dossierId = String(formData.get("dossier_id") ?? "");
  const snapshotId = String(formData.get("snapshot_id") ?? "");
  if (!dossierId || !snapshotId) throw new Error("Snapshot invalido.");
  const snapshot = await getDossierPublicationSnapshot(snapshotId);
  if (!snapshot || snapshot.dossier_id !== dossierId)
    throw new Error("Snapshot nao encontrado para este dossie.");
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const publicChangeNote = sanitizePublicChangeNote(
    String(formData.get("public_change_note") ?? ""),
  );
  const publicVersionLabel = sanitizePublicVersionLabel(
    String(formData.get("public_version_label") ?? ""),
  );
  const publicUpdatedAt =
    parseOptionalDate(String(formData.get("public_updated_at") ?? "")) ||
    snapshot.public_updated_at ||
    snapshot.published_at;
  const { error } = await supabase
    .from("comun_pauta_dossier_publication_snapshots")
    .update({
      public_change_note: publicChangeNote || null,
      public_version_label: publicVersionLabel || "Versao revisada",
      public_updated_at: publicUpdatedAt,
    })
    .eq("id", snapshotId);
  if (error) throw new Error(error.message);
  await logComunAdminAction({
    session,
    action: "dossier_publication_public_change_note_updated",
    targetType: "pauta_dossier_publication_snapshot",
    targetId: snapshotId,
    metadata: {
      dossier_id: dossierId,
      note_length: publicChangeNote.length,
      version_label: publicVersionLabel || "Versao revisada",
    },
  });
  revalidatePath(`/comun/admin/dossies/${dossierId}`);
  revalidatePath("/comun/dossies");
  revalidatePath(`/comun/dossies/${snapshot.public_slug}`);
  redirect(`/comun/admin/dossies/${dossierId}`);
}

export async function updatePautaDossierWorkflowAction(formData: FormData) {
  const session = await requireComunAdmin();
  const dossierId = String(formData.get("dossier_id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!dossierId) throw new Error("Dossie sem ID.");
  const dossier = await getAdminPautaDossier(dossierId);
  if (!dossier) throw new Error("Dossie nao encontrado.");
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const now = new Date().toISOString();
  const checked = formData.getAll("safety_check").map((value) => String(value));
  const allSafetyChecked = checked.length >= 6;
  const payload: Record<string, unknown> = { updated_at: now };
  let auditAction = "pauta_dossier_sent_to_review";

  if (intent === "send_to_review") {
    payload.review_status = "editorial_review";
    payload.reviewed_by_editor_at = now;
  } else if (intent === "changes_requested") {
    payload.review_status = "changes_requested";
    auditAction = "pauta_dossier_changes_requested";
  } else if (intent === "approve") {
    if (!allSafetyChecked)
      throw new Error("Aprovacao exige checklist de seguranca marcado.");
    if (
      !dossier.public_title ||
      !dossier.public_summary ||
      !dossier.public_body ||
      !dossier.public_slug
    ) {
      throw new Error("Prepare e revise a versao publica antes de aprovar.");
    }
    payload.review_status = "approved";
    payload.approved_for_publication_at = now;
    auditAction = "pauta_dossier_approved";
  } else if (intent === "publish") {
    if (!session.profile || !canPublishDossier(session.profile.role)) {
      await logComunAdminAction({
        session,
        action: "review_permission_denied",
        targetType: "pauta_dossier",
        targetId: dossierId,
        metadata: { intent, required_role: "publisher" },
      });
      throw new Error("Publicacao exige perfil publisher ou admin.");
    }
    if (dossier.review_status !== "approved")
      throw new Error("So e possivel publicar dossie aprovado.");
    if (
      !dossier.public_title ||
      !dossier.public_summary ||
      !dossier.public_body ||
      !dossier.public_slug
    ) {
      throw new Error(
        "Publicacao exige titulo, resumo, corpo e slug publicos.",
      );
    }
    if (!dossier.review_state.canPublish) {
      const action = dossier.review_state.missingReasons.some((reason) =>
        reason.includes("identity"),
      )
        ? "dossier_publication_blocked_missing_reviewer_identity"
        : "pauta_dossier_publication_blocked_missing_reviews";
      await logComunAdminAction({
        session,
        action,
        targetType: "pauta_dossier",
        targetId: dossierId,
        metadata: {
          missing_reasons: dossier.review_state.missingReasons,
          factual_reviewer: dossier.review_state.factualReviewer,
          editorial_reviewer: dossier.review_state.editorialReviewer,
        },
      });
      throw new Error(
        `Publicacao exige revisao factual e editorial aprovadas por revisores reais distintos vinculados a perfis administrativos: ${dossier.review_state.missingReasons.join(", ")}`,
      );
    }
    const missingFinalChecklist = getMissingFinalPublicationChecklist(
      dossier.final_publication_checklist,
    );
    if (missingFinalChecklist.length) {
      await logComunAdminAction({
        session,
        action: "dossier_publication_blocked_final_checklist",
        targetType: "pauta_dossier",
        targetId: dossierId,
        metadata: { missing_final_checklist: missingFinalChecklist },
      });
      throw new Error(
        `Checklist final incompleto: ${missingFinalChecklist.join(", ")}`,
      );
    }
    const activeSameSlug = await supabase
      .from("comun_pauta_dossier_publication_snapshots")
      .select("id, dossier_id")
      .eq("public_slug", dossier.public_slug)
      .in("snapshot_status", ["published", "rollback"])
      .is("unpublished_at", null);
    if (activeSameSlug.error) throw new Error(activeSameSlug.error.message);
    const conflictingSlug = (activeSameSlug.data ?? []).find(
      (snapshot) => snapshot.dossier_id !== dossierId,
    );
    if (conflictingSlug)
      throw new Error("Ja existe snapshot publico ativo usando este slug.");
    const activeSnapshots = dossier.publication_snapshots.filter(
      (snapshot) =>
        ["published", "rollback"].includes(snapshot.snapshot_status) &&
        !snapshot.unpublished_at,
    );
    for (const snapshot of activeSnapshots) {
      const supersede = await supabase
        .from("comun_pauta_dossier_publication_snapshots")
        .update({ snapshot_status: "superseded" })
        .eq("id", snapshot.id);
      if (supersede.error) throw new Error(supersede.error.message);
      await logComunAdminAction({
        session,
        action: "dossier_publication_snapshot_superseded",
        targetType: "pauta_dossier_publication_snapshot",
        targetId: snapshot.id,
        metadata: { dossier_id: dossierId, public_slug: snapshot.public_slug },
      });
    }
    const insertSnapshot = await supabase
      .from("comun_pauta_dossier_publication_snapshots")
      .insert({
        dossier_id: dossierId,
        public_title: dossier.public_title,
        public_summary: dossier.public_summary,
        public_body: dossier.public_body,
        public_slug: dossier.public_slug,
        published_by_user_id: session.profile.id,
        published_by_name_snapshot: profileLabel(session.profile),
        published_at: now,
        snapshot_status: "published",
        public_change_note:
          sanitizePublicChangeNote(
            String(formData.get("public_change_note") ?? ""),
          ) ||
          (activeSnapshots.length
            ? "Versao publica revisada."
            : "Publicacao inicial."),
        public_version_label:
          sanitizePublicVersionLabel(
            String(formData.get("public_version_label") ?? ""),
          ) || "Versao revisada",
        public_updated_at: now,
      })
      .select("id")
      .single();
    if (insertSnapshot.error) throw new Error(insertSnapshot.error.message);
    await logComunAdminAction({
      session,
      action: "dossier_publication_snapshot_created",
      targetType: "pauta_dossier_publication_snapshot",
      targetId: insertSnapshot.data.id,
      metadata: {
        dossier_id: dossierId,
        public_slug: dossier.public_slug,
        previous_active_snapshots: activeSnapshots.length,
      },
    });
    payload.review_status = "published";
    payload.published_at = now;
    payload.unpublished_at = null;
    auditAction = "pauta_dossier_published";
  } else if (intent === "unpublish") {
    if (!session.profile || !canPublishDossier(session.profile.role)) {
      await logComunAdminAction({
        session,
        action: "review_permission_denied",
        targetType: "pauta_dossier",
        targetId: dossierId,
        metadata: { intent, required_role: "publisher" },
      });
      throw new Error("Despublicacao exige perfil publisher ou admin.");
    }
    const unpublishReason = String(
      formData.get("unpublish_reason") ?? "",
    ).trim();
    if (!unpublishReason)
      throw new Error("Despublicacao exige motivo registrado.");
    const activeSnapshots = dossier.publication_snapshots.filter(
      (snapshot) =>
        ["published", "rollback"].includes(snapshot.snapshot_status) &&
        !snapshot.unpublished_at,
    );
    for (const snapshot of activeSnapshots) {
      const unpublish = await supabase
        .from("comun_pauta_dossier_publication_snapshots")
        .update({
          snapshot_status: "unpublished",
          unpublished_at: now,
          unpublished_by_user_id: session.profile.id,
          unpublish_reason: unpublishReason,
        })
        .eq("id", snapshot.id);
      if (unpublish.error) throw new Error(unpublish.error.message);
      await logComunAdminAction({
        session,
        action: "dossier_unpublished_with_reason",
        targetType: "pauta_dossier_publication_snapshot",
        targetId: snapshot.id,
        metadata: {
          dossier_id: dossierId,
          reason_length: unpublishReason.length,
        },
      });
    }
    payload.review_status = "unpublished";
    payload.unpublished_at = now;
    auditAction = "pauta_dossier_unpublished";
  } else if (intent === "archive") {
    payload.review_status = "archived";
    payload.unpublished_at = dossier.published_at
      ? now
      : dossier.unpublished_at;
    auditAction = "pauta_dossier_archived";
  } else {
    throw new Error("Acao editorial invalida.");
  }

  const { error } = await supabase
    .from("comun_pauta_dossiers")
    .update(payload)
    .eq("id", dossierId);
  if (error) throw new Error(error.message);
  await logComunAdminAction({
    session,
    action: auditAction,
    targetType: "pauta_dossier",
    targetId: dossierId,
    metadata: {
      intent,
      previous_review_status: dossier.review_status,
      next_review_status: payload.review_status,
      public_slug: dossier.public_slug,
      safety_checked_count: checked.length,
    },
  });
  if (intent === "approve" && dossier.review_state.canPublish) {
    const notificationId = await createAdminNotification({
      kind: "dossier_ready_to_publish",
      targetId: dossierId,
      title: "Dossie pronto para publicacao",
      body: safeDossierNotificationBody({
        priority: dossier.review_priority,
        dueAt: dossier.review_due_at,
        pendingStage: "Pronto para publicar",
      }),
      priority: dossier.review_priority,
      assignedTo:
        dossier.editorial_reviewer_assigned ||
        dossier.factual_reviewer_assigned,
      assignedToUserId:
        dossier.editorial_reviewer_assigned_user_id ||
        dossier.factual_reviewer_assigned_user_id,
    });
    await logNotificationCreated(
      session,
      notificationId,
      dossierId,
      "dossier_ready_to_publish",
    );
  }
  revalidatePath(`/comun/admin/dossies/${dossierId}`);
  revalidatePath("/comun/admin/dossies");
  revalidatePath("/comun/dossies");
  if (dossier.public_slug)
    revalidatePath(`/comun/dossies/${dossier.public_slug}`);
  redirect(`/comun/admin/dossies/${dossierId}`);
}

export async function createPautaDossierReviewAction(formData: FormData) {
  const session = await requireComunAdmin();
  const dossierId = String(formData.get("dossier_id") ?? "");
  const reviewStage = normalizeDossierReviewStage(
    String(formData.get("review_stage") ?? ""),
  );
  const decision = normalizeDossierReviewDecision(
    String(formData.get("decision") ?? "approved"),
  );
  if (!dossierId) throw new Error("Dossie sem ID.");
  const profile = session.profile;
  if (!profile?.active) {
    await logComunAdminAction({
      session,
      action: "review_permission_denied",
      targetType: "pauta_dossier",
      targetId: dossierId,
      metadata: { review_stage: reviewStage, reason: "missing_active_profile" },
    });
    throw new Error(
      "Revisao exige perfil admin ativo vinculado ao usuario autenticado.",
    );
  }
  if (
    decision === "approved" &&
    reviewStage === "factual_review" &&
    !canReviewFactual(profile.role)
  ) {
    await logComunAdminAction({
      session,
      action: "review_permission_denied",
      targetType: "pauta_dossier",
      targetId: dossierId,
      metadata: { review_stage: reviewStage, role: profile.role },
    });
    throw new Error(
      "Revisao factual exige perfil factual_reviewer, editor ou admin.",
    );
  }
  if (
    decision === "approved" &&
    reviewStage === "editorial_review" &&
    !canReviewEditorial(profile.role)
  ) {
    await logComunAdminAction({
      session,
      action: "review_permission_denied",
      targetType: "pauta_dossier",
      targetId: dossierId,
      metadata: { review_stage: reviewStage, role: profile.role },
    });
    throw new Error(
      "Revisao editorial exige perfil editorial_reviewer, editor ou admin.",
    );
  }
  const dossier = await getAdminPautaDossier(dossierId);
  if (!dossier) throw new Error("Dossie nao encontrado.");
  if (
    decision === "approved" &&
    reviewStage === "factual_review" &&
    dossier.review_state.editorialReviewerUserId === profile.id
  ) {
    await logComunAdminAction({
      session,
      action: "review_same_user_blocked",
      targetType: "pauta_dossier",
      targetId: dossierId,
      metadata: { review_stage: reviewStage },
    });
    throw new Error(
      "A mesma conta nao pode aprovar factual e editorial do mesmo dossie.",
    );
  }
  if (
    decision === "approved" &&
    reviewStage === "editorial_review" &&
    dossier.review_state.factualReviewerUserId === profile.id
  ) {
    await logComunAdminAction({
      session,
      action: "review_same_user_blocked",
      targetType: "pauta_dossier",
      targetId: dossierId,
      metadata: { review_stage: reviewStage },
    });
    throw new Error(
      "A mesma conta nao pode aprovar factual e editorial do mesmo dossie.",
    );
  }
  const reviewerName = profile.display_name;
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const checklistValues = formData
    .getAll("review_checklist")
    .map((value) => String(value));
  const checklist = Object.fromEntries(
    checklistValues.map((value) => [value, true]),
  );
  const { data, error } = await supabase
    .from("comun_pauta_dossier_reviews")
    .insert({
      dossier_id: dossierId,
      review_stage: reviewStage,
      reviewer_name: reviewerName,
      reviewer_role: profile.role,
      reviewer_user_id: profile.id,
      decision,
      checklist,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const auditAction =
    decision === "changes_requested"
      ? "pauta_dossier_review_changes_requested"
      : decision === "rejected"
        ? "pauta_dossier_review_rejected"
        : reviewStage === "factual_review"
          ? "pauta_dossier_factual_review_created"
          : "pauta_dossier_editorial_review_created";

  await logComunAdminAction({
    session,
    action: auditAction,
    targetType: "pauta_dossier_review",
    targetId: data.id,
    metadata: {
      dossier_id: dossierId,
      review_stage: reviewStage,
      decision,
      reviewer_name: reviewerName,
      reviewer_user_id: profile.id,
      checklist_count: checklistValues.length,
    },
  });
  await logComunAdminAction({
    session,
    action: "reviewer_identity_bound",
    targetType: "pauta_dossier_review",
    targetId: data.id,
    metadata: {
      dossier_id: dossierId,
      reviewer_user_id: profile.id,
      review_stage: reviewStage,
    },
  });
  const updatedDossier = await getAdminPautaDossier(dossierId);
  if (updatedDossier) {
    if (decision === "changes_requested") {
      const notificationId = await createAdminNotification({
        kind: "dossier_changes_requested",
        targetId: dossierId,
        title: "Ajustes solicitados no dossie",
        body: safeDossierNotificationBody({
          priority: updatedDossier.review_priority,
          dueAt: updatedDossier.review_due_at,
          pendingStage: "Ajustes solicitados",
        }),
        priority: updatedDossier.review_priority,
        assignedTo:
          updatedDossier.editorial_reviewer_assigned ||
          updatedDossier.factual_reviewer_assigned,
        assignedToUserId:
          updatedDossier.editorial_reviewer_assigned_user_id ||
          updatedDossier.factual_reviewer_assigned_user_id,
      });
      await logNotificationCreated(
        session,
        notificationId,
        dossierId,
        "dossier_changes_requested",
      );
    }
    if (
      updatedDossier.review_state.factualApproved &&
      updatedDossier.review_state.editorialApproved &&
      !updatedDossier.review_state.reviewersDistinct
    ) {
      const notificationId = await createAdminNotification({
        kind: "dossier_blocked_same_reviewer",
        targetId: dossierId,
        title: "Dossie bloqueado por mesmo revisor",
        body: safeDossierNotificationBody({
          priority: updatedDossier.review_priority,
          dueAt: updatedDossier.review_due_at,
          pendingStage: "Revisor distinto necessario",
        }),
        priority: "high",
        assignedTo:
          updatedDossier.editorial_reviewer_assigned ||
          updatedDossier.factual_reviewer_assigned,
        assignedToUserId:
          updatedDossier.editorial_reviewer_assigned_user_id ||
          updatedDossier.factual_reviewer_assigned_user_id,
      });
      await logNotificationCreated(
        session,
        notificationId,
        dossierId,
        "dossier_blocked_same_reviewer",
      );
    }
    if (
      updatedDossier.review_state.canPublish &&
      updatedDossier.review_status === "approved" &&
      updatedDossier.public_title &&
      updatedDossier.public_summary &&
      updatedDossier.public_body &&
      updatedDossier.public_slug
    ) {
      const notificationId = await createAdminNotification({
        kind: "dossier_ready_to_publish",
        targetId: dossierId,
        title: "Dossie pronto para publicacao",
        body: safeDossierNotificationBody({
          priority: updatedDossier.review_priority,
          dueAt: updatedDossier.review_due_at,
          pendingStage: "Pronto para publicar",
        }),
        priority: updatedDossier.review_priority,
        assignedTo:
          updatedDossier.editorial_reviewer_assigned ||
          updatedDossier.factual_reviewer_assigned,
        assignedToUserId:
          updatedDossier.editorial_reviewer_assigned_user_id ||
          updatedDossier.factual_reviewer_assigned_user_id,
      });
      await logNotificationCreated(
        session,
        notificationId,
        dossierId,
        "dossier_ready_to_publish",
      );
    }
  }
  revalidatePath(`/comun/admin/dossies/${dossierId}`);
  redirect(`/comun/admin/dossies/${dossierId}`);
}

export async function removePautaDossierEvidenceAction(formData: FormData) {
  const session = await requireComunAdmin();
  const dossierId = String(formData.get("dossier_id") ?? "");
  const evidenceId = String(formData.get("evidence_id") ?? "");
  if (!dossierId || !evidenceId)
    throw new Error("Vinculo de evidencia invalido.");
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const { error } = await supabase
    .from("comun_pauta_dossier_evidence")
    .delete()
    .eq("dossier_id", dossierId)
    .eq("evidence_id", evidenceId);
  if (error) throw new Error(error.message);
  await logComunAdminAction({
    session,
    action: "pauta_dossier_evidence_removed",
    targetType: "pauta_dossier",
    targetId: dossierId,
    metadata: { evidence_id: evidenceId },
  });
  revalidatePath(`/comun/admin/dossies/${dossierId}`);
  redirect(`/comun/admin/dossies/${dossierId}`);
}

export async function upsertPublicDossierFeatureAction(formData: FormData) {
  const session = await requireComunAdmin();
  const profile = session.profile;
  if (!profile?.active || !canManagePublicDossierFeatures(profile.role)) {
    await logComunAdminAction({
      session,
      action: "public_dossier_feature_permission_denied",
      targetType: "public_dossier_feature",
      targetId: null,
      metadata: { role: profile?.role ?? null },
    });
    throw new Error(
      "Destaque publico exige perfil admin, editor ou publisher.",
    );
  }
  const dossierId = String(formData.get("dossier_id") ?? "");
  const snapshotId = String(formData.get("snapshot_id") ?? "");
  if (!dossierId || !snapshotId)
    throw new Error("Destaque sem dossie ou snapshot.");
  const publicLabel =
    String(formData.get("public_label") ?? "")
      .trim()
      .slice(0, 80) || null;
  const publicNote =
    String(formData.get("public_note") ?? "")
      .trim()
      .slice(0, 280) || null;
  const priority = Number.parseInt(
    String(formData.get("priority") ?? "100"),
    10,
  );
  const active = formData.get("active") === "on";
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const { data: snapshot, error: snapshotError } = await supabase
    .from("comun_pauta_dossier_publication_snapshots")
    .select("id, dossier_id, public_slug, snapshot_status, unpublished_at")
    .eq("id", snapshotId)
    .eq("dossier_id", dossierId)
    .maybeSingle();
  if (snapshotError || !snapshot)
    throw new Error("Snapshot nao encontrado para este dossie.");
  const { data: existing } = await supabase
    .from("comun_public_dossier_features")
    .select("id")
    .eq("snapshot_id", snapshotId)
    .eq("slot", "featured")
    .limit(1)
    .maybeSingle();
  const payload = {
    snapshot_id: snapshotId,
    slot: "featured",
    public_label: publicLabel,
    public_note: publicNote,
    priority: Number.isFinite(priority) ? priority : 100,
    active,
    updated_at: new Date().toISOString(),
  };
  const result = existing?.id
    ? await supabase
        .from("comun_public_dossier_features")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .single()
    : await supabase
        .from("comun_public_dossier_features")
        .insert(payload)
        .select("id")
        .single();
  if (result.error) throw new Error(result.error.message);
  await logComunAdminAction({
    session,
    action: active
      ? "public_dossier_feature_updated"
      : "public_dossier_feature_disabled",
    targetType: "public_dossier_feature",
    targetId: result.data.id,
    metadata: {
      dossier_id: dossierId,
      snapshot_id: snapshotId,
      active,
      priority: payload.priority,
      snapshot_status: snapshot.snapshot_status,
    },
  });
  revalidatePath("/comun");
  revalidatePath("/comun/dossies");
  revalidatePath(`/comun/admin/dossies/${dossierId}`);
  if (snapshot.public_slug)
    revalidatePath(`/comun/dossies/${snapshot.public_slug}`);
  redirect(`/comun/admin/dossies/${dossierId}`);
}

async function ensureOfficialProtocolForReport(
  report: Awaited<ReturnType<typeof getOfficialProtocolReportSurface>>,
) {
  if (!report) throw new Error("Protocolo COMUN nao encontrado.");
  return createOrUpdateOfficialProtocolDraftForReport(report);
}

async function assertPublicOfficialProtocolAccess(comunProtocol: string) {
  if (!isValidProtocol(comunProtocol))
    throw new Error("Protocolo COMUN invalido.");
  const rateLimit = await checkProtocolLookupRateLimit({
    protocol: comunProtocol,
    route: "/comun/acompanhar/[protocol]/ouvidoria",
  });
  if (!rateLimit.allowed)
    throw new Error(
      "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
    );
}

function parseOptionalDate(value: string) {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeSatisfaction(value: string) {
  if (["satisfactory", "unsatisfactory", "partial", "unknown"].includes(value))
    return value;
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
  const valid = [
    "relato",
    "evidencia",
    "proposta",
    "duvida",
    "contraponto",
    "encaminhamento",
    "tarefa_oferecida",
  ];
  return valid.includes(value) ? value : "relato";
}

function normalizeContributionStatus(value: string) {
  const valid = ["pending", "approved", "rejected", "archived"];
  return valid.includes(value) ? value : "pending";
}

function normalizePautaStatus(value: string) {
  const valid = [
    "observing",
    "organizing",
    "drafting",
    "pressuring",
    "resolved",
    "unresolved",
    "archived",
  ];
  return valid.includes(value) ? value : "observing";
}

function normalizeTaskStatus(value: string) {
  const valid = [
    "open",
    "assigned",
    "in_progress",
    "done",
    "blocked",
    "cancelled",
    "archived",
  ];
  return valid.includes(value) ? value : "open";
}

function normalizeEvidenceSourceType(value: string) {
  const valid = [
    "contribution",
    "report",
    "official_protocol",
    "manual",
    "external_reference",
  ];
  return valid.includes(value) ? value : "manual";
}

function normalizeEvidenceType(value: string) {
  const valid = [
    "relato",
    "foto_segura",
    "protocolo",
    "resposta_oficial",
    "dado_agregado",
    "documento",
    "testemunho",
    "outro",
  ];
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

function normalizeDossierStatus(value: string) {
  const valid = ["draft", "in_review", "ready", "archived"];
  return valid.includes(value) ? value : "draft";
}

function normalizeDossierReviewStage(value: string) {
  return value === "editorial_review" ? "editorial_review" : "factual_review";
}

function normalizeDossierReviewDecision(value: string) {
  const valid = ["approved", "changes_requested", "rejected"];
  return valid.includes(value) ? value : "approved";
}

function normalizeReviewPriority(value: string): PautaDossierReviewPriority {
  const valid = ["low", "normal", "high", "urgent"];
  return valid.includes(value)
    ? (value as PautaDossierReviewPriority)
    : "normal";
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function isBeforeToday(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < startOfToday().getTime();
}

function isToday(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = startOfToday();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return target.getTime() === today.getTime();
}

async function logNotificationCreated(
  session: Awaited<ReturnType<typeof requireComunAdmin>>,
  notificationId: string | null,
  dossierId: string,
  kind: string,
) {
  if (!notificationId) return;
  await logComunAdminAction({
    session,
    action: "admin_notification_created",
    targetType: "admin_notification",
    targetId: notificationId,
    metadata: { dossier_id: dossierId, kind },
  });
}

async function nextPublicDossierSlug(title: string, currentId: string) {
  const supabase = createServiceSupabaseClient();
  const base = slugifyPauta(title || `dossie-${currentId.slice(0, 8)}`);
  if (!supabase) return `${base}-${Date.now()}`;
  const { data } = await supabase
    .from("comun_pauta_dossiers")
    .select("id, public_slug")
    .like("public_slug", `${base}%`);
  const existing = new Set(
    (data ?? [])
      .filter((row) => row.id !== currentId)
      .map((row) => row.public_slug),
  );
  if (!existing.has(base)) return base;
  for (let index = 2; index < 50; index += 1) {
    const candidate = `${base}-${index}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function getMissingFinalPublicationChecklist(
  checklist: Record<string, boolean> | null | undefined,
) {
  const required = [
    "title_reviewed",
    "summary_reviewed",
    "body_reviewed",
    "slug_reviewed",
    "no_raw_text",
    "no_private_contact",
    "no_full_response_text",
    "no_internal_notes",
    "no_signed_url",
    "no_storage_path",
    "evidence_public_safe",
    "distinct_real_reviewers",
    "publisher_confirmed",
  ];
  return required.filter((key) => !checklist?.[key]);
}

function sanitizePublicChangeNote(value: string) {
  return value
    .replace(
      /\b(raw_text|private_contact|internal_notes|response_text|storage_path|signed_url|rollback|auditoria|checklist|revisor|reviewer|publisher)\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function sanitizePublicVersionLabel(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 80) || "Versao revisada";
}
