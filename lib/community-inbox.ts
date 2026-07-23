import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { projectInboxContext } from "@/lib/member-inbox-context";
export const inboxTypes = [
  "action_required",
  "contribution_update",
  "information_requested",
  "task_assigned",
  "task_due",
  "round_opened",
  "round_closing",
  "synthesis_published",
  "campaign_assignment",
  "campaign_update",
  "official_response",
  "result_registered",
  "artwork_update",
  "radio_update",
  "consent_action_required",
  "rights_action_required",
  "community_followed",
  "community_membership_requested",
  "community_membership_approved",
  "community_circle_opened",
  "community_task_assigned",
  "community_pauta_stage_changed",
  "community_activity_upcoming",
  "community_result_published",
  "community_correction_completed",
  "community_withdrawal_completed",
  "archive_comment_approved",
  "archive_comment_rejected",
  "archive_comment_reply",
  "archive_comment_needs_information",
  "archive_comment_withdrawn",
] as const;
export async function listMemberInbox(memberUserId: string) {
  const db = createServiceSupabaseClient();
  if (!db) return [];
  const { data } = await db
    .from("comun_member_inbox")
    .select(
      "id,pauta_id,notification_type,title,summary,action_label,action_url,priority,read_at,resolved_at,created_at,pauta:comun_pauta_spaces(title,slug)",
    )
    .eq("member_user_id", memberUserId)
    .is("resolved_at", null)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((item: any) => ({
    ...item,
    context: projectInboxContext(item),
  }));
}
export async function upsertMemberInbox(input: {
  memberUserId: string;
  pautaId?: string | null;
  type: (typeof inboxTypes)[number];
  title: string;
  summary: string;
  actionLabel: string;
  actionUrl: string;
  priority?: "normal" | "attention" | "urgent";
  dedupeKey: string;
  resolved?: boolean;
}) {
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível");
  const { error } = await db.from("comun_member_inbox").upsert(
    {
      member_user_id: input.memberUserId,
      pauta_id: input.pautaId ?? null,
      notification_type: input.type,
      title: input.title.slice(0, 160),
      summary: input.summary.slice(0, 500),
      action_label: input.actionLabel.slice(0, 80),
      action_url: input.actionUrl,
      priority: input.priority ?? "normal",
      dedupe_key: input.dedupeKey,
      resolved_at: input.resolved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "member_user_id,dedupe_key" },
  );
  if (error) throw error;
}
