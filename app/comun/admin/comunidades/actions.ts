"use server";

import { revalidatePath } from "next/cache";
import {
  COMMUNITY_MEMBERSHIP_REVIEW_GATE,
  communityRoles,
  isCommunityMembershipReviewReplay,
  isOpenCommunityMembershipOperation,
  validateCommunityGroupMember,
  validateCommunityMembershipReview,
  validateCommunityPautaContext,
  validateCommunityRoleMutation,
  type CommunityMembershipDecision,
} from "@/lib/community-administration";
import { upsertMemberInbox } from "@/lib/community-inbox";
import { requireComunAdmin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const openOperationStates = [
  "pending",
  "assigned",
  "in_review",
  "blocked",
  "ready",
];

function requiredId(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(value)) throw new Error(`${name} inválido.`);
  return value;
}

function safeText(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? "")
    .trim()
    .slice(0, max);
}

function revalidateCommunityAdministration(slug?: string) {
  revalidatePath("/comun/admin/comunidades");
  revalidatePath("/comun/admin/organizacao");
  revalidatePath("/comun/minha-participacao");
  revalidatePath("/comun/caixa-de-entrada");
  if (slug) {
    revalidatePath(`/comun/c/${slug}`);
    revalidatePath(`/comun/c/${slug}/participar`);
  }
}

export async function reviewCommunityMembership(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const operationId = requiredId(formData, "operation_id");
  const decision = String(
    formData.get("decision") ?? "",
  ) as CommunityMembershipDecision;
  if (!(["approve", "reject"] as const).includes(decision))
    throw new Error("Decisão inválida.");
  const note = safeText(formData, "review_note", 800);

  const operation = await db
    .from("comun_editorial_operation_items")
    .select("id,source_id,state,human_gate")
    .eq("id", operationId)
    .eq("human_gate", COMMUNITY_MEMBERSHIP_REVIEW_GATE)
    .maybeSingle();
  if (operation.error || !operation.data?.source_id)
    throw new Error("Solicitação não encontrada.");
  const membership = await db
    .from("comun_community_memberships")
    .select(
      "id,state,joined_at,member_user_id,community_id,community:comun_communities!inner(slug,name)",
    )
    .eq("id", operation.data.source_id)
    .maybeSingle();
  if (membership.error || !membership.data)
    throw new Error("Vínculo não encontrado.");

  if (session.user.id === membership.data.member_user_id)
    throw new Error("A pessoa solicitante não pode aprovar a própria entrada.");
  if (!isOpenCommunityMembershipOperation(operation.data.state)) {
    const replayEvent = await db
      .from("comun_editorial_operation_events")
      .select("id")
      .eq("item_id", operationId)
      .eq(
        "event_type",
        decision === "approve"
          ? "community_membership_approved"
          : "community_membership_rejected",
      )
      .limit(1)
      .maybeSingle();
    if (
      isCommunityMembershipReviewReplay({
        operationState: operation.data.state,
        matchingDecisionEventExists: Boolean(replayEvent.data),
      })
    ) {
      revalidateCommunityAdministration();
      return;
    }
  }
  const validation = validateCommunityMembershipReview({
    operationState: operation.data.state,
    membershipState: membership.data.state,
    decision,
    actorUserId: session.user.id,
    memberUserId: membership.data.member_user_id,
  });
  if (!validation.ok)
    throw new Error(`Decisão recusada: ${validation.reason}.`);

  const community = Array.isArray((membership.data as any).community)
    ? (membership.data as any).community[0]
    : (membership.data as any).community;
  const now = new Date().toISOString();
  const nextState = decision === "approve" ? "member" : "following";
  const updatedMembership = await db
    .from("comun_community_memberships")
    .update({
      state: nextState,
      joined_at:
        decision === "approve" ? (membership.data.joined_at ?? now) : null,
      paused_at: null,
      left_at: null,
      updated_at: now,
    })
    .eq("id", membership.data.id)
    .eq("state", membership.data.state)
    .select("id,state")
    .maybeSingle();
  if (updatedMembership.error || !updatedMembership.data)
    throw new Error("O vínculo mudou durante a revisão. Reabra a fila.");

  const resolved = await db
    .from("comun_editorial_operation_items")
    .update({
      state: "resolved",
      next_action:
        decision === "approve"
          ? "Entrada como membro aprovada."
          : "Solicitação encerrada sem entrada como membro.",
      updated_at: now,
    })
    .eq("id", operationId)
    .in("state", openOperationStates)
    .select("id")
    .maybeSingle();
  if (resolved.error || !resolved.data)
    throw new Error("A solicitação mudou durante a revisão.");

  await Promise.all([
    db.from("comun_editorial_operation_events").insert({
      item_id: operationId,
      actor_profile_id: session.profile?.id ?? null,
      event_type:
        decision === "approve"
          ? "community_membership_approved"
          : "community_membership_rejected",
      payload: { review_note: note || null },
    }),
    db.from("comun_community_audit_log").insert({
      community_id: membership.data.community_id,
      member_user_id: membership.data.member_user_id,
      actor_user_id: session.user.id,
      event_type:
        decision === "approve" ? "membership_approved" : "preferences_changed",
      prior_state: membership.data.state,
      next_state: nextState,
      metadata: {
        source: "community_admin_review",
        decision,
        operation_id: operationId,
        review_note: note || null,
      },
    }),
    upsertMemberInbox({
      memberUserId: membership.data.member_user_id,
      type:
        decision === "approve"
          ? "community_membership_approved"
          : "contribution_update",
      title:
        decision === "approve"
          ? `Entrada aprovada em ${community.name}`
          : `Solicitação encerrada em ${community.name}`,
      summary:
        decision === "approve"
          ? "Agora você é membro da comunidade. Papéis operacionais continuam separados e só aparecem quando concedidos."
          : "Você continua podendo acompanhar a comunidade e solicitar entrada novamente em outro momento.",
      actionLabel: "Abrir comunidade",
      actionUrl: `/comun/c/${community.slug}`,
      priority: decision === "approve" ? "attention" : "normal",
      dedupeKey: `community-membership-review:${operationId}`,
    }),
  ]);
  revalidateCommunityAdministration(community.slug);
}

export async function grantCommunityRole(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const membershipId = requiredId(formData, "membership_id");
  const role = String(formData.get("role") ?? "");
  if (!communityRoles.includes(role as any)) throw new Error("Papel inválido.");
  const scope = safeText(formData, "scope", 120) || "community";
  const reviewAt = safeText(formData, "review_at", 40) || null;
  const membership = await db
    .from("comun_community_memberships")
    .select(
      "id,state,member_user_id,community_id,community:comun_communities!inner(slug,name)",
    )
    .eq("id", membershipId)
    .maybeSingle();
  if (membership.error || !membership.data)
    throw new Error("Membro não encontrado.");
  const validation = validateCommunityRoleMutation({
    membershipState: membership.data.state,
    role,
  });
  if (!validation.ok) throw new Error(`Papel recusado: ${validation.reason}.`);
  const existing = await db
    .from("comun_community_role_assignments")
    .select("id,revoked_at")
    .eq("membership_id", membershipId)
    .eq("role", role)
    .eq("scope", scope)
    .maybeSingle();
  const row = {
    membership_id: membershipId,
    role,
    scope,
    granted_by: session.user.id,
    starts_at: new Date().toISOString(),
    review_at: reviewAt,
    revoked_at: null,
  };
  const changed = existing.data
    ? await db
        .from("comun_community_role_assignments")
        .update(row)
        .eq("id", existing.data.id)
        .select("id")
        .single()
    : await db
        .from("comun_community_role_assignments")
        .insert(row)
        .select("id")
        .single();
  if (changed.error) throw new Error("Não foi possível conceder o papel.");
  const community = Array.isArray((membership.data as any).community)
    ? (membership.data as any).community[0]
    : (membership.data as any).community;
  await Promise.all([
    db.from("comun_community_audit_log").insert({
      community_id: membership.data.community_id,
      member_user_id: membership.data.member_user_id,
      actor_user_id: session.user.id,
      event_type: "role_granted",
      prior_state: null,
      next_state: role,
      metadata: { scope, assignment_id: changed.data?.id },
    }),
    upsertMemberInbox({
      memberUserId: membership.data.member_user_id,
      type: "contribution_update",
      title: `Novo papel em ${community.name}`,
      summary: `O papel ${role} foi concedido no escopo ${scope}. Papéis podem ser revisados ou revogados.`,
      actionLabel: "Abrir comunidade",
      actionUrl: `/comun/c/${community.slug}`,
      priority: "attention",
      dedupeKey: `community-role:${changed.data?.id}:granted`,
    }),
  ]);
  revalidateCommunityAdministration(community.slug);
}

export async function revokeCommunityRole(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const assignmentId = requiredId(formData, "assignment_id");
  const assignment = await db
    .from("comun_community_role_assignments")
    .select(
      "id,role,scope,revoked_at,membership:comun_community_memberships!inner(member_user_id,community_id,community:comun_communities!inner(slug,name))",
    )
    .eq("id", assignmentId)
    .maybeSingle();
  if (assignment.error || !assignment.data || assignment.data.revoked_at)
    throw new Error("Papel ativo não encontrado.");
  const membership = Array.isArray((assignment.data as any).membership)
    ? (assignment.data as any).membership[0]
    : (assignment.data as any).membership;
  const community = Array.isArray(membership.community)
    ? membership.community[0]
    : membership.community;
  const revoked = await db
    .from("comun_community_role_assignments")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (revoked.error || !revoked.data)
    throw new Error("O papel mudou durante a operação.");
  await Promise.all([
    db.from("comun_community_audit_log").insert({
      community_id: membership.community_id,
      member_user_id: membership.member_user_id,
      actor_user_id: session.user.id,
      event_type: "role_revoked",
      prior_state: assignment.data.role,
      next_state: null,
      metadata: { scope: assignment.data.scope, assignment_id: assignmentId },
    }),
    upsertMemberInbox({
      memberUserId: membership.member_user_id,
      type: "contribution_update",
      title: `Papel encerrado em ${community.name}`,
      summary: `O papel ${assignment.data.role} no escopo ${assignment.data.scope} foi encerrado. O vínculo como membro permanece.`,
      actionLabel: "Abrir comunidade",
      actionUrl: `/comun/c/${community.slug}`,
      dedupeKey: `community-role:${assignmentId}:revoked`,
    }),
  ]);
  revalidateCommunityAdministration(community.slug);
}

export async function createCommunityWorkGroup(formData: FormData) {
  await requireComunAdmin({ roles: ["admin", "editor"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const communityId = requiredId(formData, "community_id");
  const pautaId = requiredId(formData, "pauta_id");
  const [community, pauta] = await Promise.all([
    db
      .from("comun_communities")
      .select("id,slug")
      .eq("id", communityId)
      .maybeSingle(),
    db
      .from("comun_pauta_spaces")
      .select("id,community")
      .eq("id", pautaId)
      .maybeSingle(),
  ]);
  if (community.error || !community.data || pauta.error || !pauta.data)
    throw new Error("Comunidade ou pauta não encontrada.");
  const context = validateCommunityPautaContext({
    communitySlug: community.data.slug,
    pautaCommunitySlug: pauta.data.community,
  });
  if (!context.ok)
    throw new Error("A pauta precisa pertencer à comunidade escolhida.");
  const created = await db
    .from("comun_community_work_groups")
    .insert({
      community_id: communityId,
      pauta_id: pautaId,
      name: safeText(formData, "name", 160),
      objective: safeText(formData, "objective", 1200),
      cycle_label: safeText(formData, "cycle_label", 120),
      next_action: safeText(formData, "next_action", 500) || null,
      result_expected: safeText(formData, "result_expected", 800),
      state: String(formData.get("state") ?? "proposed"),
      starts_at: safeText(formData, "starts_at", 40) || null,
      ends_at: safeText(formData, "ends_at", 40) || null,
    })
    .select("id")
    .single();
  if (created.error) throw new Error("Não foi possível criar o grupo.");
  revalidateCommunityAdministration();
}

export async function changeCommunityWorkGroupMember(formData: FormData) {
  const session = await requireComunAdmin({ roles: ["admin", "editor"] });
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const groupId = requiredId(formData, "group_id");
  const membershipId = requiredId(formData, "membership_id");
  const intent = String(formData.get("intent") ?? "join");
  if (!(["join", "leave"] as const).includes(intent as any))
    throw new Error("Ação de grupo inválida.");
  const [group, membership] = await Promise.all([
    db
      .from("comun_community_work_groups")
      .select(
        "id,name,community_id,community:comun_communities!inner(slug,name)",
      )
      .eq("id", groupId)
      .maybeSingle(),
    db
      .from("comun_community_memberships")
      .select("id,state,member_user_id,community_id")
      .eq("id", membershipId)
      .maybeSingle(),
  ]);
  if (group.error || !group.data || membership.error || !membership.data)
    throw new Error("Grupo ou membro não encontrado.");
  const validation = validateCommunityGroupMember({
    membershipState: membership.data.state,
    membershipCommunityId: membership.data.community_id,
    groupCommunityId: group.data.community_id,
  });
  if (!validation.ok) throw new Error(`Grupo recusado: ${validation.reason}.`);
  const responsibility =
    safeText(formData, "responsibility", 300) || "Colaboração geral";
  if (intent === "join") {
    const changed = await db.from("comun_community_work_group_members").upsert(
      {
        group_id: groupId,
        membership_id: membershipId,
        responsibility,
        joined_at: new Date().toISOString(),
        left_at: null,
      },
      { onConflict: "group_id,membership_id" },
    );
    if (changed.error) throw new Error("Não foi possível incluir o membro.");
  } else {
    const changed = await db
      .from("comun_community_work_group_members")
      .update({ left_at: new Date().toISOString() })
      .eq("group_id", groupId)
      .eq("membership_id", membershipId)
      .is("left_at", null);
    if (changed.error) throw new Error("Não foi possível retirar o membro.");
  }
  const community = Array.isArray((group.data as any).community)
    ? (group.data as any).community[0]
    : (group.data as any).community;
  await Promise.all([
    db.from("comun_community_audit_log").insert({
      community_id: group.data.community_id,
      member_user_id: membership.data.member_user_id,
      actor_user_id: session.user.id,
      event_type: intent === "join" ? "group_joined" : "group_left",
      prior_state: intent === "join" ? null : groupId,
      next_state: intent === "join" ? groupId : null,
      metadata: { group_id: groupId, responsibility },
    }),
    upsertMemberInbox({
      memberUserId: membership.data.member_user_id,
      type:
        intent === "join" ? "community_task_assigned" : "contribution_update",
      title:
        intent === "join"
          ? `Você entrou no grupo ${group.data.name}`
          : `Participação encerrada no grupo ${group.data.name}`,
      summary:
        intent === "join"
          ? `Responsabilidade inicial: ${responsibility}.`
          : "O vínculo como membro da comunidade permanece.",
      actionLabel: "Abrir comunidade",
      actionUrl: `/comun/c/${community.slug}`,
      priority: intent === "join" ? "attention" : "normal",
      dedupeKey: `community-group:${groupId}:${membershipId}:${intent}`,
    }),
  ]);
  revalidateCommunityAdministration(community.slug);
}
