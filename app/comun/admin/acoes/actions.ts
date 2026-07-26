"use server";

import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { collectiveActionStatuses, collectiveActionTypes } from "@/lib/collective-actions";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { requireCollectiveActionsRelease } from "@/lib/collective-actions-release";

const updateTypes = new Set(["announcement", "progress", "meeting", "protocol", "response", "result", "memory"]);
function text(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
function optional(form: FormData, name: string) { return text(form, name) || null; }
function safeSlug(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); }
function dateTime(form: FormData, name: string) { const raw = optional(form, name); return raw ? new Date(raw).toISOString() : null; }
function db() { return createServiceSupabaseClient() as any; }
function invalidate() { revalidatePath("/comun/admin/acoes"); revalidatePath("/comun/acoes"); }

export async function createCollectiveAction(form: FormData) {
  await requireCollectiveActionsRelease();
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const title = text(form, "title"); const slug = safeSlug(text(form, "slug") || title);
  const actionType = text(form, "action_type"); const status = text(form, "status") || "draft";
  if (!slug || !title || !collectiveActionTypes.includes(actionType as any) || !collectiveActionStatuses.includes(status as any)) throw new Error("Preencha os dados obrigatórios da ação coletiva.");
  const client = db(); if (!client) throw new Error("A administração está indisponível agora.");
  const visibility = text(form, "visibility") || "internal";
  const { error } = await client.from("comun_collective_actions").insert({ slug, title, summary: text(form, "summary"), objective: text(form, "objective"), action_type: actionType, status, visibility, territory_label: optional(form, "territory_label"), meeting_place: optional(form, "meeting_place"), starts_at: dateTime(form, "starts_at"), ends_at: dateTime(form, "ends_at"), participation_mode: text(form, "participation_mode") || "hybrid", pauta_id: optional(form, "pauta_id"), community_id: optional(form, "community_id"), created_by_admin_id: session.admin.id, published_at: visibility === "public" && ["open", "active", "awaiting_result", "completed"].includes(status) ? new Date().toISOString() : null });
  if (error) throw new Error("Não foi possível criar a ação coletiva."); invalidate();
}

export async function publishCollectiveAction(form: FormData) {
  await requireCollectiveActionsRelease();
  const session = await requireComunAdmin({ roles: ["admin", "editor"] }); const id = text(form, "action_id");
  if (!id) throw new Error("Ação coletiva inválida."); const client = db(); if (!client) throw new Error("A administração está indisponível agora.");
  const { error } = await client.from("comun_collective_actions").update({ status: "open", visibility: "public", published_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by_admin_id: session.admin.id }).eq("id", id);
  if (error) throw new Error("Não foi possível publicar a ação coletiva."); invalidate();
}

export async function updateCollectiveAction(form: FormData) {
  await requireCollectiveActionsRelease();
  await requireComunAdmin({ roles: ["admin", "editor"] });
  const id = text(form, "action_id");
  const title = text(form, "title");
  const status = text(form, "status");
  if (!id || !title || !["draft", "preparing", "open", "active", "awaiting_result", "cancelled", "archived"].includes(status)) throw new Error("Dados da ação coletiva inválidos.");
  const client = db(); if (!client) throw new Error("A administração está indisponível agora.");
  const { error } = await client.from("comun_collective_actions").update({ title, summary: text(form, "summary"), objective: text(form, "objective"), status, territory_label: optional(form, "territory_label"), meeting_place: optional(form, "meeting_place"), updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("Não foi possível editar a ação coletiva."); invalidate();
}

export async function createCollectiveActionTask(form: FormData) {
  await requireCollectiveActionsRelease();
  await requireComunAdmin({ roles: ["admin", "editor"] }); const actionId = text(form, "action_id"); const desiredCount = Number(text(form, "desired_count") || "1");
  if (!actionId || !Number.isInteger(desiredCount) || desiredCount < 1 || desiredCount > 1000) throw new Error("Dados da tarefa inválidos.");
  const client = db(); if (!client) throw new Error("A administração está indisponível agora.");
  const { error } = await client.from("comun_collective_action_tasks").insert({ action_id: actionId, title: text(form, "title"), description: text(form, "description"), desired_count: desiredCount, due_at: dateTime(form, "due_at"), state: "open", effort_level: text(form, "effort_level") || "small", participation_mode: text(form, "participation_mode") || "hybrid" });
  if (error) throw new Error("Não foi possível criar a tarefa."); invalidate();
}

export async function publishCollectiveActionUpdate(form: FormData) {
  await requireCollectiveActionsRelease();
  const session = await requireComunAdmin({ roles: ["admin", "editor"] }); const actionId = text(form, "action_id"); const updateType = text(form, "update_type");
  if (!actionId || !updateTypes.has(updateType)) throw new Error("Atualização inválida."); const client = db(); if (!client) throw new Error("A administração está indisponível agora.");
  const { error } = await client.from("comun_collective_action_updates").insert({ action_id: actionId, update_type: updateType, title: text(form, "title"), public_summary: text(form, "public_summary"), occurred_at: dateTime(form, "occurred_at") ?? new Date().toISOString(), visibility: "public", created_by_admin_id: session.admin.id });
  if (error) throw new Error("Não foi possível publicar a atualização."); invalidate();
}

export async function linkCollectiveActionSidewalkRecord(form: FormData) {
  await requireCollectiveActionsRelease();
  await requireComunAdmin({ roles: ["admin", "editor"] }); const actionId = text(form, "action_id"); const sidewalkRecordId = text(form, "sidewalk_record_id");
  if (!actionId || !sidewalkRecordId) throw new Error("Registro relacionado inválido."); const client = db(); if (!client) throw new Error("A administração está indisponível agora.");
  const { error } = await client.from("comun_collective_action_sidewalk_records").upsert({ action_id: actionId, sidewalk_record_id: sidewalkRecordId }, { onConflict: "action_id,sidewalk_record_id" });
  if (error) throw new Error("Não foi possível relacionar o registro de calçada."); invalidate();
}

export async function completeCollectiveAction(form: FormData) {
  await requireCollectiveActionsRelease();
  await requireComunAdmin({ roles: ["admin", "editor"] }); const id = text(form, "action_id"); if (!id) throw new Error("Ação coletiva inválida.");
  const client = db(); if (!client) throw new Error("A administração está indisponível agora."); const now = new Date().toISOString();
  const { error } = await client.from("comun_collective_actions").update({ status: "completed", completed_at: now, result_summary: text(form, "result_summary"), memory_summary: text(form, "memory_summary"), updated_at: now }).eq("id", id);
  if (error) throw new Error("Não foi possível concluir a ação coletiva."); invalidate();
}
