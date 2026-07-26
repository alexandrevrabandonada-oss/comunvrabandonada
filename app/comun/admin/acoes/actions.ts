"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import {
  canTransitionCollectiveAction,
  collectiveForwardingStates,
  collectiveTimelineEvents,
  isSafePublicUrl,
  sanitizeCollectivePublicText,
  type CollectiveTimelineEventKey,
} from "@/lib/collective-actions-admin";
import {
  collectiveActionStatuses,
  collectiveActionTypes,
} from "@/lib/collective-actions";
import { requireCollectiveActionsRelease } from "@/lib/collective-actions-release";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const updateTypes = new Set([
  "announcement",
  "progress",
  "meeting",
  "protocol",
  "response",
  "result",
  "memory",
  "task",
  "forwarding",
]);
const resultStatuses = new Set(["achieved", "partial", "not_achieved"]);

function text(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function optional(form: FormData, name: string) {
  return text(form, name) || null;
}

function publicText(form: FormData, name: string, maxLength = 2_000) {
  return sanitizeCollectivePublicText(text(form, name), maxLength);
}

function safeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function dateTime(form: FormData, name: string) {
  const raw = optional(form, name);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error("Data inválida.");
  return date.toISOString();
}

function db() {
  return createServiceSupabaseClient() as any;
}

function eventIdempotencyKey(
  actionId: string,
  eventKey: CollectiveTimelineEventKey,
  source?: string,
) {
  const stableSource = source ?? eventKey;
  return createHash("sha256")
    .update(`${actionId}\n${eventKey}\n${stableSource}`)
    .digest("hex")
    .slice(0, 48);
}

function manualUpdateIdempotencyKey(
  actionId: string,
  updateType: string,
  title: string,
  summary: string,
  occurredAt: string,
) {
  return createHash("sha256")
    .update(`${actionId}\n${updateType}\n${title}\n${summary}\n${occurredAt}`)
    .digest("hex")
    .slice(0, 48);
}

async function requireAction(client: any, actionId: string) {
  if (!actionId) throw new Error("Ação coletiva inválida.");
  const { data, error } = await client
    .from("comun_collective_actions")
    .select("id,slug,title,status,visibility,action_type,result_summary")
    .eq("id", actionId)
    .maybeSingle();
  if (error || !data) throw new Error("Ação coletiva não encontrada.");
  return data as any;
}

function invalidate(action?: { slug?: string | null }) {
  revalidatePath("/comun/admin/acoes");
  revalidatePath("/comun/acoes");
  revalidatePath("/comun/minha-participacao");
  if (action?.slug) revalidatePath(`/comun/acoes/${action.slug}`);
}

async function upsertTimelineEvent(
  client: any,
  actionId: string,
  eventKey: CollectiveTimelineEventKey,
  publicSummary: string,
  adminId: string,
  occurredAt = new Date().toISOString(),
  source?: string,
) {
  const definition = collectiveTimelineEvents[eventKey];
  const summary = sanitizeCollectivePublicText(publicSummary);
  if (summary.length < 3) throw new Error("Escreva um resumo público revisado.");
  const { error } = await client.from("comun_collective_action_updates").upsert(
    {
      action_id: actionId,
      update_type: definition.updateType,
      event_key: eventKey,
      idempotency_key: eventIdempotencyKey(actionId, eventKey, source),
      title: definition.title,
      public_summary: summary,
      occurred_at: occurredAt,
      visibility: "public",
      created_by_admin_id: adminId,
    },
    { onConflict: "action_id,idempotency_key" },
  );
  if (error) throw new Error("Não foi possível registrar o evento público.");
}

async function requireAdminRelease() {
  await requireCollectiveActionsRelease();
  return requireComunAdmin({ roles: ["admin", "editor"] });
}

export async function createCollectiveAction(form: FormData) {
  const session = await requireAdminRelease();
  const title = publicText(form, "title", 160);
  const slug = safeSlug(text(form, "slug") || title);
  const actionType = text(form, "action_type");
  const status = text(form, "status") || "draft";
  const summary = publicText(form, "summary", 600);
  const objective = publicText(form, "objective", 1_200);
  if (
    !slug ||
    title.length < 3 ||
    summary.length < 10 ||
    objective.length < 10 ||
    !collectiveActionTypes.includes(actionType as any) ||
    !collectiveActionStatuses.includes(status as any)
  )
    throw new Error("Preencha os dados obrigatórios da ação coletiva.");
  const client = db();
  if (!client) throw new Error("A administração está indisponível agora.");
  const visibility = text(form, "visibility") || "internal";
  const { error } = await client.from("comun_collective_actions").insert({
    slug,
    title,
    summary,
    objective,
    action_type: actionType,
    status,
    visibility,
    territory_label: publicText(form, "territory_label", 180) || null,
    meeting_place: publicText(form, "meeting_place", 180) || null,
    starts_at: dateTime(form, "starts_at"),
    ends_at: dateTime(form, "ends_at"),
    participation_mode: text(form, "participation_mode") || "hybrid",
    pauta_id: optional(form, "pauta_id"),
    community_id: optional(form, "community_id"),
    created_by_admin_id: session.admin.id,
  });
  if (error) throw new Error("Não foi possível criar a ação coletiva.");
  invalidate();
}

export async function updateCollectiveAction(form: FormData) {
  await requireAdminRelease();
  const client = db();
  if (!client) throw new Error("A administração está indisponível agora.");
  const action = await requireAction(client, text(form, "action_id"));
  const title = publicText(form, "title", 160);
  const actionType = text(form, "action_type");
  if (!title || !collectiveActionTypes.includes(actionType as any))
    throw new Error("Dados da ação coletiva inválidos.");
  const { error } = await client
    .from("comun_collective_actions")
    .update({
      title,
      summary: publicText(form, "summary", 600),
      objective: publicText(form, "objective", 1_200),
      action_type: actionType,
      territory_label: publicText(form, "territory_label", 180) || null,
      meeting_place: publicText(form, "meeting_place", 180) || null,
      starts_at: dateTime(form, "starts_at"),
      ends_at: dateTime(form, "ends_at"),
      participation_mode: text(form, "participation_mode") || "hybrid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", action.id);
  if (error) throw new Error("Não foi possível editar a ação coletiva.");
  invalidate(action);
}

export async function publishCollectiveAction(form: FormData) {
  const session = await requireAdminRelease();
  const client = db();
  if (!client) throw new Error("A administração está indisponível agora.");
  const action = await requireAction(client, text(form, "action_id"));
  if (!canTransitionCollectiveAction(action.status, "open"))
    throw new Error("Esta ação não pode ser publicada neste estado.");
  const now = new Date().toISOString();
  const { error } = await client
    .from("comun_collective_actions")
    .update({
      status: "open",
      visibility: "public",
      published_at: now,
      updated_at: now,
      created_by_admin_id: session.admin.id,
    })
    .eq("id", action.id);
  if (error) throw new Error("Não foi possível publicar a ação coletiva.");
  await upsertTimelineEvent(
    client,
    action.id,
    "action_published",
    "A ação foi revisada e aberta para participação coletiva.",
    session.admin.id,
    now,
  );
  invalidate(action);
}

export async function moveCollectiveActionToAwaitingResult(form: FormData) {
  const session = await requireAdminRelease();
  const client = db();
  if (!client) throw new Error("A administração está indisponível agora.");
  const action = await requireAction(client, text(form, "action_id"));
  if (!canTransitionCollectiveAction(action.status, "awaiting_result"))
    throw new Error("A ação precisa estar aberta ou em andamento antes do resultado.");
  const now = new Date().toISOString();
  const { error } = await client
    .from("comun_collective_actions")
    .update({ status: "awaiting_result", updated_at: now })
    .eq("id", action.id);
  if (error) throw new Error("Não foi possível atualizar o estado da ação.");
  await upsertTimelineEvent(
    client,
    action.id,
    "activity_realized",
    publicText(form, "public_summary") || "A atividade coletiva foi realizada e entrou na etapa de resultado.",
    session.admin.id,
    now,
  );
  invalidate(action);
}

export async function startCollectiveAction(form: FormData) {
  const session = await requireAdminRelease();
  const client = db();
  if (!client) throw new Error("A administração está indisponível agora.");
  const action = await requireAction(client, text(form, "action_id"));
  if (!canTransitionCollectiveAction(action.status, "active"))
    throw new Error("Esta ação não pode entrar em andamento neste estado.");
  const now = new Date().toISOString();
  const { error } = await client
    .from("comun_collective_actions")
    .update({ status: "active", updated_at: now })
    .eq("id", action.id);
  if (error) throw new Error("Não foi possível iniciar a ação.");
  await upsertTimelineEvent(
    client,
    action.id,
    "activity_realized",
    publicText(form, "public_summary") || "A ação coletiva entrou em andamento no território.",
    session.admin.id,
    now,
    "action-started",
  );
  invalidate(action);
}

export async function createCollectiveActionTask(form: FormData) {
  const session = await requireAdminRelease();
  const actionId = text(form, "action_id");
  const desiredCount = Number(text(form, "desired_count") || "1");
  if (!Number.isInteger(desiredCount) || desiredCount < 1 || desiredCount > 1_000)
    throw new Error("Dados da tarefa inválidos.");
  const client = db();
  if (!client) throw new Error("A administração está indisponível agora.");
  const action = await requireAction(client, actionId);
  const title = publicText(form, "title", 160);
  const description = publicText(form, "description", 1_000);
  if (title.length < 3 || description.length < 3)
    throw new Error("Descreva a tarefa de forma clara.");
  const { data, error } = await client
    .from("comun_collective_action_tasks")
    .insert({
      action_id: action.id,
      title,
      description,
      desired_count: desiredCount,
      due_at: dateTime(form, "due_at"),
      state: text(form, "state") || "open",
      effort_level: text(form, "effort_level") || "small",
      participation_mode: text(form, "participation_mode") || "hybrid",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("Não foi possível criar a tarefa.");
  await upsertTimelineEvent(
    client,
    action.id,
    "task_opened",
    `A tarefa “${title}” está disponível para colaboração.`,
    session.admin.id,
    data.id,
  );
  invalidate(action);
}

export async function updateCollectiveActionTask(form: FormData) {
  await requireAdminRelease();
  const client = db();
  if (!client) throw new Error("A administração está indisponível agora.");
  const action = await requireAction(client, text(form, "action_id"));
  const taskId = text(form, "task_id");
  const desiredCount = Number(text(form, "desired_count") || "1");
  if (!taskId || !Number.isInteger(desiredCount) || desiredCount < 1)
    throw new Error("Tarefa inválida.");
  const { error } = await client
    .from("comun_collective_action_tasks")
    .update({
      title: publicText(form, "title", 160),
      description: publicText(form, "description", 1_000),
      desired_count: desiredCount,
      due_at: dateTime(form, "due_at"),
      state: text(form, "state") || "open",
      effort_level: text(form, "effort_level") || "small",
      participation_mode: text(form, "participation_mode") || "hybrid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("action_id", action.id);
  if (error) throw new Error("Não foi possível editar a tarefa.");
  invalidate(action);
}

export async function publishCollectiveActionUpdate(form: FormData) {
  const session = await requireAdminRelease();
  const client = db();
  if (!client) throw new Error("A administração está indisponível agora.");
  const action = await requireAction(client, text(form, "action_id"));
  const updateType = text(form, "update_type");
  const title = publicText(form, "title", 180);
  const summary = publicText(form, "public_summary");
  const occurredAt = dateTime(form, "occurred_at") ?? new Date().toISOString();
  if (!updateTypes.has(updateType) || title.length < 3 || summary.length < 3)
    throw new Error("Atualização inválida.");
  const { error } = await client.from("comun_collective_action_updates").upsert(
    {
      action_id: action.id,
      update_type: updateType,
      title,
      public_summary: summary,
      occurred_at: occurredAt,
      visibility: "public",
      idempotency_key: manualUpdateIdempotencyKey(
        action.id,
        updateType,
        title,
        summary,
        occurredAt,
      ),
      created_by_admin_id: session.admin.id,
    },
    { onConflict: "action_id,idempotency_key" },
  );
  if (error) throw new Error("Não foi possível publicar a atualização.");
  invalidate(action);
}

export async function saveCollectiveActionForwarding(form: FormData) {
  const session = await requireAdminRelease();
  const client = db();
  if (!client) throw new Error("A administração está indisponível agora.");
  const action = await requireAction(client, text(form, "action_id"));
  if (action.action_type !== "collective_forwarding")
    throw new Error("Encaminhamentos exigem uma ação do tipo encaminhamento coletivo.");
  const state = text(form, "state") || "preparing";
  const recipientName = publicText(form, "recipient_name", 180) || null;
  const summary = publicText(form, "public_summary") || null;
  const protocolCode = publicText(form, "protocol_code", 120) || null;
  const response = publicText(form, "response_public") || null;
  const documentUrl = optional(form, "public_document_url");
  const documentLabel = publicText(form, "public_document_label", 180) || null;
  const publicVisible = text(form, "public_visible") === "on";
  if (!collectiveForwardingStates.includes(state as any))
    throw new Error("Estado do encaminhamento inválido.");
  if ((state === "sent" || state === "protocol_registered") && (!recipientName || !summary))
    throw new Error("Revise órgão destinatário e resumo público antes de registrar o envio.");
  if (state === "protocol_registered" && !protocolCode)
    throw new Error("Registre o número ou código público do protocolo.");
  if (["response_received", "verified_in_territory", "closed"].includes(state) && !response)
    throw new Error("Registre uma resposta pública revisada antes de avançar.");
  if (!isSafePublicUrl(documentUrl) || Boolean(documentUrl) !== Boolean(documentLabel))
    throw new Error("O documento público precisa de título e URL HTTPS revisada.");
  const now = new Date().toISOString();
  const { error } = await client.from("comun_collective_action_forwardings").upsert(
    {
      action_id: action.id,
      recipient_name: recipientName,
      public_summary: summary,
      sent_at: dateTime(form, "sent_at"),
      protocol_code: protocolCode,
      expected_response_at: dateTime(form, "expected_response_at"),
      state,
      response_public: response,
      public_document_url: documentUrl,
      public_document_label: documentLabel,
      public_visible: publicVisible,
      created_by_admin_id: session.admin.id,
      updated_at: now,
    },
    { onConflict: "action_id" },
  );
  if (error) throw new Error("Não foi possível registrar o encaminhamento.");
  const eventByState: Partial<Record<string, CollectiveTimelineEventKey>> = {
    sent: "forwarding_sent",
    protocol_registered: "protocol_registered",
    response_received: "response_received",
    verified_in_territory: "result_verified",
  };
  const eventKey = eventByState[state];
  if (eventKey)
    await upsertTimelineEvent(
      client,
      action.id,
      eventKey,
      response ?? summary ?? "O encaminhamento coletivo recebeu uma atualização revisada.",
      session.admin.id,
      now,
    );
  invalidate(action);
}

export async function recordCollectiveActionResult(form: FormData) {
  const session = await requireAdminRelease();
  const client = db();
  if (!client) throw new Error("A administração está indisponível agora.");
  const action = await requireAction(client, text(form, "action_id"));
  const resultStatus = text(form, "result_status");
  const resultSummary = publicText(form, "result_summary");
  if (action.status !== "awaiting_result" || !resultStatuses.has(resultStatus) || resultSummary.length < 3)
    throw new Error("Coloque a ação em aguardando resultado e registre um resultado revisado.");
  const { error } = await client
    .from("comun_collective_actions")
    .update({
      result_status: resultStatus,
      result_summary: resultSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", action.id);
  if (error) throw new Error("Não foi possível registrar o resultado.");
  await upsertTimelineEvent(
    client,
    action.id,
    "result_verified",
    resultSummary,
    session.admin.id,
  );
  invalidate(action);
}

export async function completeCollectiveAction(form: FormData) {
  await requireAdminRelease();
  const client = db();
  if (!client) throw new Error("A administração está indisponível agora.");
  const action = await requireAction(client, text(form, "action_id"));
  if (action.status !== "awaiting_result" || !action.result_summary)
    throw new Error("Registre o resultado antes de concluir a ação.");
  const [{ count: participantCount }, { count: completedTaskCount }] = await Promise.all([
    client
      .from("comun_collective_action_participations")
      .select("id", { count: "exact", head: true })
      .eq("action_id", action.id)
      .neq("status", "withdrew"),
    client
      .from("comun_collective_action_tasks")
      .select("id", { count: "exact", head: true })
      .eq("action_id", action.id)
      .eq("state", "done"),
  ]);
  const now = new Date().toISOString();
  const { error } = await client
    .from("comun_collective_actions")
    .update({
      status: "completed",
      completed_at: now,
      participant_count_aggregate: participantCount ?? 0,
      tasks_completed_aggregate: completedTaskCount ?? 0,
      updated_at: now,
    })
    .eq("id", action.id);
  if (error) throw new Error("Não foi possível concluir a ação coletiva.");
  invalidate(action);
}

export async function publishCollectiveActionMemory(form: FormData) {
  const session = await requireAdminRelease();
  const client = db();
  if (!client) throw new Error("A administração está indisponível agora.");
  const action = await requireAction(client, text(form, "action_id"));
  const memorySummary = publicText(form, "memory_summary");
  const learnedSummary = publicText(form, "learned_summary");
  const nextStepsSummary = publicText(form, "next_steps_summary");
  if (action.status !== "completed" || memorySummary.length < 3 || learnedSummary.length < 3 || nextStepsSummary.length < 3)
    throw new Error("Conclua a ação e registre memória, aprendizados e próximos desdobramentos.");
  const now = new Date().toISOString();
  const { error } = await client
    .from("comun_collective_actions")
    .update({
      memory_summary: memorySummary,
      learned_summary: learnedSummary,
      next_steps_summary: nextStepsSummary,
      memory_published_at: now,
      updated_at: now,
    })
    .eq("id", action.id);
  if (error) throw new Error("Não foi possível guardar a memória da ação.");
  await upsertTimelineEvent(
    client,
    action.id,
    "memory_completed",
    memorySummary,
    session.admin.id,
    now,
  );
  invalidate(action);
}

export async function addCollectiveActionMemoryAsset(form: FormData) {
  const session = await requireAdminRelease();
  const client = db();
  if (!client) throw new Error("A administração está indisponível agora.");
  const action = await requireAction(client, text(form, "action_id"));
  const title = publicText(form, "title", 180);
  const publicUrl = optional(form, "public_url");
  const assetKind = text(form, "asset_kind");
  if (
    action.status !== "completed" ||
    !["document", "photograph"].includes(assetKind) ||
    title.length < 3 ||
    !publicUrl ||
    !isSafePublicUrl(publicUrl)
  )
    throw new Error("A memória aceita apenas documento ou fotografia pública revisada.");
  const now = new Date().toISOString();
  const { error } = await client.from("comun_collective_action_memory_assets").upsert(
    {
      action_id: action.id,
      asset_kind: assetKind,
      title,
      public_url: publicUrl,
      public_visible: text(form, "public_visible") === "on",
      reviewed_at: now,
      created_by_admin_id: session.admin.id,
    },
    { onConflict: "action_id,public_url" },
  );
  if (error) throw new Error("Não foi possível adicionar o material revisado.");
  invalidate(action);
}

export async function linkCollectiveActionSidewalkRecord(form: FormData) {
  await requireAdminRelease();
  const client = db();
  if (!client) throw new Error("A administração está indisponível agora.");
  const action = await requireAction(client, text(form, "action_id"));
  const sidewalkRecordId = text(form, "sidewalk_record_id");
  if (!sidewalkRecordId) throw new Error("Registro relacionado inválido.");
  const { error } = await client
    .from("comun_collective_action_sidewalk_records")
    .upsert(
      { action_id: action.id, sidewalk_record_id: sidewalkRecordId },
      { onConflict: "action_id,sidewalk_record_id" },
    );
  if (error) throw new Error("Não foi possível relacionar o registro de calçada.");
  invalidate(action);
}
