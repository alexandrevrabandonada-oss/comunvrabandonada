"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { getCommunitySession } from "@/lib/community-auth";
import { resolveCurrentPublicEvidenceReference } from "@/lib/comun-public-evidence-resolver";
import {
  assessLowFrictionPautaSafety,
  derivePautaCreationRequestKey,
  derivePautaSlug,
  derivePautaTitle,
  isComunPautaLowFrictionCreationEnabled,
  normalizePautaQuestion,
} from "@/lib/comun-pauta-low-friction";
import { getClientFingerprint } from "@/lib/rate-limit";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type CreatePautaState =
  | { state: "idle" }
  | { state: "error"; message: string; field?: "question" }
  | { state: "duplicate"; slug: string }
  | { state: "evidence_changed" };

export const initialCreatePautaState: CreatePautaState = { state: "idle" };

export async function createLowFrictionPautaAction(
  _previous: CreatePautaState,
  formData: FormData,
): Promise<CreatePautaState> {
  if (!isComunPautaLowFrictionCreationEnabled())
    return { state: "error", message: "A criação de pautas não está disponível agora." };

  const question = String(formData.get("question") ?? "").trim().replace(/\s+/g, " ");
  if (question.length < 12 || question.length > 500)
    return { state: "error", field: "question", message: "Escreva uma questão entre 12 e 500 caracteres." };

  const safety = assessLowFrictionPautaSafety({
    question,
    honeypot: String(formData.get("company_website") ?? ""),
  });
  if (!safety.allowed) {
    if (safety.publicReason === "personal_data")
      return {
        state: "error",
        field: "question",
        message: "Pautas são públicas. Retire dados pessoais ou use Vi um problema para registrar uma situação concreta com privacidade.",
      };
    if (safety.publicReason === "high_risk")
      return {
        state: "error",
        field: "question",
        message: "Este conteúdo não pode virar uma pauta pública imediata. Seu texto continua somente neste aparelho; use Vi um problema para um registro com privacidade.",
      };
    return { state: "error", message: "Não foi possível validar este envio." };
  }

  const session = await getCommunitySession();
  if (!session?.user)
    return { state: "error", message: "Entre na sua conta para confirmar a criação. Seu texto permanece neste aparelho." };
  if (["suspended", "deactivation_requested", "deactivated", "archived"].includes(session.profile?.status))
    return { state: "error", message: "Esta conta não está disponível para criar uma pauta." };

  const evidenceRef = String(formData.get("evidence_ref") ?? "").trim();
  const keepEvidence = formData.get("keep_evidence") === "on";
  const allowWithoutEvidence = formData.get("allow_without_evidence") === "1";
  let citation = null;
  if (evidenceRef && keepEvidence) {
    citation = await resolveCurrentPublicEvidenceReference(evidenceRef);
    if (!citation && !allowWithoutEvidence) return { state: "evidence_changed" };
  }

  const normalizedQuestion = normalizePautaQuestion(question);
  const title = derivePautaTitle(question);
  const service = createServiceSupabaseClient();
  if (!service) return { state: "error", message: "Não foi possível criar a pauta agora." };
  const fingerprint = await getClientFingerprint();
  const fingerprintHash = fingerprint.ip_hash || fingerprint.user_agent_hash
    ? createHash("sha256").update(`${fingerprint.ip_hash ?? ""}:${fingerprint.user_agent_hash ?? ""}`).digest("hex")
    : null;
  const requestKey = derivePautaCreationRequestKey({
    userId: session.user.id,
    normalizedQuestion,
    secret: process.env.COMUN_LOOKUP_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "comun-pauta-local",
  });

  const { data, error } = await (service as any).rpc("comun_create_pauta_low_friction_v1", {
    p_actor_user_id: session.user.id,
    p_question: question,
    p_normalized_question: normalizedQuestion,
    p_title: title,
    p_slug_base: derivePautaSlug(title),
    p_request_key: requestKey,
    p_fingerprint_hash: fingerprintHash,
    p_allow_duplicate: formData.get("allow_duplicate") === "1",
    p_public_evidence: citation,
  });
  if (error || !Array.isArray(data) || !data[0])
    return { state: "error", message: "Não foi possível criar a pauta agora. Tente novamente." };
  const result = data[0] as { result: string; pauta_slug: string | null };
  if (result.result === "duplicate_candidate" && result.pauta_slug)
    return { state: "duplicate", slug: result.pauta_slug };
  if (result.result === "rate_limited")
    return { state: "error", message: "Você criou várias pautas recentemente. Aguarde um pouco antes de tentar novamente." };
  if (result.result !== "created" || !result.pauta_slug)
    return { state: "error", message: "Não foi possível criar a pauta agora." };

  revalidatePath("/comun/pautas");
  revalidatePath("/comun/minha-participacao");
  redirect(`/comun/pautas/${result.pauta_slug}?pauta=criada${citation ? "&evidencia=adicionada" : ""}`);
}
