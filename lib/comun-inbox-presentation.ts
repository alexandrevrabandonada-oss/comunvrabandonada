export type ComunInboxGroup =
  "action" | "update" | "decision" | "result" | "invite" | "closed";

const ACTION_TYPES = new Set([
  "action_required",
  "information_requested",
  "task_assigned",
  "task_due",
  "campaign_assignment",
  "consent_action_required",
  "rights_action_required",
  "community_task_assigned",
  "archive_comment_needs_information",
]);
const DECISION_TYPES = new Set([
  "synthesis_published",
  "official_response",
  "community_membership_approved",
  "community_pauta_stage_changed",
  "archive_comment_approved",
  "archive_comment_rejected",
]);
const RESULT_TYPES = new Set([
  "result_registered",
  "community_result_published",
  "community_correction_completed",
  "community_withdrawal_completed",
]);
const INVITE_TYPES = new Set([
  "round_opened",
  "community_circle_opened",
  "community_activity_upcoming",
  "community_followed",
]);

export const COMUN_INBOX_GROUP_LABELS: Record<ComunInboxGroup, string> = {
  action: "Precisa da sua ação",
  update: "Atualização importante",
  decision: "Decisão",
  result: "Resultado",
  invite: "Convite",
  closed: "Encerrado",
};

export function resolveComunInboxGroup(item: {
  notification_type?: string | null;
  resolved_at?: string | null;
}): ComunInboxGroup {
  if (item.resolved_at) return "closed";
  const type = item.notification_type ?? "";
  if (ACTION_TYPES.has(type)) return "action";
  if (DECISION_TYPES.has(type)) return "decision";
  if (RESULT_TYPES.has(type)) return "result";
  if (INVITE_TYPES.has(type)) return "invite";
  return "update";
}

export function groupComunInbox<
  T extends { notification_type?: string | null; resolved_at?: string | null },
>(rows: T[]) {
  const order: ComunInboxGroup[] = [
    "action",
    "update",
    "decision",
    "result",
    "invite",
    "closed",
  ];
  return order
    .map((group) => ({
      group,
      label: COMUN_INBOX_GROUP_LABELS[group],
      rows: rows.filter((row) => resolveComunInboxGroup(row) === group),
    }))
    .filter((section) => section.rows.length);
}
