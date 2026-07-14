import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { ComunAdminNotification, ComunAdminNotificationKind, ComunAdminNotificationStatus, PautaDossierReviewPriority } from "@/lib/types";

export type AdminNotificationSummary = {
  unread: number;
  overdue: number;
  urgent: number;
  highPriority: number;
  readyToPublish: number;
  archived: number;
};

export type AdminNotificationFilters = {
  status?: string;
  kind?: string;
  assignedTo?: string;
  assignedToUserId?: string;
};

export type AdminNotificationInput = {
  kind: ComunAdminNotificationKind;
  targetType?: string;
  targetId: string;
  title: string;
  body?: string | null;
  priority?: PautaDossierReviewPriority;
  assignedTo?: string | null;
  assignedToUserId?: string | null;
};

export async function createAdminNotification(input: AdminNotificationInput) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;
  const payload = {
    kind: input.kind,
    target_type: input.targetType ?? "pauta_dossier",
    target_id: input.targetId,
    title: sanitizeNotificationText(input.title, 120) || "Notificacao interna",
    body: sanitizeNotificationText(input.body ?? "", 240) || null,
    priority: input.priority ?? "normal",
    assigned_to: sanitizeNotificationText(input.assignedTo ?? "", 120) || null,
    assigned_to_user_id: input.assignedToUserId || null,
    status: "unread",
  };
  const { data, error } = await supabase.from("comun_admin_notifications").insert(payload).select("id").single();
  if (error) return null;
  return data.id as string;
}

export async function listAdminNotifications(filters: AdminNotificationFilters = {}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as ComunAdminNotification[];
  let query = supabase
    .from("comun_admin_notifications")
    .select("id, kind, target_type, target_id, title, body, priority, assigned_to, assigned_to_user_id, status, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(250);

  const status = normalizeNotificationStatus(filters.status);
  if (status) query = query.eq("status", status);
  const kind = normalizeNotificationKind(filters.kind);
  if (kind) query = query.eq("kind", kind);
  const assignedTo = sanitizeNotificationText(filters.assignedTo ?? "", 120);
  if (assignedTo) query = query.ilike("assigned_to", `%${assignedTo}%`);
  if (filters.assignedToUserId) query = query.eq("assigned_to_user_id", filters.assignedToUserId);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as ComunAdminNotification[];
}

export async function getAdminNotificationSummary() {
  const notifications = await listAdminNotifications();
  return summarizeAdminNotifications(notifications);
}

export function summarizeAdminNotifications(notifications: ComunAdminNotification[]): AdminNotificationSummary {
  return {
    unread: notifications.filter((item) => item.status === "unread").length,
    overdue: notifications.filter((item) => item.status !== "archived" && item.kind === "dossier_overdue").length,
    urgent: notifications.filter((item) => item.status !== "archived" && item.priority === "urgent").length,
    highPriority: notifications.filter((item) => item.status !== "archived" && ["high", "urgent"].includes(item.priority)).length,
    readyToPublish: notifications.filter((item) => item.status !== "archived" && item.kind === "dossier_ready_to_publish").length,
    archived: notifications.filter((item) => item.status === "archived").length,
  };
}

export async function updateAdminNotificationStatus(id: string, status: "read" | "archived") {
  const supabase = createServiceSupabaseClient();
  if (!supabase) throw new Error("Supabase service role nao configurado no servidor.");
  const payload = {
    status,
    read_at: status === "read" ? new Date().toISOString() : null,
  };
  const { error } = await supabase.from("comun_admin_notifications").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export function safeDossierNotificationBody(input: { priority?: string | null; dueAt?: string | null; pendingStage?: string | null }) {
  const parts = [];
  if (input.priority) parts.push(`Prioridade: ${input.priority}.`);
  if (input.dueAt) parts.push(`Prazo: ${new Date(input.dueAt).toLocaleDateString("pt-BR")}.`);
  if (input.pendingStage) parts.push(`Etapa: ${input.pendingStage}.`);
  return parts.join(" ");
}

function sanitizeNotificationText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeNotificationStatus(value?: string): ComunAdminNotificationStatus | "" {
  const valid = ["unread", "read", "archived"];
  return valid.includes(value ?? "") ? (value as ComunAdminNotificationStatus) : "";
}

function normalizeNotificationKind(value?: string): ComunAdminNotificationKind | "" {
  const valid = [
    "dossier_factual_assigned",
    "dossier_editorial_assigned",
    "dossier_due_today",
    "dossier_overdue",
    "dossier_changes_requested",
    "dossier_ready_to_publish",
    "dossier_blocked_same_reviewer",
    "dossier_due_date_changed",
    "dossier_priority_high",
  ];
  return valid.includes(value ?? "") ? (value as ComunAdminNotificationKind) : "";
}
