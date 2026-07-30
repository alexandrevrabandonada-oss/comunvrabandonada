import {
  pautaAppTemplates,
  pautaModuleRegistry,
  type PautaModuleType,
  validatePautaModuleConfig,
} from "@/lib/comun/pauta-module-registry";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { projectSidewalkOperationalState } from "@/lib/sidewalk-operational-loop";

export type PublicPautaModule = {
  id: string;
  pauta_id: string;
  module_type: PautaModuleType;
  title_override: string | null;
  public_description: string | null;
  position: number;
  config: unknown;
};

export async function listPublicPautaModules(pautaId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as PublicPautaModule[];
  const { data, error } = await supabase
    .from("comun_pauta_modules" as never)
    .select(
      "id, pauta_id, module_type, title_override, public_description, position, config" as never,
    )
    .eq("pauta_id" as never, pautaId)
    .eq("status" as never, "active")
    .eq("visibility" as never, "public")
    .order("position" as never, { ascending: true });
  if (error || !data) return [];
  return (data as unknown as PublicPautaModule[]).filter(
    (module) => module.module_type in pautaModuleRegistry,
  );
}

export async function listAdminPautaModules(pautaId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    return [] as Array<
      PublicPautaModule & { status: string; visibility: string }
    >;
  const { data, error } = await supabase
    .from("comun_pauta_modules" as never)
    .select(
      "id, pauta_id, module_type, title_override, public_description, position, status, visibility, config" as never,
    )
    .eq("pauta_id" as never, pautaId)
    .order("position" as never, { ascending: true });
  return error || !data
    ? []
    : (data as unknown as Array<
        PublicPautaModule & { status: string; visibility: string }
      >);
}

export function getTemplatePreview(template: keyof typeof pautaAppTemplates) {
  return pautaAppTemplates[template].map((type, position) => ({
    type,
    position,
    title: pautaModuleRegistry[type].defaultTitle,
    description: pautaModuleRegistry[type].description,
  }));
}

export async function applyPautaAppTemplate(
  pautaId: string,
  template: keyof typeof pautaAppTemplates,
  createdBy: string,
) {
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const modules = pautaAppTemplates[template];
  const { data: existing, error: readError } = await supabase
    .from("comun_pauta_modules" as never)
    .select("module_type" as never)
    .eq("pauta_id" as never, pautaId);
  if (readError) throw new Error(readError.message);
  const current = new Set((existing ?? []).map((row: any) => row.module_type));
  const rows = modules
    .filter((type) => !current.has(type))
    .map((moduleType, position) => ({
      pauta_id: pautaId,
      module_type: moduleType,
      position: position + current.size,
      status: "draft",
      visibility: "private",
      config: {},
      created_by: createdBy,
    }));
  if (!rows.length) return { created: 0, skipped: modules.length };
  const { error } = await supabase
    .from("comun_pauta_modules" as never)
    .insert(rows as never);
  if (error) throw new Error(error.message);
  return { created: rows.length, skipped: modules.length - rows.length };
}

export async function upsertPautaModule(input: {
  pautaId: string;
  moduleType: PautaModuleType;
  title: string;
  description: string;
  position: number;
  status: string;
  visibility: string;
  configText: string;
  createdBy: string;
}) {
  const config = JSON.parse(input.configText || "{}");
  const validation = validatePautaModuleConfig(input.moduleType, config);
  if (!validation.success)
    throw new Error("Configuração inválida para este módulo.");
  if (input.position < 0) throw new Error("A posição deve ser positiva.");
  if (input.moduleType.endsWith("_future") && input.visibility === "public")
    throw new Error("Módulos futuros permanecem internos nesta sprint.");
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    throw new Error("Supabase service role nao configurado no servidor.");
  const { error } = await supabase.from("comun_pauta_modules" as never).upsert(
    {
      pauta_id: input.pautaId,
      module_type: input.moduleType,
      title_override: input.title || null,
      public_description: input.description || null,
      position: input.position,
      status: input.status,
      visibility: input.visibility,
      config: validation.data,
      created_by: input.createdBy,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "pauta_id,module_type" as never },
  );
  if (error) throw new Error(error.message);
}

export async function listPublicCircleSurface(pautaId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as any[];
  const { data } = await supabase
    .from("comun_construction_circles" as never)
    .select(
      "id, title, public_question, public_context, status, current_round_id, comun_construction_circle_rounds!comun_construction_circle_rounds_circle_id_fkey(id, title, public_prompt, status, position), comun_circle_syntheses(id, public_summary, agreements, disagreements, open_questions, proposed_next_steps, status, published_at)" as never,
    )
    .eq("pauta_id" as never, pautaId)
    .in("status" as never, [
      "open",
      "synthesizing",
      "decision",
      "action",
      "completed",
    ]);
  return (data ?? []) as any[];
}

export async function listMyParticipation(userId: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase)
    return {
      memberships: [],
      contributions: [],
      artworkSubmissions: [],
      radioContributions: [],
    };
  const [
    memberships,
    contributions,
    artworkSubmissions,
    radioContributions,
    sidewalkRecords,
  ] = await Promise.all([
    supabase
      .from("comun_pauta_memberships" as never)
      .select(
        "id, role, status, joined_at, pauta:comun_pauta_spaces(title, slug)" as never,
      )
      .eq("member_user_id" as never, userId),
    supabase
      .from("comun_circle_contributions" as never)
      .select(
        "id, contribution_type, status, public_protocol, created_at, circle:comun_construction_circles(title)" as never,
      )
      .eq("author_member_id" as never, userId),
    supabase
      .from("comun_archive_artwork_submissions" as never)
      .select(
        "id,title_suggestion,status,public_protocol,created_at,information_request_public,next_action_public,archive_item:comun_archive_items(slug,status)" as never,
      )
      .eq("member_user_id" as never, userId)
      .order("created_at" as never, { ascending: false }),
    supabase
      .from("comun_radio_contributions" as never)
      .select(
        "id,title_suggestion,contribution_type,status,public_protocol,created_at,information_request_public,next_action_public" as never,
      )
      .eq("member_user_id" as never, userId)
      .order("created_at" as never, { ascending: false }),
    supabase
      .from("comun_sidewalk_records" as never)
      .select(
        "id,slug,status,visibility,verification_status,forwarding_status,created_at,updated_at,last_observed_at,approximate_location,public_summary,pauta:comun_pauta_spaces(title,slug)" as never,
      )
      .eq("member_user_id" as never, userId)
      .order("created_at" as never, { ascending: false }),
  ]);

  const sidewalkRows = (sidewalkRecords.data ?? []) as any[];
  const recordIds = sidewalkRows.map((item: any) => item.id);
  const { data: priorities } = recordIds.length
    ? await supabase
        .from("comun_sidewalk_priorities" as never)
        .select("id,record_id" as never)
        .in("record_id" as never, recordIds)
        .eq("status" as never, "approved")
    : { data: [] };
  const priorityIds = ((priorities ?? []) as any[]).map((item: any) => item.id);
  const { data: forwardings } = priorityIds.length
    ? await supabase
        .from("comun_sidewalk_forwardings" as never)
        .select("priority_id,state,title_public,updated_at" as never)
        .in("priority_id" as never, priorityIds)
        .neq("state" as never, "archived")
    : { data: [] };
  const priorityByRecord = new Map(
    ((priorities ?? []) as any[]).map((item: any) => [item.record_id, item.id]),
  );
  const forwardingByPriority = new Map(
    ((forwardings ?? []) as any[]).map((item: any) => [item.priority_id, item]),
  );
  const sidewalk = sidewalkRows.map((item: any) => {
    const flow: any = forwardingByPriority.get(priorityByRecord.get(item.id));
    const operational = projectSidewalkOperationalState({
      ...item,
      forwarding_state: flow?.state,
      updated_at: flow?.updated_at ?? item.updated_at,
    });
    const published =
      item.status === "published" && item.visibility === "public" && item.slug;
    return {
      ...item,
      title_suggestion:
        item.approximate_location &&
        item.approximate_location !== "Localização protegida"
          ? item.approximate_location
          : (item.pauta?.title ?? "Registro de calçada"),
      status: operational.state,
      next_action_public: operational.nextAction,
      last_changed_at: operational.lastChangedAt,
      action_url: published
        ? `/comun/calcadas/registros/${item.slug}`
        : `/comun/mapa/contribuir/confirmacao?registro=${item.id}&returnTo=${encodeURIComponent("/comun/minha-participacao?secao=contribuicoes")}`,
    };
  });

  return {
    memberships: (memberships.data ?? []) as any[],
    contributions: [...(contributions.data ?? []), ...sidewalk] as any[],
    artworkSubmissions: (artworkSubmissions.data ?? []) as any[],
    radioContributions: (radioContributions.data ?? []) as any[],
  };
}
