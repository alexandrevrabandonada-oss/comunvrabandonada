import type { CommunityRole } from "@/lib/community-authorization";

export type CommunityMembershipDecision = "approve" | "reject";
export type CommunityOperationState =
  | "pending"
  | "assigned"
  | "in_review"
  | "blocked"
  | "ready"
  | "published"
  | "resolved"
  | "withdrawn";

export const COMMUNITY_MEMBERSHIP_REVIEW_GATE =
  "community_membership_review" as const;
export const communityRoles: readonly CommunityRole[] = [
  "coordinator",
  "facilitator",
  "curator",
  "community_editor",
  "field_observer",
];

export function resolveCommunitySelfServiceState(input: {
  priorState?: string | null;
  priorJoinedAt?: string | null;
  intent: "follow" | "join" | "save" | "pause" | "resume" | "leave";
}) {
  if (input.priorState === "suspended") return "suspended" as const;
  if (input.intent === "join")
    return input.priorState === "member" ? "member" : "following";
  if (input.intent === "pause") return "paused" as const;
  if (input.intent === "leave") return "left" as const;
  if (input.intent === "resume")
    return input.priorJoinedAt ? ("member" as const) : ("following" as const);
  if (input.priorState === "member") return "member" as const;
  if (input.priorState === "paused") return "paused" as const;
  return "following" as const;
}

export function isOpenCommunityMembershipOperation(state: string) {
  return ["pending", "assigned", "in_review", "blocked", "ready"].includes(
    state,
  );
}

export function validateCommunityMembershipReview(input: {
  operationState: string;
  membershipState: string;
  decision: CommunityMembershipDecision;
}) {
  if (!isOpenCommunityMembershipOperation(input.operationState))
    return { ok: false as const, reason: "operation_closed" };
  if (input.membershipState === "suspended")
    return { ok: false as const, reason: "membership_suspended" };
  if (input.decision === "approve" && input.membershipState === "member")
    return { ok: false as const, reason: "already_member" };
  return { ok: true as const };
}

export function validateCommunityRoleMutation(input: {
  membershipState: string;
  role: string;
}) {
  if (input.membershipState !== "member")
    return { ok: false as const, reason: "membership_not_active" };
  if (!communityRoles.includes(input.role as CommunityRole))
    return { ok: false as const, reason: "invalid_role" };
  return { ok: true as const };
}

export function validateCommunityGroupMember(input: {
  membershipState: string;
  membershipCommunityId: string;
  groupCommunityId: string;
}) {
  if (input.membershipState !== "member")
    return { ok: false as const, reason: "membership_not_active" };
  if (input.membershipCommunityId !== input.groupCommunityId)
    return { ok: false as const, reason: "community_mismatch" };
  return { ok: true as const };
}
