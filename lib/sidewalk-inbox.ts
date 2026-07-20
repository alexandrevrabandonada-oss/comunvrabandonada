import type { SupabaseClient } from "@supabase/supabase-js";

export type SidewalkInboxType =
  | "sidewalk_report_received"
  | "sidewalk_report_verified"
  | "sidewalk_report_published"
  | "sidewalk_circle_opened"
  | "sidewalk_task_assigned"
  | "sidewalk_protocol_sent"
  | "sidewalk_response_received"
  | "sidewalk_result_recorded"
  | "sidewalk_forwarding_prepared"
  | "sidewalk_forwarding_approved"
  | "sidewalk_memory_published";

export async function insertSidewalkInboxEvent(
  db: SupabaseClient,
  input: {
    memberUserId: string;
    pautaId?: string | null;
    type: SidewalkInboxType;
    title: string;
    summary: string;
    actionLabel: string;
    actionUrl: string;
    priority?: string;
    dedupeKey: string;
  }
) {
  const { error } = await db.from("comun_member_inbox" as never).upsert({
    member_user_id: input.memberUserId,
    pauta_id: input.pautaId ?? null,
    notification_type: input.type,
    title: input.title,
    summary: input.summary,
    action_label: input.actionLabel,
    action_url: input.actionUrl,
    priority: input.priority ?? "normal",
    dedupe_key: input.dedupeKey,
  } as never, { onConflict: "member_user_id,dedupe_key" as never });
  if (error) throw error;
}
