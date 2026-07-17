import type { SupabaseClient } from "@supabase/supabase-js";

export async function createSidewalkCycleMemory(
  db: SupabaseClient,
  input: {
    pautaId: string;
    slug: string;
    title: string;
    publicSummary: string;
    recordId?: string | null;
    snapshotId?: string | null;
    circleId?: string | null;
    synthesisId?: string | null;
    actionId?: string | null;
    protocolId?: string | null;
    resultId?: string | null;
    artworkItemId?: string | null;
    radioEpisodeItemId?: string | null;
    methodologySnapshot?: string;
  }
) {
  const { data, error } = await db.from("comun_sidewalk_cycle_memories" as never).insert({
    pauta_id: input.pautaId,
    record_id: input.recordId ?? null,
    slug: input.slug,
    title: input.title,
    public_summary: input.publicSummary,
    methodology_snapshot: input.methodologySnapshot ?? null,
    snapshot_id: input.snapshotId ?? null,
    circle_id: input.circleId ?? null,
    synthesis_id: input.synthesisId ?? null,
    action_id: input.actionId ?? null,
    protocol_id: input.protocolId ?? null,
    result_id: input.resultId ?? null,
    artwork_item_id: input.artworkItemId ?? null,
    radio_episode_item_id: input.radioEpisodeItemId ?? null,
    status: "published",
    visibility: "public",
    published_at: new Date().toISOString(),
  } as never).select("id").single();
  if (error) throw error;
  return { memoryId: (data as any).id };
}
