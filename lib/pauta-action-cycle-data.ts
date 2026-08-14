import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/server";

function service() {
  return createServiceSupabaseClient() as any;
}

export async function getAdminPautaActionCycle(pautaId: string) {
  const db = service();
  if (!db) return null;
  const { data: cycle } = await db
    .from("comun_pauta_action_cycles")
    .select(
      "id,pauta_id,current_stage,decision_id,collective_action_id,forwarding_id,official_protocol_id,result_id,next_action_public,blocking_reason_public,responsible_role,public_visible,cycle_scope,rehearsal_cycle_id,state_version,last_transition_at,memory_published_at,created_at,updated_at",
    )
    .eq("pauta_id", pautaId)
    .maybeSingle();
  if (!cycle) return null;
  const protocolIds = (
    (
      await db
        .from("comun_pauta_evidence_items")
        .select("source_id")
        .eq("pauta_id", pautaId)
        .eq("source_type", "official_protocol")
        .not("source_id", "is", null)
    ).data ?? []
  ).map((row: any) => row.source_id);

  const [
    eventsResult,
    decisionsResult,
    circlesResult,
    actionsResult,
    forwardingsResult,
    protocolsResult,
    resultsResult,
  ] = await Promise.all([
    db
      .from("comun_pauta_action_cycle_events")
      .select(
        "id,from_stage,to_stage,actor_role,public_summary,public_visible,state_version,occurred_at",
      )
      .eq("cycle_id", cycle.id)
      .order("occurred_at", { ascending: true }),
    db
      .from("comun_pauta_decisions")
      .select(
        "id,synthesis_version_id,circle_id,public_title,public_summary,public_justification,status,decided_at,published_at,version,created_at",
      )
      .eq("pauta_id", pautaId)
      .order("created_at", { ascending: false }),
    db
      .from("comun_construction_circles")
      .select("id,title,status")
      .eq("pauta_id", pautaId)
      .order("created_at", { ascending: false }),
    db
      .from("comun_collective_actions")
      .select("id,title,slug,status,visibility")
      .eq("pauta_id", pautaId)
      .order("created_at", { ascending: false }),
    db
      .from("comun_collective_action_forwardings")
      .select("id,action_id,recipient_name,state,public_visible")
      .order("updated_at", { ascending: false }),
    protocolIds.length
      ? db
          .from("comun_official_protocols")
          .select(
            "id,comun_protocol,official_protocol_number,status,submitted_at,response_received_at,public_summary",
          )
          .in("id", protocolIds)
      : Promise.resolve({ data: [] }),
    db
      .from("comun_hub_results")
      .select(
        "id,title,result_type,verification_status,visibility,evidence_summary_public",
      )
      .eq("pauta_id", pautaId)
      .order("occurred_at", { ascending: false }),
  ]);

  return {
    ...cycle,
    events: eventsResult.data ?? [],
    decisions: decisionsResult.data ?? [],
    circles: circlesResult.data ?? [],
    actions: actionsResult.data ?? [],
    forwardings: (forwardingsResult.data ?? []).filter((forwarding: any) =>
      (actionsResult.data ?? []).some(
        (action: any) => action.id === forwarding.action_id,
      ),
    ),
    protocols: protocolsResult.data ?? [],
    results: resultsResult.data ?? [],
  };
}

export type PublicPautaActionCycleV1 = {
  currentStage: string;
  nextAction: string | null;
  blockingReason: string | null;
  responsibleRole: string | null;
  lastTransitionAt: string | null;
  memoryPublishedAt: string | null;
  timeline: readonly {
    id: string;
    from_stage: string | null;
    to_stage: string;
    public_summary: string;
    state_version: number;
    occurred_at: string;
  }[];
  decision: {
    public_title: string;
    public_summary: string;
    public_justification: string | null;
    decided_at: string | null;
    published_at: string | null;
  } | null;
  action: {
    slug: string;
    title: string;
    summary: string;
    status: string;
  } | null;
  protocol: {
    comun_protocol: string;
    official_protocol_number: string | null;
    status: string;
    expected_response_at: string | null;
    public_summary: string | null;
    response_received_at: string | null;
  } | null;
  result: {
    title: string;
    result_type: string;
    public_summary: string;
    verification_status: string;
    occurred_at: string | null;
    evidence_summary_public: string | null;
  } | null;
};

export async function getPublicPautaActionCycle(
  pautaId: string,
): Promise<PublicPautaActionCycleV1 | null> {
  const db = service();
  if (!db) return null;
  const { data: cycle } = await db
    .from("comun_pauta_action_cycles")
    .select(
      "id,current_stage,next_action_public,blocking_reason_public,responsible_role,last_transition_at,memory_published_at,decision_id,collective_action_id,official_protocol_id,result_id",
    )
    .eq("pauta_id", pautaId)
    .eq("public_visible", true)
    .eq("cycle_scope", "production")
    .maybeSingle();
  if (!cycle) return null;

  const [
    eventsResult,
    decisionResult,
    actionResult,
    protocolResult,
    resultResult,
  ] = await Promise.all([
    db
      .from("comun_pauta_action_cycle_events")
      .select("id,from_stage,to_stage,public_summary,state_version,occurred_at")
      .eq("cycle_id", cycle.id)
      .eq("public_visible", true)
      .is("private_note", null)
      .order("occurred_at", { ascending: true }),
    cycle.decision_id
      ? db
          .from("comun_pauta_decisions")
          .select(
            "public_title,public_summary,public_justification,decided_at,published_at",
          )
          .eq("id", cycle.decision_id)
          .eq("status", "published")
          .maybeSingle()
      : Promise.resolve({ data: null }),
    cycle.collective_action_id
      ? db
          .from("comun_collective_actions")
          .select("slug,title,summary,status")
          .eq("id", cycle.collective_action_id)
          .eq("visibility", "public")
          .maybeSingle()
      : Promise.resolve({ data: null }),
    cycle.official_protocol_id
      ? db
          .from("comun_official_protocols")
          .select(
            "comun_protocol,official_protocol_number,status,expected_response_at,public_summary,response_received_at",
          )
          .eq("id", cycle.official_protocol_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    cycle.result_id
      ? db
          .from("comun_hub_results")
          .select(
            "title,result_type,public_summary,verification_status,occurred_at,evidence_summary_public",
          )
          .eq("id", cycle.result_id)
          .eq("visibility", "public")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    currentStage: cycle.current_stage,
    nextAction: cycle.next_action_public,
    blockingReason: cycle.blocking_reason_public,
    responsibleRole: cycle.responsible_role,
    lastTransitionAt: cycle.last_transition_at,
    memoryPublishedAt: cycle.memory_published_at,
    timeline: eventsResult.data ?? [],
    decision: decisionResult.data ?? null,
    action: actionResult.data ?? null,
    protocol: protocolResult.data ?? null,
    result: resultResult.data ?? null,
  };
}
