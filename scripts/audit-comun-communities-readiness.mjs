import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { COMMUNITY_MEMBERSHIP_REVIEW_GATE } from "../lib/community-administration.ts";

const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!url || !key) throw new Error("COMMUNITY_AUDIT_ENV_MISSING");
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const artifactDir = resolve(
  process.env.COMUN_ARTIFACT_DIR || ".ci-artifacts/comun-communities-readiness",
);
const openStates = ["pending", "assigned", "in_review", "blocked", "ready"];

const [communities, memberships, roles, groups, requests, selfApprovals] =
  await Promise.all([
    db
      .from("comun_communities")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    db.from("comun_community_memberships").select("state"),
    db
      .from("comun_community_role_assignments")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null),
    db.from("comun_community_work_groups").select("state"),
    db
      .from("comun_editorial_operation_items")
      .select("state")
      .eq("human_gate", COMMUNITY_MEMBERSHIP_REVIEW_GATE)
      .in("state", openStates),
    db
      .from("comun_community_audit_log")
      .select("actor_user_id,member_user_id")
      .eq("event_type", "membership_approved"),
  ]);

for (const result of [
  communities,
  memberships,
  roles,
  groups,
  requests,
  selfApprovals,
]) {
  if (result.error) throw new Error("COMMUNITY_AUDIT_QUERY_FAILED");
}

const membershipCounts = Object.fromEntries(
  ["following", "member", "paused", "left", "suspended"].map((state) => [
    state,
    (memberships.data ?? []).filter((item) => item.state === state).length,
  ]),
);
const groupCounts = Object.fromEntries(
  ["proposed", "active", "paused", "completed", "archived"].map((state) => [
    state,
    (groups.data ?? []).filter((item) => item.state === state).length,
  ]),
);
const requestCounts = Object.fromEntries(
  openStates.map((state) => [
    state,
    (requests.data ?? []).filter((item) => item.state === state).length,
  ]),
);
const historicalSelfApprovals = (selfApprovals.data ?? []).filter(
  (event) =>
    event.actor_user_id &&
    event.member_user_id &&
    event.actor_user_id === event.member_user_id,
).length;
const findings = [];
if (historicalSelfApprovals > 0)
  findings.push("historical_self_approved_memberships_require_review");
if ((communities.count ?? 0) === 0) findings.push("no_active_communities");

const artifact = {
  schemaVersion: 1,
  auditedAt: new Date().toISOString(),
  result:
    findings.length === 0
      ? "COMUN_COMMUNITIES_READY_FOR_CONTROLLED_REHEARSAL"
      : "COMUN_COMMUNITIES_RECONCILIATION_REQUIRED",
  activeCommunities: communities.count ?? 0,
  membershipCounts,
  activeRoles: roles.count ?? 0,
  groupCounts,
  openMembershipRequests: requestCounts,
  historicalSelfApprovals,
  findings,
  findingsCount: findings.length,
  containsPersonalData: false,
  containsUserIds: false,
  containsCommunityIds: false,
  containsSecrets: false,
  writes: {
    database: "none",
    storage: "none",
    auth: "none",
  },
};

await mkdir(artifactDir, { recursive: true });
await writeFile(
  resolve(artifactDir, "comun-communities-readiness.json"),
  `${JSON.stringify(artifact, null, 2)}\n`,
);
await writeFile(
  resolve(artifactDir, "comun-communities-readiness.md"),
  `# Prontidão das comunidades\n\n- Resultado: \`${artifact.result}\`\n- Comunidades ativas: **${artifact.activeCommunities}**\n- Solicitações abertas: **${Object.values(requestCounts).reduce((total, value) => total + value, 0)}**\n- Membros ativos: **${membershipCounts.member}**\n- Papéis ativos: **${artifact.activeRoles}**\n- Grupos ativos: **${groupCounts.active}**\n- Autoaprovações históricas: **${historicalSelfApprovals}**\n- Findings: **${findings.length}**\n\nAuditoria exclusivamente read-only e sanitizada.\n`,
);
console.log(JSON.stringify(artifact));
